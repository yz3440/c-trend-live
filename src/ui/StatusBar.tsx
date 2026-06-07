import { useEffect, useState } from "preact/hooks";
import { aboutOpen, stageMode, status } from "../store";
import {
  midiAvailable,
  midiLastMessageAt,
  midiLearning,
  midiMapping,
  midiStatusMessage,
} from "../midi";
import { ACCENT, FONT_MONO_SMALL, HAIRLINE, INK_DIM, INK_FAINT, PANEL_BG } from "./tokens";

/**
 * Transient glow: returns true briefly after a MIDI message arrives so the
 * indicator dot can flash. We can't read a timestamp signal inside inline
 * styles reactively without also re-rendering on a timer, so we key off a
 * local boolean driven by a setTimeout.
 */
function useMidiPulse(): boolean {
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const dispose = midiLastMessageAt.subscribe(() => {
      setPulsing(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setPulsing(false), 120);
    });
    return () => {
      dispose();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return pulsing;
}

/** A bare text control sized to the status bar; brightens to accent on hover. */
function BarButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      class="ctl-focusable"
      type="button"
      title={title}
      onClick={onClick}
      style={{
        appearance: "none",
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: "pointer",
        font: "inherit",
        color: INK_DIM,
        whiteSpace: "nowrap",
        flex: "0 0 auto",
        transition: "color 140ms ease-out",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = ACCENT;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = INK_DIM;
      }}
    >
      {label}
    </button>
  );
}

/**
 * Full-width footer, present in every mode (including the clean stage) so the
 * panels are always one keystroke away. Left: the live status line. Right: the
 * about entry, the panel toggle (mirrors the Tab key), and MIDI state.
 */
export function StatusBar() {
  const pulse = useMidiPulse();
  const stage = stageMode.value;
  const deviceConnected = midiMapping.value.deviceId !== null;
  const learning = midiLearning.value;
  const available = midiAvailable.value;

  const dotColor = pulse
    ? ACCENT
    : deviceConnected
    ? "rgba(255, 255, 255, 0.55)"
    : INK_FAINT;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "6px 12px",
        borderTop: `1px solid ${HAIRLINE}`,
        background: PANEL_BG,
        color: INK_DIM,
        font: FONT_MONO_SMALL,
      }}
    >
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {midiStatusMessage.value ?? status.value}
      </span>

      <BarButton
        label="about"
        title="About C-Trend Live"
        onClick={() => {
          stageMode.value = false;
          aboutOpen.value = true;
        }}
      />
      <BarButton
        label={`Tab to ${stage ? "show" : "hide"} panels`}
        title="Toggle panels (Tab)"
        onClick={() => {
          if (stage) {
            stageMode.value = false;
          } else {
            stageMode.value = true;
            aboutOpen.value = false;
          }
        }}
      />

      {learning && (
        <span
          style={{
            color: ACCENT,
            border: `1px solid ${ACCENT}`,
            borderRadius: 2,
            padding: "1px 5px",
            letterSpacing: "0.05em",
            flex: "0 0 auto",
          }}
        >
          LEARN
        </span>
      )}
      {available && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            flex: "0 0 auto",
          }}
          title={deviceConnected ? "MIDI device connected" : "No MIDI device selected"}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              transition: "background 120ms ease-out",
            }}
          />
          MIDI
        </span>
      )}
    </div>
  );
}
