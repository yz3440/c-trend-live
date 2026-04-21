/**
 * Shared structural tokens for C-Trend Live UI.
 *
 * Colors stay inline — they're expressive choices, not system abstractions.
 * These tokens cover the mechanical stuff that should never drift between
 * components: font stacks, rounding, blur.
 */

// ── Typography ──────────────────────────────────────────────────────────────
export const FONT_SANS = "-apple-system, system-ui, sans-serif";
export const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const FONT_BASE = `12px/1.4 ${FONT_SANS}`;
export const FONT_SMALL = `11px/1.4 ${FONT_SANS}`;
export const FONT_MONO_SMALL = `11px/1 ${FONT_MONO}`;

// ── Radii ───────────────────────────────────────────────────────────────────
export const RADIUS = 3;

// ── Blur (for floating surfaces) ────────────────────────────────────────────
export const BLUR = "blur(6px)";

// ── Accent ──────────────────────────────────────────────────────────────────
// The one expressive color that shows up across interactive highlights — the
// selected camera row, the MIDI learn border, the MIDI activity indicator.
// Centralised so those touchpoints stay coherent even as individual components
// evolve.
export const ACCENT = "#00ff88";
