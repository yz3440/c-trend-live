import { leftPanelWidth, rightPanelWidth, stageMode } from "../store";
import { Sidebar } from "./Sidebar";
import { Splitter } from "./Splitter";
import { CanvasMount } from "./CanvasMount";
import { ParamsPanel } from "./ParamsPanel";
import { StatusBar } from "./StatusBar";
import { FONT_BASE, FONT_SMALL, FONT_MONO_SMALL, RADIUS, BLUR } from "./tokens";

/**
 * The full-window grid:
 *
 *   +---------+--+----------------+--+----------+
 *   |         |  |                |  |          |
 *   | Sidebar |::|  CanvasMount   |::| Params   |
 *   |  cams   |::|  (3D scene)    |::| panel    |
 *   |         |  |                |  |          |
 *   +---------+--+----------------+--+----------+
 *   | StatusBar (full width)                     |
 *   +--------------------------------------------+
 *
 * The two `::` columns are draggable splitters bound to the leftPanelWidth /
 * rightPanelWidth signals. The center column is `1fr` so it absorbs everything
 * left over and stays the canvas's home.
 *
 * Stage mode (the default): side columns and splitter tracks collapse to 0,
 * StatusBar is hidden, and a small overlay exposes a peek button plus the
 * Vasulka credit line. Tab peeks the panels in; Esc returns to the stage.
 */
export function AppLayout() {
  const lw = leftPanelWidth.value;
  const rw = rightPanelWidth.value;
  const stage = stageMode.value;

  const cols = stage ? "0 0 1fr 0 0" : `${lw}px 6px 1fr 6px ${rw}px`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateRows: stage ? "1fr" : "1fr auto",
        gridTemplateColumns: "100%",
        background: "#000",
        color: "rgba(255, 255, 255, 0.9)",
        font: FONT_BASE,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gridTemplateRows: "100%",
          minHeight: 0,
          position: "relative",
        }}
      >
        <Sidebar />
        {stage ? <div /> : <Splitter width={leftPanelWidth} side="left" min={200} max={500} />}
        <CanvasMount />
        {stage ? <div /> : <Splitter width={rightPanelWidth} side="right" min={200} max={500} />}
        <ParamsPanel />
        {stage && (
          <>
            <button
              onClick={() => {
                stageMode.value = false;
              }}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                padding: "6px 10px",
                background: "rgba(12, 12, 14, 0.55)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                borderRadius: RADIUS,
                color: "rgba(255, 255, 255, 0.9)",
                font: FONT_SMALL,
                cursor: "pointer",
                backdropFilter: BLUR,
                WebkitBackdropFilter: BLUR,
              }}
              title="Peek UI (Tab)"
            >
              Peek · Tab
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 10,
                right: 14,
                zIndex: 10,
                font: FONT_MONO_SMALL,
                color: "rgba(255, 255, 255, 0.4)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              C-Trend Live &nbsp;·&nbsp; after Vasulka, 1974
            </div>
          </>
        )}
      </div>
      {!stage && <StatusBar />}
    </div>
  );
}
