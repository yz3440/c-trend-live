// Step 0 de-risk spike — standalone, NOT part of the app.
//
// Publishes an animated test pattern to a Syphon server named "spike" so you
// can confirm node-syphon works end to end in a real Syphon client (Syphon
// Recorder, or a Syphon input in Resolume / MadMapper / VDMX / TouchDesigner).
//
// The native binding itself is already validated (it loads + publishes in plain
// node), so this is purely the human-in-the-loop visual check: colour order and
// orientation.
//
// Run:  npx electron electron/spike.cjs
// Expect in the client: a 256×256 frame with a GREEN bar across the TOP, RED on
// the LEFT fading to BLUE on the RIGHT, and a white vertical stripe sweeping
// left→right. If colours are swapped you have a channel-order problem; if it's
// upside down the GL path will need flipped:true (which the real app uses).

const { app, BrowserWindow } = require("electron");
const { SyphonOpenGLServer } = require("node-syphon");

const W = 256;
const H = 256;

// Author the buffer top-down (row 0 = top), so we publish it flipped:false.
function makePattern(t) {
  const buf = new Uint8ClampedArray(W * H * 4);
  const stripeX = Math.floor((t * 0.08) % W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      buf[i] = Math.round((1 - x / W) * 255); // R: bright on the left
      buf[i + 1] = y < H / 8 ? 255 : 0; // G: bar across the top
      buf[i + 2] = Math.round((x / W) * 255); // B: bright on the right
      if (Math.abs(x - stripeX) < 2) buf[i] = buf[i + 1] = buf[i + 2] = 255;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

let server = null;
let timer = null;

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 440, height: 200, title: "Syphon spike" });
  win.loadURL(
    "data:text/html," +
      encodeURIComponent(
        `<body style="margin:0;background:#111;color:#ddd;font:13px ui-monospace,monospace;padding:16px">
         Publishing Syphon server <b>"spike"</b>.<br><br>
         Open a Syphon client and look for it. Expect: green bar on top, red→blue
         left→right, a white stripe sweeping across. Close this window to stop.</body>`
      )
  );

  server = new SyphonOpenGLServer("spike");
  let t = 0;
  timer = setInterval(() => {
    t += 33;
    server.publishImageData(
      makePattern(t),
      { x: 0, y: 0, width: W, height: H },
      { width: W, height: H },
      false, // buffer is authored top-down
      "GL_TEXTURE_2D"
    );
  }, 33);
});

app.on("window-all-closed", () => {
  if (timer) clearInterval(timer);
  if (server) server.dispose();
  app.quit();
});
