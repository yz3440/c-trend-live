// Rutt/Etra vertex deformation snippet.
//
// This file is *not* a complete vertex shader — it's a chunk of GLSL prepended
// into three's stock LineMaterial vertex shader (see rutt-etra.ts onBeforeCompile).
// It declares the uniforms / varyings the deformation pipeline needs and defines
// the `ruttEtraDeform()` function that maps a UV coordinate to a deformed
// world-space position by sampling the video texture and running the
// warp → displacement → wave → twist pipeline.

uniform sampler2D uVideoTexture;
uniform float uDisplacement;
uniform vec3 uChannelWeights;
uniform float uVideoAspect;
uniform float uTime;

// Warp
uniform int uWarpMode;       // 0 none, 1 polar, 2 cylinder, 3 sphere
uniform float uWarpAmount;
uniform float uTwistY;
uniform float uTwistRadial;

// Wave
uniform float uSineXFreq;
uniform float uSineYFreq;
uniform float uSineAmp;
uniform float uSineSpeed;

// Per-segment endpoint outputs (one set per corner; LineMaterial picks based on
// position.y < 0.5 in the host vertex shader, then linearly interpolates across
// the segment in the fragment stage).
varying vec3 vRuttColor;
varying float vRuttLum;

const float TAU_RE = 6.28318530718;
const float PI_RE  = 3.14159265359;

// ---------------------------------------------------------------------------
// Warp functions: each maps uv → (warpedPos, warpedNormal). Radius/scale chosen
// so the warped shape roughly matches the original plane extents (`uVideoAspect`
// wide × 1 tall).
// ---------------------------------------------------------------------------
void warpPolarRE(vec2 uv, out vec3 pos, out vec3 nrm) {
  float theta = uv.x * TAU_RE;
  float r = uv.y * 0.5;
  pos = vec3(r * cos(theta), r * sin(theta), 0.0);
  nrm = vec3(0.0, 0.0, 1.0);
}

void warpCylinderRE(vec2 uv, out vec3 pos, out vec3 nrm) {
  float theta = uv.x * TAU_RE;
  float R = 0.5;
  pos = vec3(R * sin(theta), uv.y - 0.5, -R * cos(theta));
  nrm = vec3(sin(theta), 0.0, -cos(theta));
}

void warpSphereRE(vec2 uv, out vec3 pos, out vec3 nrm) {
  float lon = uv.x * TAU_RE;
  float lat = (uv.y - 0.5) * PI_RE;
  float R = 0.5;
  float cosLat = cos(lat);
  pos = vec3(R * cosLat * sin(lon), R * sin(lat), -R * cosLat * cos(lon));
  nrm = vec3(cosLat * sin(lon), sin(lat), -cosLat * cos(lon));
}

// ---------------------------------------------------------------------------
// Sample the video at `uv` and return the deformed position. Also writes the
// raw RGB and luminance to colOut/lumOut so the caller can stash them in
// per-vertex varyings for the fragment shader.
// ---------------------------------------------------------------------------
vec3 ruttEtraDeform(vec2 uv, out vec3 colOut, out float lumOut) {
  vec4 texel = texture2D(uVideoTexture, uv);
  colOut = texel.rgb;
  float raw = dot(texel.rgb, uChannelWeights);
  lumOut = raw;

  // Flat reference position — same UV→XY mapping as the old PlaneGeometry,
  // centered on origin and scaled by aspect.
  vec3 flatPos = vec3((uv.x - 0.5) * uVideoAspect, uv.y - 0.5, 0.0);

  // ---- 1. Compute warped position + normal --------------------------------
  vec3 warpedPos = flatPos;
  vec3 warpedNormal = vec3(0.0, 0.0, 1.0);
  if (uWarpMode == 1) {
    warpPolarRE(uv, warpedPos, warpedNormal);
  } else if (uWarpMode == 2) {
    warpCylinderRE(uv, warpedPos, warpedNormal);
  } else if (uWarpMode == 3) {
    warpSphereRE(uv, warpedPos, warpedNormal);
  }

  // ---- 2. Morph between flat and warped -----------------------------------
  vec3 basePos = mix(flatPos, warpedPos, uWarpAmount);
  vec3 baseNormal = normalize(mix(vec3(0.0, 0.0, 1.0), warpedNormal, uWarpAmount));

  // ---- 3. Rutt/Etra displacement (along base normal) ----------------------
  // Negative amount inverts the brightness mapping so dark pixels protrude.
  float displaceLum = uDisplacement >= 0.0 ? raw : (1.0 - raw);
  basePos += baseNormal * (displaceLum * abs(uDisplacement));

  // ---- 4. Sine wave modulation --------------------------------------------
  float sineMod = uSineAmp
    * sin(uv.x * uSineXFreq * TAU_RE + uTime * uSineSpeed)
    * sin(uv.y * uSineYFreq * TAU_RE + uTime * uSineSpeed);
  basePos += baseNormal * sineMod;

  // ---- 5. Twist (rotate XY around Z axis) ---------------------------------
  // Y-based gives a towel-wring; radial-based gives a spiral. They sum.
  float twistAngle = uTwistY * (uv.y - 0.5) + uTwistRadial * length(uv - vec2(0.5));
  float c = cos(twistAngle);
  float s = sin(twistAngle);
  basePos.xy = mat2(c, -s, s, c) * basePos.xy;

  return basePos;
}
