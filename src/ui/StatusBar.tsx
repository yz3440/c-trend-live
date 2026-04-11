import { status } from "../store";

export function StatusBar() {
  return (
    <div
      style={{
        padding: "6px 12px",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(12, 12, 14, 0.95)",
        opacity: 0.65,
        font: "11px/1.4 monospace",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {status.value}
    </div>
  );
}
