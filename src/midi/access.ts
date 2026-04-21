/**
 * WebMIDI permission + device enumeration. Kept separate from the engine so
 * the engine can unit-test against any MIDIInput-shaped source if needed, and
 * so a lack of WebMIDI support (Safari) degrades to a no-op gracefully.
 */
import { midiAvailable, midiInputs } from "./store";

type InputDescription = { id: string; name: string };

let access: MIDIAccess | null = null;
let listeners: Array<(inputs: readonly InputDescription[]) => void> = [];

function describe(input: MIDIInput): InputDescription {
  // Some drivers report an empty name — fall back to manufacturer / id.
  const name = input.name || input.manufacturer || input.id || "MIDI Input";
  return { id: input.id, name };
}

function publishInputs(): void {
  if (!access) {
    midiInputs.value = [];
    return;
  }
  const list: InputDescription[] = [];
  access.inputs.forEach((input) => {
    list.push(describe(input));
  });
  midiInputs.value = list;
  for (const fn of listeners) fn(list);
}

/**
 * Ask the browser for MIDI access. Safe to call multiple times — it reuses
 * the first granted access. Returns false if WebMIDI is unsupported or the
 * user denied permission.
 */
export async function requestAccess(): Promise<boolean> {
  if (access) return true;
  if (typeof navigator === "undefined" || typeof navigator.requestMIDIAccess !== "function") {
    midiAvailable.value = false;
    return false;
  }
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
  } catch {
    midiAvailable.value = false;
    return false;
  }
  midiAvailable.value = true;
  access.onstatechange = () => publishInputs();
  publishInputs();
  return true;
}

/**
 * Get the live MIDIInput object for an id, or null if the device isn't
 * currently connected. Engine uses this to (un)subscribe `onmidimessage`.
 */
export function getInput(id: string | null): MIDIInput | null {
  if (!access || !id) return null;
  return access.inputs.get(id) ?? null;
}

/** Fires whenever the input list changes (plug / unplug / permission). */
export function onInputsChanged(fn: (inputs: readonly InputDescription[]) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((x) => x !== fn);
  };
}
