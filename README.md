# C-Trend Live

**A browser VJ rig for the world's webcams — sculpted the way Vasulka
did it in 1974.**

Pick any live EarthCam — a Druif Beach sunset, 3 AM Times Square, a
Botswana waterhole. Run it through a GPU Rutt/Etra, the same
luminance-to-3D-wireframe move Woody Vasulka pulled on his CRT in
*C-Trend*. Play it like a synth — forty-odd parameters, MIDI-learnable,
keys and mouse too.

A cover, not a replica. See [LIT.md](LIT.md) for the lineage.

## Run

```bash
npm install && npm run dev
```

Opens a clean stage at `http://localhost:3000`.

## Keys

| Key   | Action                  |
| ----- | ----------------------- |
| `Tab` | Peek / hide the panels  |
| `Esc` | Return to the stage     |
| `M`   | Toggle MIDI learn       |

MIDI learn: press `M`, touch a Tweakpane knob, wiggle a CC — binding
persists across sessions.

## Credits

After Woody Vasulka, Steina Vasulka, Steve Rutt, and Bill Etra. Built
with Three.js, Preact, Tweakpane, postprocessing, and hls.js.
