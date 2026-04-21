/**
 * Parameter registry — the single source of truth for every knob the user can
 * tweak. Tweakpane and MIDI are both thin consumers of this list; neither one
 * knows about the other. Adding a new parameter is a one-liner here.
 */
import type { BloomParams, RuttEtraParams } from "./types";

export type ShaderParamId = keyof RuttEtraParams;
export type BloomParamId = `bloom.${keyof BloomParams}`;
export type ToneParamId = "toneMapping.mode";
export type CameraParamId = "camera.autoRotate" | "camera.autoRotateSpeed";
export type TriggerParamId = "camera.reset" | "view.present" | "view.screenshot";

export type ParamId =
  | ShaderParamId
  | BloomParamId
  | ToneParamId
  | CameraParamId
  | TriggerParamId;

export type EnumOption = { readonly label: string; readonly value: string };

export type NumberDescriptor = {
  readonly id: ParamId;
  readonly kind: "number";
  readonly group: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
};

export type BooleanDescriptor = {
  readonly id: ParamId;
  readonly kind: "boolean";
  readonly group: string;
  readonly label: string;
};

export type EnumDescriptor = {
  readonly id: ParamId;
  readonly kind: "enum";
  readonly group: string;
  readonly label: string;
  readonly options: readonly EnumOption[];
};

export type TriggerDescriptor = {
  readonly id: ParamId;
  readonly kind: "trigger";
  readonly group: string;
  readonly label: string;
};

export type ParamDescriptor =
  | NumberDescriptor
  | BooleanDescriptor
  | EnumDescriptor
  | TriggerDescriptor;

const TAU = Math.PI;

export const PARAM_DESCRIPTORS: readonly ParamDescriptor[] = [
  // ── Displacement ────────────────────────────────────────────────────────
  { id: "displacement", kind: "number", group: "Displacement", label: "Max Height", min: -2, max: 2, step: 0.01 },
  { id: "exposure", kind: "number", group: "Displacement", label: "Exposure (EV)", min: -3, max: 3, step: 0.01 },
  { id: "autoExposure", kind: "boolean", group: "Displacement", label: "Auto Exposure" },
  { id: "weightR", kind: "number", group: "Displacement", label: "R Contrib", min: -1, max: 1, step: 0.001 },
  { id: "weightG", kind: "number", group: "Displacement", label: "G Contrib", min: -1, max: 1, step: 0.001 },
  { id: "weightB", kind: "number", group: "Displacement", label: "B Contrib", min: -1, max: 1, step: 0.001 },

  // ── Warp ───────────────────────────────────────────────────────────────
  {
    id: "warpMode",
    kind: "enum",
    group: "Warp",
    label: "Mode",
    options: [
      { label: "None", value: "none" },
      { label: "Polar Disc", value: "polar" },
      { label: "Cylinder", value: "cylinder" },
      { label: "Sphere", value: "sphere" },
    ],
  },
  { id: "warpAmount", kind: "number", group: "Warp", label: "Amount", min: 0, max: 1, step: 0.001 },
  { id: "twistY", kind: "number", group: "Warp", label: "Twist Y", min: -TAU, max: TAU, step: 0.001 },
  { id: "twistRadial", kind: "number", group: "Warp", label: "Twist Radial", min: -TAU, max: TAU, step: 0.001 },

  // ── Lines ──────────────────────────────────────────────────────────────
  { id: "lineCount", kind: "number", group: "Lines", label: "Count", min: 10, max: 1024, step: 1 },
  { id: "resolution", kind: "number", group: "Lines", label: "Samples / Line", min: 32, max: 1024, step: 1 },
  { id: "lineWidth", kind: "number", group: "Lines", label: "Width (px)", min: 0.5, max: 10, step: 0.1 },
  {
    id: "blendMode",
    kind: "enum",
    group: "Lines",
    label: "Blending",
    options: [
      { label: "Solid", value: "solid" },
      { label: "Additive", value: "additive" },
    ],
  },

  // ── Color ──────────────────────────────────────────────────────────────
  { id: "opacity", kind: "number", group: "Color", label: "Opacity", min: 0, max: 1, step: 0.01 },
  { id: "gamma", kind: "number", group: "Color", label: "Gamma", min: 0.2, max: 3, step: 0.01 },

  // ── Bloom ──────────────────────────────────────────────────────────────
  { id: "bloom.enabled", kind: "boolean", group: "Bloom", label: "Enabled" },
  { id: "bloom.intensity", kind: "number", group: "Bloom", label: "Intensity", min: 0, max: 5, step: 0.01 },
  { id: "bloom.threshold", kind: "number", group: "Bloom", label: "Threshold", min: 0, max: 1, step: 0.01 },
  { id: "bloom.smoothing", kind: "number", group: "Bloom", label: "Smoothing", min: 0, max: 1, step: 0.01 },
  { id: "bloom.radius", kind: "number", group: "Bloom", label: "Radius", min: 0, max: 1, step: 0.01 },

  // ── Tone Mapping ───────────────────────────────────────────────────────
  {
    id: "toneMapping.mode",
    kind: "enum",
    group: "Tone Mapping",
    label: "Mode",
    options: [
      { label: "Off", value: "off" },
      { label: "ACES Filmic", value: "aces" },
    ],
  },

  // ── Camera ─────────────────────────────────────────────────────────────
  { id: "camera.autoRotate", kind: "boolean", group: "Camera", label: "Auto Rotate" },
  { id: "camera.autoRotateSpeed", kind: "number", group: "Camera", label: "Rotate Speed", min: 0.1, max: 5, step: 0.1 },
  { id: "camera.reset", kind: "trigger", group: "Camera", label: "Reset View" },

  // ── View / Export ──────────────────────────────────────────────────────
  { id: "view.present", kind: "trigger", group: "View", label: "Peek UI (Tab)" },
  { id: "view.screenshot", kind: "trigger", group: "Export", label: "Screenshot" },
];

const DESCRIPTOR_BY_ID: Record<string, ParamDescriptor> = Object.fromEntries(
  PARAM_DESCRIPTORS.map((d) => [d.id, d])
);

export function getDescriptor(id: ParamId): ParamDescriptor | undefined {
  return DESCRIPTOR_BY_ID[id];
}

/** Iterate descriptors in registration order, grouped by `group`. */
export function groupedDescriptors(): ReadonlyArray<{
  group: string;
  items: readonly ParamDescriptor[];
}> {
  const order: string[] = [];
  const map = new Map<string, ParamDescriptor[]>();
  for (const d of PARAM_DESCRIPTORS) {
    if (!map.has(d.group)) {
      order.push(d.group);
      map.set(d.group, []);
    }
    map.get(d.group)!.push(d);
  }
  return order.map((g) => ({ group: g, items: map.get(g)! }));
}
