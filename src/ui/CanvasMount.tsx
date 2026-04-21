import { useEffect, useRef } from "preact/hooks";
import { canvasMountEl, videoPreviewMountEl, stageMode } from "../store";
import { LocalTime } from "./LocalTime";

/**
 * The center grid cell that hosts the Three.js canvas + the small video preview.
 *
 * Two refs are published into the store as signals. main.ts watches them via
 * effect() and attaches the renderer's canvas + video element when they appear.
 */
export function CanvasMount() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    canvasMountEl.value = canvasRef.current;
    videoPreviewMountEl.value = previewRef.current;
    return () => {
      canvasMountEl.value = null;
      videoPreviewMountEl.value = null;
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",
        overflow: "hidden",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 5,
          pointerEvents: "none",
          display: stageMode.value ? "none" : "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div ref={previewRef} />
        <LocalTime />
      </div>
    </div>
  );
}
