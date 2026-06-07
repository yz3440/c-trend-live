import { useLayoutEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { SearchBox } from "./SearchBox";
import { CameraList } from "./CameraList";
import { AboutPanel } from "./AboutPanel";
import { aboutOpen } from "../store";
import { ACCENT, FONT_MONO, HAIRLINE, INK, INK_DIM, PANEL_BG } from "./tokens";

/**
 * One cross-fade layer in the sidebar body. Both layers stay mounted so the
 * transition fires and the camera list keeps its scroll position; the inactive
 * one is made `inert` (out of tab order + the a11y tree) without `display:none`
 * so the opacity fade still runs.
 */
function Layer({
  active,
  enterFrom,
  children,
}: {
  active: boolean;
  enterFrom: "left" | "right";
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.inert = !active;
  }, [active]);

  const offset = enterFrom === "right" ? "10px" : "-10px";
  return (
    <div
      ref={ref}
      class="ctl-view"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        opacity: active ? 1 : 0,
        transform: active ? "translateX(0)" : `translateX(${offset})`,
        transition: "opacity 200ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Left grid cell: a plain instrument nameplate over a body that cross-fades
 * between the camera list and the about writeup. The nameplate's right-hand
 * control is the toggle between the two (and the back out of about).
 *
 * EarthCam is the only source, so source tabs are omitted.
 */
export function Sidebar() {
  const about = aboutOpen.value;

  return (
    <aside
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PANEL_BG,
        borderRight: `1px solid ${HAIRLINE}`,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <header
        style={{
          padding: "11px 12px 10px",
          borderBottom: `1px solid ${HAIRLINE}`,
          fontFamily: FONT_MONO,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: INK,
              whiteSpace: "nowrap",
            }}
          >
            C-Trend Live
          </span>
          <button
            class="ctl-focusable"
            type="button"
            onClick={() => {
              aboutOpen.value = !about;
            }}
            aria-expanded={about}
            style={{
              appearance: "none",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: INK_DIM,
              transition: "color 140ms ease-out",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = ACCENT;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = INK_DIM;
            }}
          >
            {about ? "← cameras" : "about"}
          </button>
        </div>
      </header>

      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Layer active={!about} enterFrom="left">
          <SearchBox />
          <CameraList />
        </Layer>
        <Layer active={about} enterFrom="right">
          <AboutPanel active={about} />
        </Layer>
      </div>
    </aside>
  );
}
