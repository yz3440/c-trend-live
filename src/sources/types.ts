export type StreamType = "hls" | "mp4" | "mjpeg" | "youtube" | "snapshot";

export interface Camera {
  id: string;
  sourceId: string;
  label: string;
  location?: { lat?: number; lon?: number; city?: string; country?: string };
  /** IANA timezone identifier (e.g. "America/New_York") for local-time display. */
  timezone?: string;
  thumbnail?: string;
  streamType: StreamType;
  streamUrl?: string;
  /** Optional human-facing URL (e.g. the source's page for this camera). */
  pageUrl?: string;
}

export interface Source {
  id: string;
  label: string;
  listCameras(): Promise<Camera[]>;
  resolveStream?(cam: Camera): Promise<string>;
}
