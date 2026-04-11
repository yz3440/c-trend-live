// Rutt/Etra fragment color snippet.
//
// This file is *not* a complete fragment shader — it's a chunk of GLSL prepended
// into three's stock LineMaterial fragment shader (see rutt-etra.ts onBeforeCompile).
// LineMaterial owns the line antialiasing, endcap discards, dashing, etc.; we
// only override the final color so the line shows the source video color, the
// configurable tint, and the per-pixel glow.

uniform vec3 uTintColor;
uniform float uColorMix;
uniform float uGlow;

varying vec3 vRuttColor;
varying float vRuttLum;

// Override LineMaterial's flat diffuse with a per-vertex video color blended
// against the tint, then apply a luminance-keyed brighten. Alpha comes from
// LineMaterial's own AA / opacity calculation, so we just pass it through.
vec3 ruttEtraColor() {
  vec3 c = mix(uTintColor, vRuttColor, uColorMix);
  c *= 1.0 + uGlow * vRuttLum;
  return c;
}
