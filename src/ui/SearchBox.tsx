import { search } from "../store";
import { HAIRLINE_STRONG, INK, RADIUS } from "./tokens";

export function SearchBox() {
  return (
    <div style={{ padding: "8px 10px 6px" }}>
      <input
        class="ctl-search ctl-focusable"
        type="search"
        value={search.value}
        placeholder="Search cameras…"
        aria-label="Search cameras"
        onInput={(e) => {
          search.value = (e.currentTarget as HTMLInputElement).value;
        }}
        style={{
          width: "100%",
          padding: "6px 9px",
          background: "rgba(0, 0, 0, 0.35)",
          border: `1px solid ${HAIRLINE_STRONG}`,
          borderRadius: RADIUS,
          color: INK,
          font: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}
