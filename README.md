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

## Keys

| Key   | Action                 |
| ----- | ---------------------- |
| `Tab` | Peek / hide the panels |
| `Esc` | Return to the stage    |
| `M`   | Toggle MIDI learn      |

MIDI learn: press `M`, touch a Tweakpane knob, wiggle a CC — binding persists across sessions.

Made for [Recreating the Past](https://rtp.media.mit.edu/) at the MIT Media Lab, taught by Zach Lieberman.

## Tech stack

Three.js, Preact, Tweakpane, postprocessing, hls.js.
