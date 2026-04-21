import { signal } from "@preact/signals";
import type { MidiBinding, MidiBindingSource, MidiMappingState } from "./types";
import { EMPTY_MAPPING } from "./types";
import type { ParamId } from "../params-registry";

const STORAGE_KEY = "earth-cam-synth:midi-mapping:v1";

function load(): MidiMappingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_MAPPING;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.bindings) &&
      (parsed.deviceId === null || typeof parsed.deviceId === "string")
    ) {
      return parsed as MidiMappingState;
    }
  } catch {
    // noop — fall through to empty
  }
  return EMPTY_MAPPING;
}

function persist(state: MidiMappingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / disabled — non-fatal, in-memory state still works.
  }
}

/** Current mapping (persisted). */
export const midiMapping = signal<MidiMappingState>(load());

/** True while the user is in MIDI-learn mode. */
export const midiLearning = signal<boolean>(false);

/** performance.now() of the last decoded message — drives the status-bar pulse. */
export const midiLastMessageAt = signal<number>(0);

/**
 * Transient MIDI-side message that the status bar shows *on top of* the
 * main status text. The learn engine writes hints here (armed / mapped)
 * and clears it on exit, so the main `status` signal stays untouched and
 * the status bar naturally reverts to whatever the stream loader last set.
 */
export const midiStatusMessage = signal<string | null>(null);

/** Available input devices (id → human label). Populated by access.ts. */
export const midiInputs = signal<readonly { id: string; name: string }[]>([]);

/** True when the browser supports WebMIDI and access was granted. */
export const midiAvailable = signal<boolean>(false);

function sameSource(a: MidiBindingSource, b: MidiBindingSource): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "cc" && b.type === "cc") {
    return a.channel === b.channel && a.controller === b.controller;
  }
  if (a.type === "note" && b.type === "note") {
    return a.channel === b.channel && a.note === b.note;
  }
  return false;
}

function write(next: MidiMappingState): void {
  midiMapping.value = next;
  persist(next);
}

export function setDeviceId(id: string | null): void {
  if (midiMapping.value.deviceId === id) return;
  write({ ...midiMapping.value, deviceId: id });
}

/**
 * Replace-or-insert. Any existing binding for the same source is removed
 * (one CC should drive one param), and any existing binding for the same
 * target is also removed (one param should have one source — predictable
 * behavior is more important than layered mappings in v1).
 */
export function addBinding(binding: MidiBinding): void {
  const remaining = midiMapping.value.bindings.filter(
    (b) => !sameSource(b.source, binding.source) && b.target !== binding.target
  );
  write({ ...midiMapping.value, bindings: [...remaining, binding] });
}

export function removeBindingsForTarget(target: ParamId): void {
  const bindings = midiMapping.value.bindings.filter((b) => b.target !== target);
  if (bindings.length === midiMapping.value.bindings.length) return;
  write({ ...midiMapping.value, bindings });
}

export function clearAllBindings(): void {
  write({ ...midiMapping.value, bindings: [] });
}

export function setLearning(on: boolean): void {
  midiLearning.value = on;
}
