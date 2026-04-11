import Hls from "hls.js";

const STREAM_ORIGIN = "https://videos-3.earthcam.com";

/**
 * Rewrite an absolute EarthCam stream URL to go through our local proxy,
 * so the server sees earthcam.com as the Referer/Origin.
 */
export function proxyStreamUrl(url: string): string {
  if (url.startsWith(STREAM_ORIGIN)) {
    return "/api/stream" + url.slice(STREAM_ORIGIN.length);
  }
  return url;
}

/**
 * Create a video element playing an HLS stream.
 *
 * The element is returned but NOT attached to the DOM. main.ts mounts it into
 * the canvas grid cell via the videoPreviewMountEl signal so it sits inside
 * the canvas area instead of overlapping the sidebar.
 *
 * Returns a promise that resolves when playback has started.
 */
export async function createHlsVideo(hlsUrl: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.cssText = `
    display: block;
    width: 220px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 4px;
    pointer-events: none;
  `;

  return new Promise((resolve, reject) => {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr, url) => {
          const proxied = proxyStreamUrl(url);
          if (proxied !== url) {
            xhr.open("GET", proxied, true);
          }
        },
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => resolve(video)).catch(reject);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          hls.destroy();
          reject(new Error(`HLS error: ${data.type} - ${data.details}`));
        }
      });

      (video as any)._hls = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().then(() => resolve(video)).catch(reject);
      });
      video.addEventListener("error", () => {
        reject(new Error("Video element error"));
      });
    } else {
      reject(new Error("HLS is not supported in this browser"));
    }
  });
}

/**
 * Clean up a video element created by createHlsVideo.
 */
export function destroyHlsVideo(video: HTMLVideoElement): void {
  const hls = (video as any)._hls as Hls | undefined;
  if (hls) {
    hls.destroy();
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.remove();
}
