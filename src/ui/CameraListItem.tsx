import type { Camera } from "../sources/types";
import { selectedCamId, thumbnails } from "../store";
import { RADIUS } from "./tokens";

export function CameraListItem({ cam }: { cam: Camera }) {
  const isSelected = selectedCamId.value === cam.id;
  const thumb = thumbnails.value[cam.id] ?? cam.thumbnail;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        selectedCamId.value = cam.id;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectedCamId.value = cam.id;
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "4px 8px",
        background: isSelected
          ? "rgba(0, 255, 136, 0.12)"
          : "transparent",
        borderLeft: isSelected
          ? "2px solid #00ff88"
          : "2px solid transparent",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          style={{
            width: 36,
            height: 24,
            objectFit: "cover",
            borderRadius: RADIUS,
            background: "#111",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 24,
            background: "#111",
            borderRadius: RADIUS,
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cam.label}
        </span>
        {cam.location?.city && (
          <span
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cam.location.city}
            {cam.location.country ? `, ${cam.location.country}` : ""}
          </span>
        )}
      </span>
      {cam.pageUrl && (
        <a
          href={cam.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open on EarthCam"
          aria-label="Open on EarthCam"
          onClick={(e) => e.stopPropagation()}
          style={{
            flexShrink: 0,
            padding: "2px 4px",
            color: "rgba(255, 255, 255, 0.45)",
            textDecoration: "none",
            fontSize: 12,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#00ff88";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255, 255, 255, 0.45)";
          }}
        >
          ↗
        </a>
      )}
    </div>
  );
}
