// Ambient type for the Syphon bridge the Electron preload injects as
// window.syphon. Undefined in the web build — its presence gates the desktop-
// only Syphon output feature (see store.ts `hasSyphon`).
export {};

declare global {
  interface Window {
    syphon?: {
      readonly available: true;
      /** Publish one RGBA frame (length === width*height*4) to Syphon. */
      publish(pixels: Uint8ClampedArray, width: number, height: number): void;
      /** Tear down the native server so the source disappears from clients. */
      stop(): void;
    };
  }
}
