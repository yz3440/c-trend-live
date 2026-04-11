import { search } from "../store";

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
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 4,
          color: "inherit",
          font: "inherit",
          outline: "none",
        }}
      />
    </div>
  );
}
