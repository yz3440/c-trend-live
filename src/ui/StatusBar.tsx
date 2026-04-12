import { status } from "../store";
import { FONT_MONO_SMALL } from "./tokens";

export function StatusBar() {
  return (
    <div
      style={{
        padding: "6px 12px",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(12, 12, 14, 0.95)",
        color: "rgba(255, 255, 255, 0.5)",
        font: FONT_MONO_SMALL,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {status.value}
    </div>
  );
}
