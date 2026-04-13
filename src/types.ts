export type WarpMode = "none" | "polar" | "cylinder" | "sphere";
export type BlendMode = "additive" | "solid";

export interface RuttEtraParams {
  // Max line height (signed). Multiplies the normalized luminance to produce
  // the per-vertex offset along the surface normal. Positive: bright pushes
  // out / dark pushes in. Negative: inverted.
  displacement: number;
  // Manual exposure stop. Multiplies the normalized luminance by 2^exposure
  // before the scene-range remap. 0 = unity gain.
  exposure: number;
  // One-shot calibration. When toggled on (or when a stream switches), the
  // first frame with valid pixels is sampled into a hidden 32×32 canvas and
  // the resulting min/max are written directly to uSceneMin / uSceneMax.
  // Held fixed afterwards — no temporal drift, no per-frame work. Toggle off
  // to revert to the identity remap (0 → 1).
  autoExposure: boolean;
  lineCount: number;
  lineWidth: number;
  blendMode: BlendMode;
  opacity: number;
  // Gamma curve applied to the per-line video color in the fragment shader.
  // 1.0 = linear pass-through. > 1 brightens midtones; < 1 darkens. Lets a
  // single knob lift or crush the line color without bloom.
  gamma: number;
  resolution: number;
  weightR: number;
  weightG: number;
  weightB: number;
  // Vertex effect pipeline
  warpMode: WarpMode;
  warpAmount: number;
  twistY: number;
  twistRadial: number;
}

export const DEFAULT_PARAMS: RuttEtraParams = {
  // Max height — the displacement at lum = 1.0 (i.e. the brightest scene
  // pixel when auto-exposure is on). Range tightened from the old [-10, 10]
  // because lum is now a normalized 0-1 quantity rather than a raw luminance.
  displacement: 1.0,
  exposure: 0.0,
  autoExposure: true,
  // Number of scan-line *rows* in the geometry. With real line geometry the
  // sweet spot is much lower than the old fragment-stripe trick (which could
  // afford 512 because the lines were just texture-space stripes on one mesh).
  lineCount: 512,
  // Line thickness in screen pixels (LineMaterial worldUnits = false). Maps
  // directly to Felix Turner's "lineThickness" reference param.
  lineWidth: 1.5,
  // Solid: each line occludes the lines behind it (depth-tested NormalBlending).
  // Additive: lines sum into the framebuffer for a glowy stack — washes to
  // white from the side because of overdraw, but matches the original look.
  blendMode: "additive",
  opacity: 0.5,
  gamma: 1.0,
  // Vertex samples per scan line (more = smoother depth profile along each
  // line). 384 ≈ enough to track per-pixel detail of a 720p source.
  resolution: 384,
  weightR: 0.299,
  weightG: 0.587,
  weightB: 0.114,
  // Vertex effects — all default to no-op so first load looks identical to before
  warpMode: "sphere",
  warpAmount: 1,
  twistY: 0,
  twistRadial: 0,
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
