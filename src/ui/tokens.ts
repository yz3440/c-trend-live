/**
 * Shared structural + expressive tokens for C-Trend Live UI.
 *
 * Most colors stay inline; they're expressive choices, not system abstractions.
 * The handful centralised here are the ones that must read as one instrument
 * across every surface: the accent and its derivatives, the panel material and
 * its hairlines, the ink ramp, and the z-index order.
 */

// ── Typography ──────────────────────────────────────────────────────────────
// The whole instrument is set in one face: Departure Mono (CRT pixel mono).
// No sans anywhere; everything inherits the mono.
export const FONT_MONO = '"Departure Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const FONT_BASE = `12px/1.4 ${FONT_MONO}`;
export const FONT_SMALL = `11px/1.4 ${FONT_MONO}`;
export const FONT_MONO_SMALL = `11px/1 ${FONT_MONO}`;

// ── Radii ───────────────────────────────────────────────────────────────────
export const RADIUS = 3;

// ── Blur (for floating surfaces) ────────────────────────────────────────────
export const BLUR = "blur(6px)";

// ── Surfaces ────────────────────────────────────────────────────────────────
// The panel material every chrome surface is cut from, plus the two hairline
// weights that separate them.
export const PANEL_BG = "rgba(12, 12, 14, 0.95)";
export const HAIRLINE = "rgba(255, 255, 255, 0.06)";
export const HAIRLINE_STRONG = "rgba(255, 255, 255, 0.10)";

// ── Ink ramp ────────────────────────────────────────────────────────────────
// Three steps for text on the dark panels. INK_DIM is the floor for small text
// that still needs to clear ~4.5:1; go no lighter for body-sized copy.
export const INK = "rgba(255, 255, 255, 0.92)";
export const INK_DIM = "rgba(255, 255, 255, 0.6)";
export const INK_FAINT = "rgba(255, 255, 255, 0.4)";

// ── Emphasis ──────────────────────────────────────────────────────────────────
// No pop color: the theme is greyscale. "Emphasis" is just the top of the ink
// ramp plus a faint white tint. Active / selected / focused elements brighten
// to ACCENT and pick up ACCENT_SOFT behind them; nothing jumps to a hue.
export const ACCENT = "rgba(255, 255, 255, 0.92)"; // emphasis = full-strength ink
export const ACCENT_SOFT = "rgba(255, 255, 255, 0.09)"; // selected-row / active tint
export const ACCENT_LINE = "rgba(255, 255, 255, 0.28)"; // selected outline / accent hairline
export const ACCENT_RING = "rgba(255, 255, 255, 0.22)"; // keyboard focus halo

// ── Z-index scale ───────────────────────────────────────────────────────────
// Semantic, ascending. The native <dialog> renders in the browser top layer
// regardless, but the stage overlay and status surfaces still need an order.
export const Z = {
  stageOverlay: 10,
  drawer: 30,
  backdrop: 40,
  dialog: 50,
  toast: 60,
} as const;
