// Preload — exposes a minimal Syphon publishing bridge to the renderer as
// window.syphon. Its mere presence is also the desktop-capability signal the
// renderer feature-gates on (see src/store.ts `hasSyphon`).
//
// IMPORTANT: the native node-syphon module is loaded in the MAIN process (see
// main.cjs), NOT here. Native modules are unreliable in the renderer/preload
// process even with sandbox:false, which previously left window.syphon
// undefined and the Output folder missing. The preload now only forwards frames
// to main over IPC, so it has no native dependency and is always exposed.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("syphon", {
  available: true,

  // pixels: tightly-packed RGBA (length === width*height*4), bottom-up as
  // produced by gl.readPixels. Forwarded to main, which publishes flipped:true.
  publish(pixels, width, height) {
    ipcRenderer.send("syphon:frame", pixels, width, height);
  },

  stop() {
    ipcRenderer.send("syphon:stop");
  },
});
