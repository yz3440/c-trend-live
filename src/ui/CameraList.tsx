import { visibleCameras, activeSrcId, sourceStatus, sourceError } from "../store";
import { CameraListItem } from "./CameraListItem";

export function CameraList() {
  const cams = visibleCameras.value;
  const sid = activeSrcId.value;
  const status = sid ? sourceStatus.value[sid] : undefined;
  const err = sid ? sourceError.value[sid] : undefined;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "4px 0",
      }}
    >
      {status === "loading" && (
        <div style={{ padding: 10, opacity: 0.6 }}>Loading…</div>
      )}
      {status === "error" && (
        <div style={{ padding: 10, color: "#ff6b6b" }}>
          {err ?? "Failed to load source"}
        </div>
      )}
      {status === "ready" && cams.length === 0 && (
        <div style={{ padding: 10, opacity: 0.5 }}>No cameras match.</div>
      )}
      {cams.map((c) => (
        <CameraListItem key={`${c.sourceId}:${c.id}`} cam={c} />
      ))}
    </div>
  );
}
