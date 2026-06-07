import { useEffect, useRef, useState } from "preact/hooks";
import { paramsMountEl } from "../store";
import {
  ACCENT,
  FONT_BASE,
  FONT_MONO,
  HAIRLINE,
  HAIRLINE_STRONG,
  INK_DIM,
  INK_FAINT,
  PANEL_BG,
} from "./tokens";

/**
 * The right grid cell that hosts the Tweakpane shader controls.
 *
 * The `ctl-tp` class hangs the Tweakpane theme (CSS custom properties in
 * GlobalStyle) over the mounted pane. The header carries a "?" that toggles a
 * short note on what a Rutt/Etra synthesizer is; it expands inline (rather than
 * as a floating tooltip) because the panel is `overflowY:auto` and would clip an
 * absolutely-positioned popover. Publishes its inner div into the store as a ref
 * signal so main.ts can mount the Tweakpane instance into it on boot.
 */
export function ParamsPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    paramsMountEl.value = ref.current;
    return () => {
      paramsMountEl.value = null;
    };
  }, []);

  return (
    <div
      class="ctl-tp"
      style={{
        height: "100%",
        background: PANEL_BG,
        borderLeft: `1px solid ${HAIRLINE}`,
        color: INK_DIM,
        font: FONT_BASE,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "11px 12px 9px",
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: INK_FAINT,
          }}
        >
          Rutt / Etra
        </span>
        <button
          class="ctl-focusable"
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
          aria-controls="ctl-re-help"
          aria-label="What is a Rutt/Etra synthesizer?"
          title="What is a Rutt/Etra?"
          style={{
            appearance: "none",
            width: 16,
            height: 16,
            display: "grid",
            placeItems: "center",
            background: "transparent",
            border: `1px solid ${helpOpen ? ACCENT : HAIRLINE_STRONG}`,
            borderRadius: "50%",
            color: helpOpen ? ACCENT : INK_FAINT,
            cursor: "pointer",
            fontFamily: FONT_MONO,
            fontSize: 10,
            lineHeight: 1,
            flexShrink: 0,
            transition: "color 140ms ease-out, border-color 140ms ease-out",
          }}
          onMouseEnter={(e) => {
            const t = e.currentTarget as HTMLElement;
            t.style.color = ACCENT;
            t.style.borderColor = ACCENT;
          }}
          onMouseLeave={(e) => {
            const t = e.currentTarget as HTMLElement;
            t.style.color = helpOpen ? ACCENT : INK_FAINT;
            t.style.borderColor = helpOpen ? ACCENT : HAIRLINE_STRONG;
          }}
        >
          ?
        </button>
      </div>

      {helpOpen && (
        <div
          id="ctl-re-help"
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${HAIRLINE}`,
            fontFamily: FONT_MONO,
            fontSize: 12,
            lineHeight: 1.6,
            color: INK_DIM,
          }}
        >
          A Rutt/Etra is an analog video synthesizer from the early 1970s. It reads each scanline's
          brightness as a vertical deflection on a CRT, turning a flat video signal into a 3D
          wireframe relief: bright pixels stand up, dark pixels stay flat. These knobs shape that
          displacement.
        </div>
      )}

      <div ref={ref} />
    </div>
  );
}
