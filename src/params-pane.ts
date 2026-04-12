import { Pane } from "tweakpane";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { BloomEffect, EffectPass, ToneMappingEffect } from "postprocessing";
import { ToneMappingMode } from "postprocessing";
import { setParam, params, presentMode } from "./store";
import { DEFAULT_PARAMS, DEFAULT_BLOOM, type RuttEtraParams, type BloomParams } from "./types";

export interface ParamsPaneCallbacks {
  onScreenshot: () => void;
  bloom: BloomEffect;
  bloomPass: EffectPass;
  toneMapping: ToneMappingEffect;
  toneMappingPass: EffectPass;
}

/**
 * Build the Tweakpane shader-params panel and mount it inside `container`.
 *
 * Each binding is bound to a local mirror object (Tweakpane needs an object
 * to addBinding against) and its onChange writes to the central params signal.
 * The active RuttEtra instance subscribes to that signal in main.ts.
 */
export function createParamsPane(
  container: HTMLElement,
  controls: OrbitControls,
  callbacks: ParamsPaneCallbacks
): Pane {
  const pane = new Pane({ container });

  // Local mirror — tweakpane bindings need an object reference.
  const state: RuttEtraParams & {
    autoRotate: boolean;
    autoRotateSpeed: number;
  } = {
    ...DEFAULT_PARAMS,
    autoRotate: false,
    autoRotateSpeed: 1.0,
  };

  const bind = <K extends keyof RuttEtraParams>(folder: any, key: K, opts: any) => {
    folder
      .addBinding(state, key, opts)
      .on("change", (ev: { value: RuttEtraParams[K] }) => setParam(key, ev.value));
  };

  // Displacement / exposure / channel-mix.
  // - "Max Height" is the displacement at the brightest scene pixel (lum=1).
  //   Negative inverts the bright/dark relationship.
  // - "Exposure" is an EV stop applied before the scene-range remap.
  // - "Auto Exposure" tracks the live frame's pixel min/max so the brightest
  //   thing on screen always pegs at lum=1.
  // - R/G/B contributions normalize against each other (sum of |w| = 1), so
  //   they're relative ratios. Negative weights are allowed and produce signed
  //   luminance (e.g. R - G isolation).
  const dispFolder = pane.addFolder({ title: "Displacement" });
  bind(dispFolder, "displacement",  { min: -2, max: 2, step: 0.01, label: "Max Height" });
  bind(dispFolder, "exposure",      { min: -3, max: 3, step: 0.01, label: "Exposure (EV)" });
  bind(dispFolder, "autoExposure",  { label: "Auto Exposure" });
  bind(dispFolder, "weightR",       { min: -1, max: 1, step: 0.001, label: "R Contrib" });
  bind(dispFolder, "weightG",       { min: -1, max: 1, step: 0.001, label: "G Contrib" });
  bind(dispFolder, "weightB",       { min: -1, max: 1, step: 0.001, label: "B Contrib" });

  // Warp — topology transform + twists
  const warpFolder = pane.addFolder({ title: "Warp" });
  bind(warpFolder, "warpMode", {
    label: "Mode",
    options: {
      None: "none",
      "Polar Disc": "polar",
      Cylinder: "cylinder",
      Sphere: "sphere",
    },
  });
  bind(warpFolder, "warpAmount",  { min: 0, max: 1, step: 0.001, label: "Amount" });
  bind(warpFolder, "twistY",      { min: -Math.PI, max: Math.PI, step: 0.001, label: "Twist Y" });
  bind(warpFolder, "twistRadial", { min: -Math.PI, max: Math.PI, step: 0.001, label: "Twist Radial" });

  // Wave — sine modulation along the surface normal
  const waveFolder = pane.addFolder({ title: "Wave" });
  bind(waveFolder, "sineXFreq", { min: 0, max: 20, step: 0.01, label: "X Freq" });
  bind(waveFolder, "sineYFreq", { min: 0, max: 20, step: 0.01, label: "Y Freq" });
  bind(waveFolder, "sineAmp",   { min: 0, max: 2, step: 0.001, label: "Amplitude" });
  bind(waveFolder, "sineSpeed", { min: -5, max: 5, step: 0.01, label: "Speed" });

  // Lines — count = number of scan rows, samples = vertices per row, width = px
  const linesFolder = pane.addFolder({ title: "Lines" });
  bind(linesFolder, "lineCount",  { min: 10, max: 1024, step: 1, label: "Count" });
  bind(linesFolder, "resolution", { min: 32, max: 1024, step: 1, label: "Samples / Line" });
  bind(linesFolder, "lineWidth",  { min: 0.5, max: 10, step: 0.1, label: "Width (px)" });
  bind(linesFolder, "blendMode", {
    label: "Blending",
    options: { Solid: "solid", Additive: "additive" },
  });

  // Color
  const colorFolder = pane.addFolder({ title: "Color" });
  bind(colorFolder, "opacity", { min: 0, max: 1, step: 0.01, label: "Opacity" });
  // Gamma curve on the per-line video color (no spatial bleed). > 1 lifts
  // midtones (brighter); < 1 crushes them (darker). For an actual halo, see
  // the Bloom folder below.
  bind(colorFolder, "gamma", { min: 0.2, max: 3, step: 0.01, label: "Gamma" });

  // Bloom — a real postprocess pass over the whole framebuffer. Bound directly
  // to the live BloomEffect / EffectPass instances (no signal round-trip), the
  // same way OrbitControls is wired in the Camera folder below.
  const bloom = callbacks.bloom;
  const bloomPass = callbacks.bloomPass;
  const bloomState: BloomParams = { ...DEFAULT_BLOOM };
  const bloomFolder = pane.addFolder({ title: "Bloom" });
  bloomFolder
    .addBinding(bloomState, "enabled", { label: "Enabled" })
    .on("change", (ev: { value: boolean }) => {
      bloomPass.enabled = ev.value;
    });
  bloomFolder
    .addBinding(bloomState, "intensity", { min: 0, max: 5, step: 0.01, label: "Intensity" })
    .on("change", (ev: { value: number }) => {
      bloom.intensity = ev.value;
    });
  bloomFolder
    .addBinding(bloomState, "threshold", { min: 0, max: 1, step: 0.01, label: "Threshold" })
    .on("change", (ev: { value: number }) => {
      bloom.luminanceMaterial.threshold = ev.value;
    });
  bloomFolder
    .addBinding(bloomState, "smoothing", { min: 0, max: 1, step: 0.01, label: "Smoothing" })
    .on("change", (ev: { value: number }) => {
      bloom.luminanceMaterial.smoothing = ev.value;
    });
  bloomFolder
    .addBinding(bloomState, "radius", { min: 0, max: 1, step: 0.01, label: "Radius" })
    .on("change", (ev: { value: number }) => {
      bloom.mipmapBlurPass.radius = ev.value;
    });

  // Tone mapping — fixes the side-view washout caused by additive blending
  // clipping per-channel. ACES rolls off HDR values smoothly so hue survives.
  const toneMapping = callbacks.toneMapping;
  const toneMappingPass = callbacks.toneMappingPass;
  const toneState = { mode: "aces" as "off" | "aces" };
  const toneFolder = pane.addFolder({ title: "Tone Mapping" });
  toneFolder
    .addBinding(toneState, "mode", {
      label: "Mode",
      options: { Off: "off", "ACES Filmic": "aces" },
    })
    .on("change", (ev: { value: "off" | "aces" }) => {
      if (ev.value === "off") {
        toneMappingPass.enabled = false;
      } else {
        toneMappingPass.enabled = true;
        toneMapping.mode = ToneMappingMode.ACES_FILMIC;
      }
    });

  // Camera (orbit controls — not a shader uniform, lives outside the params signal)
  const camFolder = pane.addFolder({ title: "Camera" });
  camFolder
    .addBinding(state, "autoRotate", { label: "Auto Rotate" })
    .on("change", (ev: { value: boolean }) => {
      controls.autoRotate = ev.value;
    });
  camFolder
    .addBinding(state, "autoRotateSpeed", { min: 0.1, max: 5, step: 0.1, label: "Rotate Speed" })
    .on("change", (ev: { value: number }) => {
      controls.autoRotateSpeed = ev.value;
    });
  camFolder
    .addButton({ title: "Reset View" })
    .on("click", () => controls.reset());

  // View
  const viewFolder = pane.addFolder({ title: "View" });
  viewFolder
    .addButton({ title: "Present (P)" })
    .on("click", () => {
      presentMode.value = !presentMode.value;
    });

  // Export
  const exportFolder = pane.addFolder({ title: "Export" });
  exportFolder
    .addButton({ title: "Screenshot" })
    .on("click", () => callbacks.onScreenshot());

  // Initialise the params signal so any subscriber starts in sync.
  params.value = { ...DEFAULT_PARAMS };

  return pane;
}
