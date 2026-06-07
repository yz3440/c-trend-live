import { leftPanelWidth, rightPanelWidth, stageMode } from "../store";
import { Sidebar } from "./Sidebar";
import { Splitter } from "./Splitter";
import { CanvasMount } from "./CanvasMount";
import { ParamsPanel } from "./ParamsPanel";
import { StatusBar } from "./StatusBar";
import { FONT_BASE } from "./tokens";

/**
 * The full-window grid:
 *
 *   +---------+--+----------------+--+----------+
 *   |         |  |                |  |          |
 *   | Sidebar |::|  CanvasMount   |::| Params   |
 *   |  cams   |::|  (3D scene)    |::| panel    |
 *   |         |  |                |  |          |
 *   +---------+--+----------------+--+----------+
 *   | StatusBar (full width, always present)     |
 *   +--------------------------------------------+
 *
 * The two `::` columns are draggable splitters bound to the leftPanelWidth /
 * rightPanelWidth signals. The center column is `1fr` so it absorbs everything
 * left over and stays the canvas's home.
 *
 * Stage mode (the default): side columns and splitter tracks collapse to 0 so
 * the canvas fills the window. The StatusBar stays put in both modes and holds
 * the panel toggle, so the controls are always one keystroke (Tab) or one click
 * away. Esc returns to the stage.
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
        gridTemplateRows: "1fr auto",
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
      </div>
      <StatusBar />
    </div>
  );
}
