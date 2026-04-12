// Rutt/Etra fragment color snippet.
//
// This file is *not* a complete fragment shader — it's a chunk of GLSL prepended
// into three's stock LineMaterial fragment shader (see rutt-etra.ts onBeforeCompile).
// LineMaterial owns the line antialiasing, endcap discards, dashing, etc.; we
// only override the final color so the line shows the source video color
// passed through a single gamma curve.

uniform float uGamma;

varying vec3 vRuttColor;
varying float vRuttLum;

// Override LineMaterial's flat diffuse with the per-vertex video color, gamma-
// curved. uGamma > 1 brightens midtones (lifts shadows toward the highlights);
// uGamma < 1 crushes midtones toward black; uGamma == 1 is a pass-through.
// pow() preserves hue per-channel because all three channels share the same
// exponent. Alpha comes from LineMaterial's own AA / opacity calculation.
vec3 ruttEtraColor() {
  vec3 c = max(vRuttColor, vec3(0.0));
  return pow(c, vec3(1.0 / max(uGamma, 1e-4)));
}
