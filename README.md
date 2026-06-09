# C-Trend Live

A browser VJ rig for the world's webcams, inspired by the way Vasulka did it in 1974.

![Screenshot of C-Trend Live](./assets/c-trend-live-demo.gif)

Pick any live EarthCam — a Las Vegas welcome sign, 3 AM Times Square, a Botswana waterhole. Run it through a GPU Rutt/Etra synthesizer, the same luminance-to-3D-wireframe move Woody Vasulka pulled on his CRT in _[C-Trend](https://www.fondation-langlois.org/html/e/page.php?NumPage=478)_.

Play around with the parameters like a synth using MIDI controllers, keys and mouse too.

## Run

```bash
npm install && npm run dev
```

Opens a clean stage at `http://localhost:3000`.

## Desktop app (Syphon output)

A thin Electron wrapper adds **[Syphon](https://syphon.info/)** output on macOS, so the live render can be sent as a GPU video feed into Resolume, MadMapper, VDMX, TouchDesigner, and the like.

```bash
npm run electron:start   # builds the renderer, then launches the desktop app
```

In the right panel's **Output** folder, flip **Syphon Output** on — a source named `C-Trend Live` shows up in any Syphon client, carrying the live frame at the window's resolution. For development with hot reload, run `npm run dev` and `npm run electron:dev` in two terminals. To sanity-check a Syphon receiver with a test pattern, run `npm run electron:spike`.

**Download:** grab the latest `.dmg` from [Releases](https://github.com/yz3440/c-trend-live/releases). **Apple Silicon only** (M1 or newer). The build is unsigned, so on first launch macOS will block it — right-click the app → **Open** (then **Open** again), or run `xattr -dr com.apple.quarantine "/Applications/C-Trend Live.app"`.

The web build is unaffected: the Output control only appears under Electron (it keys off the preload's `window.syphon` bridge), and the desktop app reuses the same Express server (`server.js`) for the EarthCam proxy.

## Keys

| Key   | Action                 |
| ----- | ---------------------- |
| `Tab` | Peek / hide the panels |
| `Esc` | Return to the stage    |
| `M`   | Toggle MIDI learn      |

MIDI learn: press `M`, touch a Tweakpane knob, wiggle a CC — binding persists across sessions.

Made for [Recreating the Past](https://rtp.media.mit.edu/) at the MIT Media Lab, taught by Zach Lieberman.

## Tech stack

Three.js, Preact, Tweakpane, postprocessing, hls.js. Desktop build: Electron + node-syphon.
