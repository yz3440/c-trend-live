import type { Camera, Source } from "../sources/types";
import { createHlsVideo, destroyHlsVideo } from "./hls";

export interface PlayerHandle {
  /** The element to feed into RuttEtra (currently always an HTMLVideoElement). */
  video: HTMLVideoElement;
  /** Tear down everything (DOM nodes, hls.js instance, image refresh timers). */
  destroy: () => void;
}

/**
 * Create a player for a camera. Dispatches by streamType.
 *
 * Today only `hls` is wired (used by EarthCam). `mp4`/`mjpeg`/`snapshot`/`youtube`
 * will land when their source modules do — see plan
 * /Users/yfz/.claude/plans/reactive-splashing-boot.md.
 */
export async function createPlayer(
  cam: Camera,
  source: Source
): Promise<PlayerHandle> {
  let url = cam.streamUrl;
  if (!url && source.resolveStream) {
    url = await source.resolveStream(cam);
  }
  if (!url) {
    throw new Error(`No stream URL for camera ${cam.id}`);
  }

  switch (cam.streamType) {
    case "hls": {
      const video = await createHlsVideo(url);
      return { video, destroy: () => destroyHlsVideo(video) };
    }
    case "mp4":
    case "mjpeg":
    case "snapshot":
    case "youtube":
      throw new Error(
        `streamType "${cam.streamType}" is not yet implemented (planned for follow-up)`
      );
  }
}
