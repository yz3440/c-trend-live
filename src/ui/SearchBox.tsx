import { search } from "../store";
import { RADIUS } from "./tokens";

export function SearchBox() {
  return (
    <div style={{ padding: "8px 10px 6px" }}>
      <input
        type="search"
        value={search.value}
        placeholder="Search cameras…"
        onInput={(e) => {
          search.value = (e.currentTarget as HTMLInputElement).value;
        }}
        style={{
          width: "100%",
          padding: "6px 8px",
          background: "rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          borderRadius: RADIUS,
          color: "inherit",
          font: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}
