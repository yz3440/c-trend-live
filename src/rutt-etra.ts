import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import vertSnippet from "./shaders/rutt-etra.vert.glsl";
import fragSnippet from "./shaders/rutt-etra.frag.glsl";
import type { BlendMode, RuttEtraParams, WarpMode } from "./types";
import { DEFAULT_PARAMS } from "./types";

function warpModeToInt(mode: WarpMode): number {
  switch (mode) {
    case "polar": return 1;
    case "cylinder": return 2;
    case "sphere": return 3;
    default: return 0;
  }
}

/**
 * Apply a blend mode to the line material.
 *
 * - "solid":    NormalBlending + depthWrite. Each line occludes the lines
 *               behind it. Side views look like a stack of independent 3D
 *               curves instead of washing to white from additive overdraw.
 * - "additive": AdditiveBlending + no depth write. Every visible fragment sums
 *               into the framebuffer for a glowy stacked look (matches the
 *               classic Felix Turner Rutt-Etra-Izer aesthetic).
 */
function applyBlendMode(material: THREE.Material, mode: BlendMode): void {
  if (mode === "additive") {
    material.blending = THREE.AdditiveBlending;
    material.depthWrite = false;
  } else {
    material.blending = THREE.NormalBlending;
    material.depthWrite = true;
  }
  material.needsUpdate = true;
}

// Bag of uniforms we hand to LineMaterial via onBeforeCompile. Stored as a
// closure-shared object so setParameter() can mutate `.value` and the running
// shader picks it up (Object.assign into shader.uniforms shares references).
interface RuttUniforms {
  uVideoTexture: { value: THREE.Texture };
  uDisplacement: { value: number };
  uChannelWeights: { value: THREE.Vector3 };
  uVideoAspect: { value: number };
  uTime: { value: number };
  uWarpMode: { value: number };
  uWarpAmount: { value: number };
  uTwistY: { value: number };
  uTwistRadial: { value: number };
  uSineXFreq: { value: number };
  uSineYFreq: { value: number };
  uSineAmp: { value: number };
  uSineSpeed: { value: number };
  uTintColor: { value: THREE.Color };
  uColorMix: { value: number };
  uGlow: { value: number };
}

export class RuttEtra {
  private _mesh: LineSegments2;
  private material: LineMaterial;
  private geometry: LineSegmentsGeometry;
  private uniforms: RuttUniforms;
  private videoTexture: THREE.VideoTexture;
  private params: RuttEtraParams;
  private videoAspect: number;

  constructor(videoElement: HTMLVideoElement, params?: Partial<RuttEtraParams>) {
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Video texture — stays on GPU. We sample it from the *vertex* shader to
    // displace each line endpoint, so it has to be readable in the vertex stage
    // (universally available on WebGL2 / modern WebGL1).
    this.videoTexture = new THREE.VideoTexture(videoElement);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.generateMipmaps = false;
    this.videoTexture.format = THREE.RGBAFormat;
    // Mark as sRGB so three.js converts to linear at sample time. Required for
    // the HDR composer + ACES tone mapping pipeline to be color-correct.
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;

    this.videoAspect =
      (videoElement.videoWidth || 16) / (videoElement.videoHeight || 9);

    this.uniforms = {
      uVideoTexture: { value: this.videoTexture },
      uDisplacement: { value: this.params.displacement },
      uChannelWeights: {
        value: new THREE.Vector3(
          this.params.weightR,
          this.params.weightG,
          this.params.weightB
        ),
      },
      uVideoAspect: { value: this.videoAspect },
      uTime: { value: 0 },
      uWarpMode: { value: warpModeToInt(this.params.warpMode) },
      uWarpAmount: { value: this.params.warpAmount },
      uTwistY: { value: this.params.twistY },
      uTwistRadial: { value: this.params.twistRadial },
      uSineXFreq: { value: this.params.sineXFreq },
      uSineYFreq: { value: this.params.sineYFreq },
      uSineAmp: { value: this.params.sineAmp },
      uSineSpeed: { value: this.params.sineSpeed },
      uTintColor: { value: new THREE.Color(this.params.tintColor) },
      uColorMix: { value: this.params.colorMix },
      uGlow: { value: this.params.glow },
    };

    this.material = this.createMaterial();
    this.geometry = this.createGeometry();
    this._mesh = new LineSegments2(this.geometry, this.material);
    // LineSegments2 sets its own bounding sphere from the placeholder UV
    // positions, which is wrong once the vertex shader deforms them. We don't
    // need accurate culling — disable frustum culling so the lines never get
    // dropped just because their CPU-side bbox doesn't include the deformation.
    this._mesh.frustumCulled = false;
  }

