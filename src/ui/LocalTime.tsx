import { useEffect, useState, useMemo } from "preact/hooks";
import { selectedCamera } from "../store";

/**
 * Live local-time readout for the selected camera. Updates once per second.
 *
 * The cam's `timezone` is an IANA identifier (e.g. "America/New_York") set by
 * the source module. If absent we render nothing rather than misleadingly
 * showing the user's own local time.
 */
export function LocalTime() {
  const cam = selectedCamera.value;
  const tz = cam?.timezone;

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!tz) return;
    // Align the first tick to the next wall-clock second so the seconds field
    // updates in sync with real time instead of drifting by an arbitrary phase.
    const ms = 1000 - (Date.now() % 1000);
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 1000);
    }, ms);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [tz]);

  // Memo the formatter — Intl.DateTimeFormat construction is not free and we
  // would otherwise rebuild it every render (i.e. every second).
  const formatter = useMemo(() => {
    if (!tz) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      // Bad IANA id — fall through and render nothing rather than crash.
      return null;
    }
  }, [tz]);

  if (!cam || !tz || !formatter) return null;

  return (
    <div
      style={{
        marginTop: 6,
        padding: "4px 8px",
        background: "rgba(12, 12, 14, 0.55)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 3,
        font: "11px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        width: "fit-content",
        pointerEvents: "none",
      }}
      title={tz}
    >
      {formatter.format(now)}
    </div>
  );
}
