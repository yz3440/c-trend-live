import {
  ACCENT,
  ACCENT_RING,
  FONT_MONO,
  HAIRLINE_STRONG,
  INK,
  INK_DIM,
  INK_FAINT,
} from "./tokens";
import departureMono from "./fonts/DepartureMono-Regular.woff2";

/**
 * The few rules inline styles genuinely can't express, mounted once at the app
 * root: the @font-face for the chrome's CRT mono, :focus-visible rings, the
 * search placeholder color, the Tweakpane theme, and the reduced-motion
 * fallback for the sidebar view swap. Everything that *can* stay inline still
 * does; this file is the deliberate exception, not a new pattern.
 */
const CSS = /* css */ `
/* ── Chrome face: Departure Mono (CRT pixel mono, SIL OFL, Helena Zhang) ──── */
@font-face {
  font-family: "Departure Mono";
  src: url(${departureMono}) format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* ── Keyboard focus rings (mouse interaction stays quiet) ────────────────── */
.ctl-focusable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px ${ACCENT}, 0 0 0 4px ${ACCENT_RING};
  border-radius: 3px;
}

/* ── Search field placeholder: clears 4.5:1 on the dark slot ─────────────── */
.ctl-search::placeholder { color: ${INK_DIM}; opacity: 1; }
.ctl-search::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }

/* ── Tweakpane: re-skinned to the monochrome instrument ─────────────────── */
.ctl-tp {
  --tp-base-background-color: transparent;
  --tp-base-shadow-color: transparent;
  --tp-font-family: ${FONT_MONO};

  --tp-container-background-color: rgba(255, 255, 255, 0.025);
  --tp-container-background-color-hover: rgba(255, 255, 255, 0.05);
  --tp-container-background-color-active: rgba(255, 255, 255, 0.07);
  --tp-container-background-color-focus: rgba(255, 255, 255, 0.06);
  --tp-container-foreground-color: ${INK_DIM};

  --tp-button-background-color: rgba(255, 255, 255, 0.07);
  --tp-button-background-color-hover: rgba(255, 255, 255, 0.10);
  --tp-button-background-color-focus: rgba(255, 255, 255, 0.14);
  --tp-button-background-color-active: rgba(255, 255, 255, 0.20);
  --tp-button-foreground-color: ${INK};

  --tp-input-background-color: rgba(0, 0, 0, 0.4);
  --tp-input-background-color-hover: rgba(0, 0, 0, 0.55);
  --tp-input-background-color-focus: rgba(0, 0, 0, 0.6);
  --tp-input-background-color-active: rgba(0, 0, 0, 0.6);
  --tp-input-foreground-color: ${ACCENT};

  --tp-label-foreground-color: ${INK_DIM};
  --tp-groove-foreground-color: ${HAIRLINE_STRONG};
  --tp-monitor-background-color: rgba(0, 0, 0, 0.4);
  --tp-monitor-foreground-color: rgba(255, 255, 255, 0.85);

  --tp-blade-value-width: 160px;
  font-size: 11px;
}
/* Folder titles read like terminal section headers, not chrome buttons. */
.ctl-tp .tp-fldv_t,
.ctl-tp .tp-rotv_t {
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 10px;
  color: ${INK_FAINT};
}
/* Slider rail + knob. Tweakpane colors the knob from --tp-button-background-*
   and the unfilled rail from --tp-input-background-color, both deliberately
   faint here, which left the handle nearly invisible. Brighten them directly
   (the filled portion already uses the bright --tp-input-foreground-color). */
.ctl-tp .tp-sldv_t::before { background-color: rgba(255, 255, 255, 0.16); }
.ctl-tp .tp-sldv_k::after {
  background-color: rgba(255, 255, 255, 0.72);
  transition: background-color 120ms ease-out;
}
.ctl-tp .tp-sldv_t:hover .tp-sldv_k::after,
.ctl-tp .tp-sldv_t:focus .tp-sldv_k::after { background-color: rgba(255, 255, 255, 0.92); }
.ctl-tp .tp-sldv_t:active .tp-sldv_k::after { background-color: ${ACCENT}; }

@media (prefers-reduced-motion: reduce) {
  .ctl-view { transition: none !important; }
}
`;

export function GlobalStyle() {
  return <style>{CSS}</style>;
}
