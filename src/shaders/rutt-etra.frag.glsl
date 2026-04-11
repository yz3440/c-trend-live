uniform float uLineCount;
uniform float uLineWidth;
uniform float uOpacity;
uniform vec3 uTintColor;
uniform float uColorMix;
uniform float uGlow;

varying vec2 vUv;
varying vec3 vColor;
varying float vLuminance;

void main() {
  // Scan line pattern in UV space. We compute fwidth on the *raw* (pre-fract)
  // value because fract() introduces a discontinuity at the wrap that would
  // spike fwidth at every stripe boundary; the raw value's screen-space
  // gradient is what we actually want for the AA edge width.
  float lineRaw = vUv.y * uLineCount;
  float line = fract(lineRaw);

  // Adaptive edge width: ~1 screen pixel wide regardless of how much the
  // heightfield has stretched this region. Without this the stripe pattern
  // aliases on stretched quads and you see broken/gappy lines from oblique
  // viewing angles. The minimum prevents a divide-to-zero crispness when the
  // mesh is far from the camera.
  float edge = max(fwidth(lineRaw), 0.001);

  float mask = smoothstep(0.0, edge, line)
             * smoothstep(uLineWidth, uLineWidth - edge, line);
  mask = clamp(mask, 0.0, 1.0);

  if (mask < 0.01) discard;

  // Mix tint with video color (uColorMix=1 → pure video, =0 → pure tint)
  vec3 color = mix(uTintColor, vColor, uColorMix);

  // Apply glow (brighten based on luminance)
  color *= 1.0 + uGlow * vLuminance;

  gl_FragColor = vec4(color, mask * uOpacity);
}
