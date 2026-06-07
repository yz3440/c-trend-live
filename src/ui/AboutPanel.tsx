import { useLayoutEffect, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { ACCENT, FONT_MONO, HAIRLINE, HAIRLINE_STRONG, INK, INK_DIM } from "./tokens";

const LIVE_URL = "https://c-trend-live.yufeng.place/";
const REPO_URL = "https://github.com/yz3440/c-trend-live";
const EARTHCAM_URL = "https://www.earthcam.com/";
const RUTT_ETRA_URL = "https://en.wikipedia.org/wiki/Rutt/Etra_Video_Synthesizer";
const VASULKA_URL = "https://www.fondation-langlois.org/html/e/page.php?NumPage=478";
const RTP_URL = "https://rtp.media.mit.edu/";
const ZACH_URL = "https://zach.li/";
const DEPARTURE_URL = "https://www.departuremono.com/";

const para: JSX.CSSProperties = {
  margin: "0 0 12px",
  fontFamily: FONT_MONO,
  fontSize: 12,
  lineHeight: 1.65,
  color: INK,
  textWrap: "pretty",
};

function ExtLink({ href, children }: { href: string; children: JSX.Element | string }) {
  return (
    <a
      class="ctl-focusable"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: ACCENT,
        textDecoration: "none",
        borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
      }}
    >
      {children}
    </a>
  );
}

function Key({ label, action }: { label: string; action: string }) {
  return (
    <>
      <kbd
        style={{
          justifySelf: "start",
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: INK,
          padding: "2px 7px",
          borderRadius: 4,
          border: `1px solid ${HAIRLINE_STRONG}`,
          background: "rgba(0,0,0,0.35)",
          lineHeight: 1.3,
        }}
      >
        {label}
      </kbd>
      <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_DIM, alignSelf: "center" }}>
        {action}
      </span>
    </>
  );
}

/**
 * The about writeup, rendered as the sidebar's scrolling body in place of the
 * camera list. Kept short: two lines and a handful of links. The nameplate
 * above provides the title and the back toggle, so this is pure content. When
 * it becomes the active layer it resets to the top and takes focus.
 */
export function AboutPanel({ active }: { active: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    el.focus({ preventScroll: true });
  }, [active]);

  return (
    <div
      ref={scrollRef}
      tabIndex={-1}
      style={{ flex: 1, minHeight: 0, overflowY: "auto", outline: "none", padding: "14px 14px 20px" }}
    >
      <p style={para}>
        A browser VJ rig for the world's webcams. It runs a live{" "}
        <ExtLink href={EARTHCAM_URL}>EarthCam</ExtLink> feed through a GPU{" "}
        <ExtLink href={RUTT_ETRA_URL}>Rutt/Etra</ExtLink> synthesizer, rebuilding each frame's
        brightness as a 3D wireframe, after Woody Vasulka's{" "}
        <ExtLink href={VASULKA_URL}>C-Trend</ExtLink> (1974).
      </p>
      <p style={para}>
        Made for <ExtLink href={RTP_URL}>Recreating the Past</ExtLink> at the MIT Media Lab, taught
        by <ExtLink href={ZACH_URL}>Zach Lieberman</ExtLink>.
      </p>
      <p style={{ ...para, fontSize: 11, color: INK_DIM, marginBottom: 16 }}>
        Set in <ExtLink href={DEPARTURE_URL}>Departure Mono</ExtLink> by Helena Zhang, used under the{" "}
        SIL Open Font License.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 18px",
          paddingTop: 14,
          borderTop: `1px solid ${HAIRLINE}`,
          fontFamily: FONT_MONO,
          fontSize: 12,
        }}
      >
        <ExtLink href={LIVE_URL}>↗ Live site</ExtLink>
        <ExtLink href={REPO_URL}>↗ Source</ExtLink>
      </div>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}` }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.04em",
            color: ACCENT,
            marginBottom: 10,
          }}
        >
          // keys
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            rowGap: 8,
            columnGap: 12,
            alignItems: "center",
          }}
        >
          <Key label="Tab" action="peek / hide the panels" />
          <Key label="Esc" action="back to the stage" />
          <Key label="M" action="toggle MIDI learn" />
        </div>
      </div>
    </div>
  );
}
