import { leftPanelWidth, rightPanelWidth, presentMode } from "../store";
import { Sidebar } from "./Sidebar";
import { Splitter } from "./Splitter";
import { CanvasMount } from "./CanvasMount";
import { ParamsPanel } from "./ParamsPanel";
import { StatusBar } from "./StatusBar";
import { FONT_BASE, FONT_SMALL, RADIUS, BLUR } from "./tokens";

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
 */
export function AppLayout() {
  const lw = leftPanelWidth.value;
  const rw = rightPanelWidth.value;
  const present = presentMode.value;

  // Present mode: collapse the side columns and the splitter tracks to 0,
  // hide StatusBar, and overlay an exit button. Sidebar/ParamsPanel already
  // use overflow: hidden so they hide cleanly when their tracks are zero.
  const cols = present ? "0 0 1fr 0 0" : `${lw}px 6px 1fr 6px ${rw}px`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateRows: present ? "1fr" : "1fr auto",
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
        {present ? <div /> : <Splitter width={leftPanelWidth} side="left" min={200} max={500} />}
        <CanvasMount />
        {present ? <div /> : <Splitter width={rightPanelWidth} side="right" min={200} max={500} />}
        <ParamsPanel />
        {present && (
          <button
            onClick={() => {
              presentMode.value = false;
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
            title="Exit present mode (Esc or P)"
          >
            Show UI · Esc
          </button>
        )}
      </div>
      {!present && <StatusBar />}
    </div>
  );
}
