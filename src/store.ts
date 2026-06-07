import { signal, computed } from "@preact/signals";
import type { Camera, Source } from "./sources/types";
import { DEFAULT_BLOOM, DEFAULT_PARAMS, type BloomParams, type RuttEtraParams } from "./types";
import type { ParamId } from "./params-registry";

export type SourceStatus = "idle" | "loading" | "ready" | "error";

export const sources = signal<Source[]>([]);
export const camerasBySrc = signal<Record<string, Camera[]>>({});
export const sourceStatus = signal<Record<string, SourceStatus>>({});
export const sourceError = signal<Record<string, string | undefined>>({});

export const activeSrcId = signal<string | null>(null);
export const selectedCamId = signal<string | null>(null);
export const search = signal<string>("");

// Cached camera thumbnails (camId → data URL), captured the first time a cam
// plays. EarthCam doesn't expose a public per-cam still endpoint, so we sample
// the live HLS frame ourselves and persist it across sessions in localStorage.
const THUMB_STORAGE_KEY = "earth-cam-synth:thumbs:v1";
function loadThumbs(): Record<string, string> {
  try {
    const raw = localStorage.getItem(THUMB_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
export const thumbnails = signal<Record<string, string>>(loadThumbs());

export function setThumbnail(camId: string, dataUrl: string): void {
  thumbnails.value = { ...thumbnails.value, [camId]: dataUrl };
  try {
    localStorage.setItem(THUMB_STORAGE_KEY, JSON.stringify(thumbnails.value));
  } catch {
    // localStorage may be full / disabled — non-fatal, the in-memory cache still works.
  }
}

export const params = signal<RuttEtraParams>({ ...DEFAULT_PARAMS });
export const status = signal<string>("Ready");

// Bloom, tone mapping, and orbit controls used to be mutated directly from
// Tweakpane callbacks — which meant nothing else (e.g. MIDI) could drive them
// without the Tweakpane slider falling out of sync. Lifting them into signals
// makes every driver (UI, MIDI, future automation) equal citizens: the signal
// is the source of truth, Tweakpane and the renderer both listen via effect().
export const bloomParams = signal<BloomParams>({ ...DEFAULT_BLOOM });
export type ToneMappingMode = "off" | "aces";
export const toneMappingMode = signal<ToneMappingMode>("aces");
export const cameraAutoRotate = signal<boolean>(true);
export const cameraAutoRotateSpeed = signal<number>(0.1);

// The last Tweakpane control the user interacted with. MIDI learn reads this
// to know which parameter to bind when an incoming CC/note arrives. Cleared
// after a bind completes.
export const lastTouchedParamId = signal<ParamId | null>(null);

// Stage mode — when true (the default), AppLayout collapses sidebar/params/
// statusbar so the canvas fills the window as a clean stage. There is no
// Browse/Perform mode switch: this is the only "mode," and it's just about
// whether the panels are visible. Toggled by the Tab key (peek), Escape (back
// to stage), the Tweakpane trigger, and the floating stage-overlay button.
export const stageMode = signal<boolean>(true);

// About-view visibility. When true, the sidebar body swaps the camera list for
// the about writeup. Opened from the sidebar nameplate toggle or the status-bar
// "about" (which also un-collapses the panels); closed by the toggle or Escape.
export const aboutOpen = signal<boolean>(false);

// Grid layout — column widths in px. Reactive so the splitter can drag them.
export const leftPanelWidth = signal<number>(280);
export const rightPanelWidth = signal<number>(260);

// DOM mount points exposed by Preact components for main.ts to attach to.
// main.ts subscribes via effect() and mounts Three.js canvas / Tweakpane / video
// preview when these refs become non-null, and tears down when they go null.
export const canvasMountEl = signal<HTMLElement | null>(null);
export const paramsMountEl = signal<HTMLElement | null>(null);
export const videoPreviewMountEl = signal<HTMLElement | null>(null);

export const visibleCameras = computed<Camera[]>(() => {
  const sid = activeSrcId.value;
  if (!sid) return [];
  const list = camerasBySrc.value[sid] ?? [];
  const q = search.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter((c) => {
    if (c.label.toLowerCase().includes(q)) return true;
    const city = c.location?.city?.toLowerCase();
    if (city && city.includes(q)) return true;
    const country = c.location?.country?.toLowerCase();
    if (country && country.includes(q)) return true;
    return false;
  });
});

export const selectedCamera = computed<Camera | null>(() => {
  const id = selectedCamId.value;
  if (!id) return null;
  for (const list of Object.values(camerasBySrc.value)) {
    const hit = list.find((c) => c.id === id);
    if (hit) return hit;
  }
  return null;
});

/**
 * Set a single shader parameter without replacing the whole params object
 * (still triggers signal subscribers because we shallow-clone).
 */
export function setParam<K extends keyof RuttEtraParams>(
  name: K,
  value: RuttEtraParams[K]
): void {
  params.value = { ...params.value, [name]: value };
}

/**
 * Replace the camera list for a source and update its status to "ready".
 */
export function setCameras(sourceId: string, cams: Camera[]): void {
  camerasBySrc.value = { ...camerasBySrc.value, [sourceId]: cams };
  sourceStatus.value = { ...sourceStatus.value, [sourceId]: "ready" };
  sourceError.value = { ...sourceError.value, [sourceId]: undefined };
}

export function setSourceStatus(
  sourceId: string,
  s: SourceStatus,
  err?: string
): void {
  sourceStatus.value = { ...sourceStatus.value, [sourceId]: s };
  if (err !== undefined) {
    sourceError.value = { ...sourceError.value, [sourceId]: err };
  }
}
