import type { Camera } from "../sources/types";
import { selectedCamId, thumbnails } from "../store";
import { ACCENT, ACCENT_LINE, ACCENT_SOFT, INK, INK_DIM, RADIUS } from "./tokens";

const HOVER_BG = "rgba(255, 255, 255, 0.05)";

export function CameraListItem({ cam }: { cam: Camera }) {
  const isSelected = selectedCamId.value === cam.id;
  const thumb = thumbnails.value[cam.id] ?? cam.thumbnail;
  return (
    <div
      class="ctl-focusable"
      role="button"
      aria-pressed={isSelected}
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
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = HOVER_BG;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = isSelected
          ? ACCENT_SOFT
          : "transparent";
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "5px 8px 5px 17px",
        background: isSelected ? ACCENT_SOFT : "transparent",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 120ms ease-out",
      }}
    >
      {/* Playhead caret: the selection marker, in place of a colored side-stripe. */}
      {isSelected && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 6,
            top: "50%",
            transform: "translateY(-50%)",
            color: ACCENT,
            fontSize: 8,
            lineHeight: 1,
          }}
        >
          ▶
        </span>
      )}
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
            outline: isSelected ? `1px solid ${ACCENT_LINE}` : "1px solid transparent",
            outlineOffset: -1,
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
            outline: isSelected ? `1px solid ${ACCENT_LINE}` : "1px solid transparent",
            outlineOffset: -1,
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
            color: isSelected ? INK : "inherit",
          }}
        >
          {cam.label}
        </span>
        {cam.location?.city && (
          <span
            style={{
              fontSize: 10,
              color: INK_DIM,
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
            color: INK_DIM,
            textDecoration: "none",
            fontSize: 12,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = ACCENT;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = INK_DIM;
          }}
        >
          ↗
        </a>
      )}
    </div>
  );
}
