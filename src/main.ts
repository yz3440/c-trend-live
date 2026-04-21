import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { effect, signal } from "@preact/signals";
import { h, render } from "preact";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";

import { RuttEtra } from "./rutt-etra";
import { createPlayer, type PlayerHandle } from "./player";
import { createParamsPane } from "./params-pane";
import { App } from "./ui/app";
import { SOURCES, getSource } from "./sources";
import {
  sources,
  activeSrcId,
  selectedCamId,
  selectedCamera,
  setCameras,
  setSourceStatus,
  setThumbnail,
  thumbnails,
  status,
  params,
  stageMode,
  canvasMountEl,
  paramsMountEl,
  videoPreviewMountEl,
  bloomParams,
  toneMappingMode,
  cameraAutoRotate,
  cameraAutoRotateSpeed,
} from "./store";
import { DEFAULT_BLOOM, type RuttEtraParams } from "./types";
import { registerTriggerHandlers } from "./params-dispatch";
import { startEngine as startMidiEngine, setLearning, midiLearning } from "./midi";

// --- Mount Preact app first so the grid cells exist before we try to attach ---
const uiRoot = document.getElementById("ui-root")!;
render(h(App, null), uiRoot);

// --- Three.js scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
camera.position.set(0, 0, 2.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Render in linear space, output sRGB. Tone mapping happens in the composer
// (postprocessing's ToneMappingEffect), so leave the renderer's own toneMapping
// at NoToneMapping to avoid double-mapping.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.saveState();

// --- Postprocess composer (RenderPass + Bloom) -----------------------------
// `postprocessing` (pmndrs/postprocessing) handles the framebuffer pingpong
// for us. We add a RenderPass for the scene and an EffectPass wrapping a
// BloomEffect; the EffectPass is the last pass and renders to the screen.
const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType,
});
composer.addPass(new RenderPass(scene, camera));

const bloomEffect = new BloomEffect({
  intensity: DEFAULT_BLOOM.intensity,
  luminanceThreshold: DEFAULT_BLOOM.threshold,
  luminanceSmoothing: DEFAULT_BLOOM.smoothing,
  mipmapBlur: true,
  radius: DEFAULT_BLOOM.radius,
  levels: 8,
});
const bloomPass = new EffectPass(camera, bloomEffect);
bloomPass.enabled = DEFAULT_BLOOM.enabled;
composer.addPass(bloomPass);

// ACES Filmic tone mapping rolls off oversaturated HDR values gracefully —
// without it, additive-blended scan lines clip per-channel and wash to white
// from the side. Lives in its own EffectPass at the end of the chain so it's
// independent of the Bloom toggle.
const toneMappingEffect = new ToneMappingEffect({
  mode: ToneMappingMode.ACES_FILMIC,
});
const toneMappingPass = new EffectPass(camera, toneMappingEffect);
composer.addPass(toneMappingPass);

// --- Live scene state ---
let currentPlayer: PlayerHandle | null = null;
let ruttEtra: RuttEtra | null = null;
// Signal mirror of currentPlayer so the video-preview-mount effect can react.
const currentPlayerSig = signal<PlayerHandle | null>(null);

// --- Effect: attach the renderer's canvas to the grid cell when it appears ---
effect(() => {
  const host = canvasMountEl.value;
  if (!host) return;
  host.appendChild(renderer.domElement);

  // Resize the renderer to match the cell, both initially and on changes.
  // setSize(w, h) (no third arg) updates BOTH the drawing buffer AND the
  // canvas CSS style — important so the canvas's displayed size matches the
  // host cell rather than its raw buffer pixels (which would overflow on
  // retina because pixelRatio doubles the buffer).
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // LineMaterial computes pixel-thickness by dividing by resolution.y, so it
    // needs the framebuffer (drawing-buffer) size, not CSS size. setSize above
    // already accounts for pixelRatio internally.
    if (ruttEtra) {
      const dpr = renderer.getPixelRatio();
      ruttEtra.setRenderResolution(w * dpr, h * dpr);
    }
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  return () => {
    ro.disconnect();
    if (renderer.domElement.parentElement === host) {
      host.removeChild(renderer.domElement);
    }
  };
});

// --- Effect: mount Tweakpane into the right panel when its host appears ---
effect(() => {
  const host = paramsMountEl.value;
  if (!host) return;
  const pane = createParamsPane(host);
  return () => pane.dispose();
});

// --- Effect: drive bloom / tone mapping / camera from signals --------------
// These used to be mutated directly from Tweakpane change callbacks. Lifting
// them into signals lets MIDI (or any future driver) update these and have
// the Tweakpane sliders track automatically.
effect(() => {
  const b = bloomParams.value;
  bloomPass.enabled = b.enabled;
  bloomEffect.intensity = b.intensity;
  bloomEffect.luminanceMaterial.threshold = b.threshold;
  bloomEffect.luminanceMaterial.smoothing = b.smoothing;
  bloomEffect.mipmapBlurPass.radius = b.radius;
});
effect(() => {
  const mode = toneMappingMode.value;
  toneMappingPass.enabled = mode !== "off";
  if (mode === "aces") toneMappingEffect.mode = ToneMappingMode.ACES_FILMIC;
});
effect(() => {
  controls.autoRotate = cameraAutoRotate.value;
});
effect(() => {
  controls.autoRotateSpeed = cameraAutoRotateSpeed.value;
});

