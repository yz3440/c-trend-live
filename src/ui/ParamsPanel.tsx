import { useEffect, useRef } from "preact/hooks";
import { paramsMountEl } from "../store";

/**
 * The right grid cell that hosts the Tweakpane shader controls.
 *
 * Publishes its inner div into the store as a ref signal so main.ts can mount
 * a Tweakpane instance into it once on boot.
 */
export function ParamsPanel() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    paramsMountEl.value = ref.current;
    return () => {
      paramsMountEl.value = null;
    };
  }, []);

  return (
    <div
      style={{
        height: "100%",
        background: "rgba(12, 12, 14, 0.95)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
        color: "rgba(255, 255, 255, 0.9)",
        font: "12px/1.4 -apple-system, system-ui, sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 10px 6px",
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          opacity: 0.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        Rutt/Etra
      </div>
      <div ref={ref} />
    </div>
  );
}
