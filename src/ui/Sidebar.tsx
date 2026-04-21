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
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          C-Trend Live
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 10,
            letterSpacing: 0.4,
            color: "rgba(255, 255, 255, 0.45)",
            fontStyle: "italic",
          }}
        >
          after Vasulka's C-Trend, 1974
        </div>
      </div>
      <SearchBox />
      <CameraList />
    </aside>
  );
}
