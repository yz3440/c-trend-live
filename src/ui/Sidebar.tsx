import { SearchBox } from "./SearchBox";
import { CameraList } from "./CameraList";

/**
 * Left grid cell. Hosts the brand title, search box, and camera list.
 * Earth Cam is the only source, so source tabs are omitted.
 */
export function Sidebar() {
  return (
    <aside
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(12, 12, 14, 0.95)",
        borderRight: "1px solid rgba(255, 255, 255, 0.06)",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: "12px 12px 10px",
          fontSize: 12,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          fontWeight: 600,
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        Earth Cam Synth
      </div>
      <SearchBox />
      <CameraList />
    </aside>
  );
}
