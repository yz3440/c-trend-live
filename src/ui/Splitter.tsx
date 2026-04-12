import { useEffect, useRef } from "preact/hooks";
import type { Signal } from "@preact/signals";

interface SplitterProps {
  /** Signal holding the px width of the panel this splitter resizes. */
  width: Signal<number>;
  /** Which side the resizable panel sits on, relative to the splitter. */
  side: "left" | "right";
  min?: number;
  max?: number;
}

/**
 * Vertical drag handle for resizing a flanking grid column.
 *
 * Lives between two grid cells; on pointerdown it captures the pointer and
 * updates the bound width signal as the user drags. The grid template columns
 * in AppLayout reads from these same signals so the layout reflows live.
 */
export function Splitter({ width, side, min = 160, max = 600 }: SplitterProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startW = 0;
    let dragging = false;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startW = width.value;
      el.setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const next = side === "left" ? startW + dx : startW - dx;
      width.value = Math.max(min, Math.min(max, next));
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(e.pointerId);
      document.body.style.cursor = "";
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [width, side, min, max]);

  return (
    <div
      ref={ref}
      style={{
        width: 6,
        height: "100%",
        background: "rgba(255, 255, 255, 0.06)",
        cursor: "col-resize",
        userSelect: "none",
        touchAction: "none",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 255, 255, 0.06)";
      }}
    />
  );
}
