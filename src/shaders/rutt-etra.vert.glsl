// Rutt/Etra vertex shader with composable warp / wave / twist pipeline.
// Pipeline (per vertex):
//   flat plane → warp (polar/cyl/sphere, lerped) → displacement along normal
//             → sine modulation along normal → twist (XY rotate around Z)

uniform sampler2D uVideoTexture;
uniform float uDisplacement;
uniform vec3 uChannelWeights;
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

varying vec2 vUv;
varying vec3 vColor;
varying float vLuminance;

const float TAU = 6.28318530718;
const float PI  = 3.14159265359;

// ---------------------------------------------------------------------------
// Warp functions: each maps uv → (warpedPos, warpedNormal).
// Radius/scale chosen so the warped shape roughly matches the original plane
// extents (the plane is `videoAspect` wide × 1 tall).
// ---------------------------------------------------------------------------
void warpPolar(vec2 uv, out vec3 pos, out vec3 nrm) {
  float theta = uv.x * TAU;
  float r = uv.y * 0.5;
  pos = vec3(r * cos(theta), r * sin(theta), 0.0);
  nrm = vec3(0.0, 0.0, 1.0);
}

void warpCylinder(vec2 uv, out vec3 pos, out vec3 nrm) {
  float theta = uv.x * TAU;
  float R = 0.5;
  pos = vec3(R * sin(theta), uv.y - 0.5, -R * cos(theta));
  nrm = vec3(sin(theta), 0.0, -cos(theta));
}

void warpSphere(vec2 uv, out vec3 pos, out vec3 nrm) {
  float lon = uv.x * TAU;
  float lat = (uv.y - 0.5) * PI;
  float R = 0.5;
  float cosLat = cos(lat);
  pos = vec3(R * cosLat * sin(lon), R * sin(lat), -R * cosLat * cos(lon));
  nrm = vec3(cosLat * sin(lon), sin(lat), -cosLat * cos(lon));
}

void main() {
  vUv = uv;

  vec4 texel = texture2D(uVideoTexture, uv);
  vColor = texel.rgb;

  // Weighted channel value. Pass the raw value to the fragment shader so glow
  // stays keyed off the true luminance.
  float raw = dot(texel.rgb, uChannelWeights);
  vLuminance = raw;

  // ---- 1. Compute warped position + normal --------------------------------
  vec3 warpedPos = position;
  vec3 warpedNormal = vec3(0.0, 0.0, 1.0);
  if (uWarpMode == 1) {
    warpPolar(uv, warpedPos, warpedNormal);
  } else if (uWarpMode == 2) {
    warpCylinder(uv, warpedPos, warpedNormal);
  } else if (uWarpMode == 3) {
    warpSphere(uv, warpedPos, warpedNormal);
  }

  // ---- 2. Morph between flat and warped -----------------------------------
  vec3 basePos = mix(position, warpedPos, uWarpAmount);
  vec3 baseNormal = normalize(mix(vec3(0.0, 0.0, 1.0), warpedNormal, uWarpAmount));

  // ---- 3. Rutt/Etra displacement (along base normal, not always +Z) -------
  // When amount is negative, invert the brightness mapping so dark pixels
  // protrude. Always pushes outward along the normal.
  float displaceLum = uDisplacement >= 0.0 ? raw : (1.0 - raw);
  basePos += baseNormal * (displaceLum * abs(uDisplacement));

  // ---- 4. Sine wave modulation --------------------------------------------
  float sineMod = uSineAmp
    * sin(uv.x * uSineXFreq * TAU + uTime * uSineSpeed)
    * sin(uv.y * uSineYFreq * TAU + uTime * uSineSpeed);
  basePos += baseNormal * sineMod;

  // ---- 5. Twist (rotate XY around Z axis) ---------------------------------
  // Y-based gives a towel-wring; radial-based gives a spiral. They sum.
  float twistAngle = uTwistY * (uv.y - 0.5) + uTwistRadial * length(uv - vec2(0.5));
  float c = cos(twistAngle);
  float s = sin(twistAngle);
  basePos.xy = mat2(c, -s, s, c) * basePos.xy;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(basePos, 1.0);
}
