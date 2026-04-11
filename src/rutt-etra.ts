import * as THREE from "three";
import vertexShader from "./shaders/rutt-etra.vert.glsl";
import fragmentShader from "./shaders/rutt-etra.frag.glsl";
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
 * Apply a blend mode to the shader material.
 *
 * - "solid":    NormalBlending + depthWrite. Each ribbon occludes the ribbons
 *               behind it. Side views look like solid 3D lines instead of
 *               washing to white from additive overdraw. This is the physically
 *               honest mode and the default.
 * - "additive": AdditiveBlending + no depth write. Every visible fragment sums
 *               into the framebuffer for a glowy stacked look. Bright pixels
 *               clip per-channel, so side views desaturate toward white.
 */
function applyBlendMode(material: THREE.ShaderMaterial, mode: BlendMode): void {
  if (mode === "additive") {
    material.blending = THREE.AdditiveBlending;
    material.depthWrite = false;
  } else {
    material.blending = THREE.NormalBlending;
    material.depthWrite = true;
  }
  material.needsUpdate = true;
}

export class RuttEtra {
  private _mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private videoTexture: THREE.VideoTexture;
  private params: RuttEtraParams;
  private videoAspect: number;

  constructor(videoElement: HTMLVideoElement, params?: Partial<RuttEtraParams>) {
    this.params = { ...DEFAULT_PARAMS, ...params };

    // Video texture — stays on GPU
    this.videoTexture = new THREE.VideoTexture(videoElement);
    this.videoTexture.minFilter = THREE.NearestFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.generateMipmaps = false;
    this.videoTexture.format = THREE.RGBAFormat;
    // Mark as sRGB so three.js converts to linear at sample time. Required for
    // the HDR composer + ACES tone mapping pipeline to be color-correct —
    // otherwise we'd be tone-mapping sRGB-encoded numbers as if they were linear.
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;

    this.videoAspect =
      (videoElement.videoWidth || 16) / (videoElement.videoHeight || 9);

    const tintColor = new THREE.Color(this.params.tintColor);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uVideoTexture: { value: this.videoTexture },
        uDisplacement: { value: this.params.displacement },
        uChannelWeights: { value: new THREE.Vector3(this.params.weightR, this.params.weightG, this.params.weightB) },
        uLineCount: { value: this.params.lineCount },
        uLineWidth: { value: this.params.lineWidth },
        uOpacity: { value: this.params.opacity },
        uTintColor: { value: tintColor },
        uColorMix: { value: this.params.colorMix },
        uGlow: { value: this.params.glow },
        uTime: { value: 0 },
        uWarpMode: { value: warpModeToInt(this.params.warpMode) },
        uWarpAmount: { value: this.params.warpAmount },
        uTwistY: { value: this.params.twistY },
        uTwistRadial: { value: this.params.twistRadial },
        uSineXFreq: { value: this.params.sineXFreq },
        uSineYFreq: { value: this.params.sineYFreq },
        uSineAmp: { value: this.params.sineAmp },
        uSineSpeed: { value: this.params.sineSpeed },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
    applyBlendMode(this.material, this.params.blendMode);

    const geometry = this.createGeometry();
    this._mesh = new THREE.Mesh(geometry, this.material);
  }

  get mesh(): THREE.Mesh {
    return this._mesh;
  }

  private createGeometry(): THREE.PlaneGeometry {
    const res = this.params.resolution;
    const width = this.videoAspect;
    const height = 1;
    return new THREE.PlaneGeometry(width, height, res, res);
  }

  setParameter<K extends keyof RuttEtraParams>(
    name: K,
    value: RuttEtraParams[K]
  ): void {
    this.params[name] = value;

    switch (name) {
      case "displacement":
        this.material.uniforms.uDisplacement.value = value;
        break;
      case "lineCount":
        this.material.uniforms.uLineCount.value = value;
        break;
      case "lineWidth":
        this.material.uniforms.uLineWidth.value = value;
        break;
      case "blendMode":
        applyBlendMode(this.material, value as BlendMode);
        break;
      case "opacity":
        this.material.uniforms.uOpacity.value = value;
        break;
      case "colorMix":
        this.material.uniforms.uColorMix.value = value;
        break;
      case "tintColor":
        (this.material.uniforms.uTintColor.value as THREE.Color).set(
          value as string
        );
        break;
      case "glow":
        this.material.uniforms.uGlow.value = value;
        break;
      case "wireframe":
        this.material.wireframe = value as boolean;
        break;
      case "weightR":
        (this.material.uniforms.uChannelWeights.value as THREE.Vector3).x = value as number;
        break;
      case "weightG":
        (this.material.uniforms.uChannelWeights.value as THREE.Vector3).y = value as number;
        break;
      case "weightB":
        (this.material.uniforms.uChannelWeights.value as THREE.Vector3).z = value as number;
        break;
      case "resolution":
        this.rebuildGeometry();
        break;
      case "warpMode":
        this.material.uniforms.uWarpMode.value = warpModeToInt(value as WarpMode);
        break;
      case "warpAmount":
        this.material.uniforms.uWarpAmount.value = value;
        break;
      case "twistY":
        this.material.uniforms.uTwistY.value = value;
        break;
      case "twistRadial":
        this.material.uniforms.uTwistRadial.value = value;
        break;
      case "sineXFreq":
        this.material.uniforms.uSineXFreq.value = value;
        break;
      case "sineYFreq":
        this.material.uniforms.uSineYFreq.value = value;
        break;
      case "sineAmp":
        this.material.uniforms.uSineAmp.value = value;
        break;
      case "sineSpeed":
        this.material.uniforms.uSineSpeed.value = value;
        break;
    }
  }

  private rebuildGeometry(): void {
    const oldGeometry = this._mesh.geometry;
    this._mesh.geometry = this.createGeometry();
    oldGeometry.dispose();
  }

  update(): void {
    // VideoTexture auto-updates from the video element on each render.
    // If the video aspect changed (e.g. stream switch), rebuild geometry.
    const video = this.videoTexture.image as HTMLVideoElement;
    if (video.videoWidth && video.videoHeight) {
      const newAspect = video.videoWidth / video.videoHeight;
      if (Math.abs(newAspect - this.videoAspect) > 0.01) {
        this.videoAspect = newAspect;
        this.rebuildGeometry();
      }
    }
    // Push the wall clock to the shader so animated wave/noise effects advance.
    this.material.uniforms.uTime.value = performance.now() / 1000;
  }

  getParams(): RuttEtraParams {
    return { ...this.params };
  }

  dispose(): void {
    this._mesh.geometry.dispose();
    this.material.dispose();
    this.videoTexture.dispose();
  }
}
