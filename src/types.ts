export type WarpMode = "none" | "polar" | "cylinder" | "sphere";
export type BlendMode = "additive" | "solid";

export interface RuttEtraParams {
  displacement: number;
  lineCount: number;
  lineWidth: number;
  blendMode: BlendMode;
  opacity: number;
  colorMix: number;
  tintColor: string;
  glow: number;
  resolution: number;
  wireframe: boolean;
  weightR: number;
  weightG: number;
  weightB: number;
  // Vertex effect pipeline
  warpMode: WarpMode;
  warpAmount: number;
  twistY: number;
  twistRadial: number;
  sineXFreq: number;
  sineYFreq: number;
  sineAmp: number;
  sineSpeed: number;
}

export const DEFAULT_PARAMS: RuttEtraParams = {
  displacement: 2.0,
  lineCount: 512,
  lineWidth: 0.4,
  // Solid: each line occludes the lines behind it (depth-tested NormalBlending).
  // Additive: lines sum into the framebuffer for a glowy stack — washes to
  // white from the side because of overdraw, but matches the original look.
  blendMode: "solid",
  opacity: 1.0,
  colorMix: 1.0,
  tintColor: "#00ff88",
  glow: 0.3,
  resolution: 256,
  wireframe: false,
  weightR: 0.299,
  weightG: 0.587,
  weightB: 0.114,
  // Vertex effects — all default to no-op so first load looks identical to before
  warpMode: "none",
  warpAmount: 0,
  twistY: 0,
  twistRadial: 0,
  sineXFreq: 0,
  sineYFreq: 0,
  sineAmp: 0,
  sineSpeed: 1,
};

/**
 * Bloom post-process parameters. Lives outside RuttEtraParams because bloom
 * is a renderer-level concern, not a shader-uniform on the Rutt/Etra material.
 */
export interface BloomParams {
  enabled: boolean;
  intensity: number;
  threshold: number;
  smoothing: number;
  radius: number;
}

export const DEFAULT_BLOOM: BloomParams = {
  enabled: true,
  intensity: 1.0,
  threshold: 0.6,
  smoothing: 0.2,
  radius: 0.85,
};