// --- Wire trigger-kind params so buttons (and MIDI) can fire them ----------
registerTriggerHandlers({
  resetCamera: () => controls.reset(),
  toggleStage: () => {
    stageMode.value = !stageMode.value;
  },
  takeScreenshot,
});

// --- Start the MIDI engine (requests permission, subscribes to device) -----
startMidiEngine().catch((err) => {
  console.warn("MIDI engine failed to start:", err);
});

// --- Effect: re-parent the live video preview when its host appears or the player swaps ---
effect(() => {
  const host = videoPreviewMountEl.value;
  const player = currentPlayerSig.value;
  if (!host || !player) return;
  host.appendChild(player.video);
  return () => {
    if (player.video.parentElement === host) {
      host.removeChild(player.video);
    }
  };
});

// --- Register sources and seed the camera list ---
sources.value = SOURCES;
for (const src of SOURCES) {
  setSourceStatus(src.id, "loading");
  src
    .listCameras()
    .then((cams) => {
      setCameras(src.id, cams);
      if (activeSrcId.value === null) {
        activeSrcId.value = src.id;
      }
      if (selectedCamId.value === null && cams.length > 0 && activeSrcId.value === src.id) {
        selectedCamId.value = cams[0].id;
      }
    })
    .catch((err: Error) => {
      console.error(`Failed to list cameras for ${src.id}:`, err);
      setSourceStatus(src.id, "error", err.message);
    });
}

// --- Effect: load a stream when the selected camera changes ---
let loadToken = 0;
effect(() => {
  const cam = selectedCamera.value;
  if (!cam) return;

  const myToken = ++loadToken;
  const ac = new AbortController();
  loadStream(cam.id, myToken, ac.signal).catch((err: Error) => {
    if (myToken === loadToken) {
      console.error("Failed to load stream:", err);
      status.value = `Failed: ${err.message}`;
    }
  });

  return () => ac.abort();
});

// --- Effect: push shader-param signal changes onto the live RuttEtra ---
effect(() => {
  const p = params.value;
  if (!ruttEtra) return;
  for (const key of Object.keys(p) as (keyof RuttEtraParams)[]) {
    ruttEtra.setParameter(key, p[key] as any);
  }
});

async function loadStream(
  camId: string,
  token: number,
  abortSignal: AbortSignal
): Promise<void> {
  const cam = selectedCamera.value;
  if (!cam || cam.id !== camId) return;

  status.value = `Loading ${cam.label}…`;

  const source = getSource(cam.sourceId);
  if (!source) throw new Error(`Unknown source: ${cam.sourceId}`);

  const player = await createPlayer(cam, source);

  if (token !== loadToken || abortSignal.aborted) {
    player.destroy();
    return;
  }

  // Tear down previous live objects now that the new player is ready.
  if (ruttEtra) {
    scene.remove(ruttEtra.mesh);
    ruttEtra.dispose();
    ruttEtra = null;
  }
  if (currentPlayer) {
    currentPlayer.destroy();
    currentPlayer = null;
  }

  currentPlayer = player;
  currentPlayerSig.value = player;
  ruttEtra = new RuttEtra(player.video);
  // Seed the line material's pixel resolution from the live drawing buffer so
  // line widths render correctly the very first frame (the resize observer
  // would only fire on subsequent layout changes).
  {
    const size = new THREE.Vector2();
    renderer.getDrawingBufferSize(size);
    ruttEtra.setRenderResolution(size.x, size.y);
  }
  scene.add(ruttEtra.mesh);

  // Sync params to the brand-new instance.
  const p = params.value;
  for (const key of Object.keys(p) as (keyof RuttEtraParams)[]) {
    ruttEtra.setParameter(key, p[key] as any);
  }

  status.value = cam.label;

  // Sample a thumbnail from the live frame once playback is going.
  // EarthCam exposes no per-cam still endpoint we can hit, so we cache our
  // own snapshot in localStorage and reuse it across sessions.
  if (!thumbnails.value[cam.id]) {
    captureThumbnail(player.video, cam.id);
  }
}

function captureThumbnail(video: HTMLVideoElement, camId: string): void {
  const tryCapture = (attempt: number): void => {
    if (selectedCamId.value !== camId) return;
    if (video.readyState < 2 || video.videoWidth === 0) {
      if (attempt < 20) setTimeout(() => tryCapture(attempt + 1), 250);
      return;
    }
    try {
      const w = 128;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 72;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      setThumbnail(camId, dataUrl);
    } catch (err) {
      console.warn("thumbnail capture failed:", err);
    }
  };
  tryCapture(0);
}

function takeScreenshot(): void {
  composer.render();
  const dataUrl = renderer.domElement.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `c-trend-live-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

// --- Stage / peek keyboard shortcuts ---------------------------------------
// Tab peeks the panels; Escape returns to the clean stage. M toggles MIDI
// learn. Ignore when focus is on a text input so users can still type in the
// search box.
window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
  if (e.key === "Tab") {
    e.preventDefault();
    stageMode.value = !stageMode.value;
  } else if (e.key === "m" || e.key === "M") {
    setLearning(!midiLearning.value);
  } else if (e.key === "Escape") {
    if (midiLearning.value) setLearning(false);
    else if (!stageMode.value) stageMode.value = true;
  }
});

// --- Animation loop ---
function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  if (ruttEtra) {
    ruttEtra.update();
  }
  composer.render();
}
animate();
