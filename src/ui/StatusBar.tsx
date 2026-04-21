import { useEffect, useState } from "preact/hooks";
import { status } from "../store";
import {
  midiAvailable,
  midiLastMessageAt,
  midiLearning,
  midiMapping,
  midiStatusMessage,
} from "../midi";
import { ACCENT, FONT_MONO_SMALL } from "./tokens";

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

export function StatusBar() {
  const pulse = useMidiPulse();
  const deviceConnected = midiMapping.value.deviceId !== null;
  const learning = midiLearning.value;
  const available = midiAvailable.value;

  const dotColor = pulse
    ? ACCENT
    : deviceConnected
    ? "rgba(0, 255, 136, 0.55)"
    : "rgba(255, 255, 255, 0.2)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 12px",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(12, 12, 14, 0.95)",
        color: "rgba(255, 255, 255, 0.5)",
        font: FONT_MONO_SMALL,
      }}
    >
      <span
        style={{
          flex: "1 1 auto",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {midiStatusMessage.value ?? status.value}
      </span>
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