  // -------------------------------------------------------------------------
  // Material: a stock LineMaterial whose vertex/fragment shaders we patch via
  // onBeforeCompile to (a) replace the instanceStart/End reads with our own
  // ruttEtraDeform() function, and (b) override gl_FragColor to apply our
  // tint/glow color pipeline.
  // -------------------------------------------------------------------------
  private createMaterial(): LineMaterial {
    const mat = new LineMaterial({
      color: 0xffffff,
      linewidth: this.params.lineWidth, // pixels (worldUnits = false)
      transparent: true,
      depthTest: true,
      // Resolution defaults to (1,1); main.ts will set it to the real renderer
      // size on every resize. Without it line widths come out wildly wrong.
    });
    mat.opacity = this.params.opacity;

    const customUniforms = this.uniforms;

    mat.onBeforeCompile = (shader) => {
      // Share our uniform bag with the compiled shader so mutations on
      // RuttUniforms.uXxx.value reach the GPU at the next render.
      Object.assign(shader.uniforms, customUniforms);

      // ---- Vertex shader patches ------------------------------------------
      // 1. Prepend our snippet (uniforms + ruttEtraDeform function) above main()
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        `${vertSnippet}\nvoid main() {`
      );

      // 2. Replace the start/end position reads with deformed positions
      //    derived from the UVs we stashed in instanceStart.xy / instanceEnd.xy.
      //    `position.y < 0.5` is LineMaterial's own start-side test (see
      //    LineMaterial.js: clipStart/clipEnd selection).
      shader.vertexShader = shader.vertexShader.replace(
        "vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );",
        `
        vec3 _ruttColStart;
        float _ruttLumStart;
        vec3 _startPos = ruttEtraDeform(instanceStart.xy, _ruttColStart, _ruttLumStart);
        vec4 start = modelViewMatrix * vec4(_startPos, 1.0);
        `
      );
      shader.vertexShader = shader.vertexShader.replace(
        "vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );",
        `
        vec3 _ruttColEnd;
        float _ruttLumEnd;
        vec3 _endPos = ruttEtraDeform(instanceEnd.xy, _ruttColEnd, _ruttLumEnd);
        vec4 end = modelViewMatrix * vec4(_endPos, 1.0);

        // Choose which endpoint's color/lum to expose to the fragment shader
        // based on which corner we are. The two corners on each side of the
        // segment carry the same value, and the rasterizer linearly interpolates
        // across the line so colors blend smoothly between adjacent samples.
        vRuttColor = (position.y < 0.5) ? _ruttColStart : _ruttColEnd;
        vRuttLum   = (position.y < 0.5) ? _ruttLumStart : _ruttLumEnd;
        `
      );

      // ---- Fragment shader patches ----------------------------------------
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `${fragSnippet}\nvoid main() {`
      );
      // Override LineMaterial's diffuse with our video-color + tint mix. We
      // keep its `alpha` (which holds the AA mask × opacity) untouched.
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4 diffuseColor = vec4( diffuse, alpha );",
        "vec4 diffuseColor = vec4( ruttEtraColor(), alpha );"
      );
    };

    applyBlendMode(mat, this.params.blendMode);
    return mat;
  }

  // -------------------------------------------------------------------------
  // Geometry: L = lineCount rows × S = samplesPerLine vertices per row, emitted
  // as L * (S - 1) line segments. We stash the source UV of each endpoint into
  // the .xy of the position triple — the vertex shader uses that UV to sample
  // the video texture and rebuild the deformed world-space position. CPU does
  // no per-frame work; rebuilds only happen when L, S, or aspect changes.
  // -------------------------------------------------------------------------
  private createGeometry(): LineSegmentsGeometry {
    const L = Math.max(2, Math.floor(this.params.lineCount));
    const S = Math.max(2, Math.floor(this.params.resolution));
    const segmentCount = L * (S - 1);
    const positions = new Float32Array(segmentCount * 6);

    let idx = 0;
    for (let row = 0; row < L; row++) {
      // Center the row inside its slice — gives a symmetric distribution that
      // doesn't pile lines on the top/bottom edge.
      const v = (row + 0.5) / L;
      for (let col = 0; col < S - 1; col++) {
        const uA = col / (S - 1);
        const uB = (col + 1) / (S - 1);
        // Stash UV in xy; z is unused (the vertex shader rebuilds the actual
        // position from the UV via ruttEtraDeform()).
        positions[idx++] = uA;
        positions[idx++] = v;
        positions[idx++] = 0;
        positions[idx++] = uB;
        positions[idx++] = v;
        positions[idx++] = 0;
      }
    }

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(positions);
    return geometry;
  }

  get mesh(): LineSegments2 {
    return this._mesh;
  }

  /**
   * Tell the line material how big the framebuffer is. LineMaterial computes
   * line thickness in screen pixels by dividing by `resolution.y`, so the host
   * (main.ts) needs to call this on init and on every resize.
   */
  setRenderResolution(width: number, height: number): void {
    this.material.resolution.set(width, height);
  }

  setParameter<K extends keyof RuttEtraParams>(
    name: K,
    value: RuttEtraParams[K]
  ): void {
    this.params[name] = value;

    switch (name) {
      case "displacement":
        this.uniforms.uDisplacement.value = value as number;
        break;
      case "lineCount":
        this.rebuildGeometry();
        break;
      case "lineWidth":
        this.material.linewidth = value as number;
        break;
      case "blendMode":
        applyBlendMode(this.material, value as BlendMode);
        break;
      case "opacity":
        this.material.opacity = value as number;
        break;
      case "colorMix":
        this.uniforms.uColorMix.value = value as number;
        break;
      case "tintColor":
        this.uniforms.uTintColor.value.set(value as string);
        break;
      case "glow":
        this.uniforms.uGlow.value = value as number;
        break;
      case "weightR":
        this.uniforms.uChannelWeights.value.x = value as number;
        break;
      case "weightG":
        this.uniforms.uChannelWeights.value.y = value as number;
        break;
      case "weightB":
        this.uniforms.uChannelWeights.value.z = value as number;
        break;
      case "resolution":
        this.rebuildGeometry();
        break;
      case "warpMode":
        this.uniforms.uWarpMode.value = warpModeToInt(value as WarpMode);
        break;
      case "warpAmount":
        this.uniforms.uWarpAmount.value = value as number;
        break;
      case "twistY":
        this.uniforms.uTwistY.value = value as number;
        break;
      case "twistRadial":
        this.uniforms.uTwistRadial.value = value as number;
        break;
      case "sineXFreq":
        this.uniforms.uSineXFreq.value = value as number;
        break;
      case "sineYFreq":
        this.uniforms.uSineYFreq.value = value as number;
        break;
      case "sineAmp":
        this.uniforms.uSineAmp.value = value as number;
        break;
      case "sineSpeed":
        this.uniforms.uSineSpeed.value = value as number;
        break;
    }
  }

  private rebuildGeometry(): void {
    const oldGeometry = this.geometry;
    this.geometry = this.createGeometry();
    this._mesh.geometry = this.geometry;
    oldGeometry.dispose();
  }

  update(): void {
    // VideoTexture auto-updates from the video element on each render.
    // If the video aspect changed (e.g. stream switch), update the uniform —
    // no geometry rebuild needed since the X-scale lives entirely in the shader.
    const video = this.videoTexture.image as HTMLVideoElement;
    if (video.videoWidth && video.videoHeight) {
      const newAspect = video.videoWidth / video.videoHeight;
      if (Math.abs(newAspect - this.videoAspect) > 0.01) {
        this.videoAspect = newAspect;
        this.uniforms.uVideoAspect.value = newAspect;
      }
    }
    // Push the wall clock to the shader so animated wave/noise effects advance.
    this.uniforms.uTime.value = performance.now() / 1000;
  }

  getParams(): RuttEtraParams {
    return { ...this.params };
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.videoTexture.dispose();
  }
}
