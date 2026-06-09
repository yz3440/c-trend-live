// Electron main process — the desktop shell around the existing web app.
//
// Networking is reused wholesale: in production we start the project's own
// Express server (server.js) on an ephemeral loopback port and point the window
// at it, so the renderer's relative /api/earthcam-resolve and /api/stream URLs
// resolve exactly as they do on the web — and the same-origin proxy keeps the
// canvas untainted, which the Syphon readback depends on. In dev we instead
// load the Vite dev server (ELECTRON_RENDERER_URL), which already serves those
// /api routes via its own middleware.
//
// Syphon: the native node-syphon module is loaded HERE in main (native modules
// are unreliable in the renderer). The preload (preload.cjs) forwards each RGBA
// frame over IPC; we publish it from this process.

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// ── Native Syphon, loaded in the main process ──────────────────────────────
const SERVER_NAME = "C-Trend Live";

let SyphonOpenGLServer = null;
try {
  ({ SyphonOpenGLServer } = require("node-syphon"));
} catch (err) {
  console.error("[main] node-syphon failed to load:", err);
}

// The preload forwards one RGBA frame per published tick over IPC. Each frame is
// structured-cloned across the process boundary (~w·h·4 bytes); fine at the
// renderer's fps cap, and the obvious place to optimise (shared memory /
// transferables) if higher output resolutions ever need it. The server is
// created lazily on the first frame and torn down on "syphon:stop".
let syServer = null;
let publishErrorLogged = false;

ipcMain.on("syphon:frame", (_event, pixels, width, height) => {
  if (!SyphonOpenGLServer) return;
  try {
    if (!syServer) syServer = new SyphonOpenGLServer(SERVER_NAME);
    // IPC may hand back a Uint8Array/Buffer view; publishImageData wants a Uint8ClampedArray.
    const data =
      pixels instanceof Uint8ClampedArray ? pixels : new Uint8ClampedArray(pixels.buffer || pixels);
    syServer.publishImageData(
      data,
      { x: 0, y: 0, width, height },
      { width, height },
      true, // gl.readPixels rows are bottom-up
      "GL_TEXTURE_2D"
    );
  } catch (err) {
    // Log once — a per-frame failure would otherwise flood the console.
    if (!publishErrorLogged) {
      console.error("[main] Syphon publish failed:", err);
      publishErrorLogged = true;
    }
  }
});

ipcMain.on("syphon:stop", () => {
  if (syServer) {
    syServer.dispose();
    syServer = null;
  }
});

let win = null;
let closeServer = null;

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // A failed preload or page load is otherwise silent — surface both.
  win.webContents.on("preload-error", (_e, preloadPath, error) => {
    console.error("[main] preload failed to load:", preloadPath, error);
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[main] failed to load ${url}: ${desc} (${code})`);
    if (process.env.ELECTRON_RENDERER_URL) {
      console.error("[main] In dev mode, run `npm run dev` (Vite on :3000) first.");
    }
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    // server.js is ESM; load it from this CommonJS module via dynamic import.
    const server = await import("../server.js");
    const { port, close } = await server.listen(0); // 0 = ephemeral, 127.0.0.1
    closeServer = close;
    await win.loadURL(`http://127.0.0.1:${port}`);
  }
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (syServer) syServer.dispose();
  if (closeServer) closeServer();
  if (process.platform !== "darwin") app.quit();
});
