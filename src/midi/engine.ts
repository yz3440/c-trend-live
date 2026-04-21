/**
 * MIDI routing engine. Subscribes to the selected input, decodes CC / note
 * messages, and routes them through the param dispatcher. In learn mode it
 * pairs the current `lastTouchedParamId` with the next incoming message.
 *
 * Decoupling: this module knows about params via the registry and dispatcher
 * only. It must not import anything from Tweakpane or UI components.
 */
import { effect } from "@preact/signals";
import { getDescriptor, type ParamDescriptor, type ParamId } from "../params-registry";
import { getParamValue, setParamById, triggerParam } from "../params-dispatch";
import { lastTouchedParamId } from "../store";
import {
  addBinding,
  midiLastMessageAt,
  midiLearning,
  midiMapping,
  midiStatusMessage,
} from "./store";
import type { MidiBinding, MidiBindingSource } from "./types";
import { getInput, onInputsChanged, requestAccess } from "./access";

/** Small tolerance for "initial pickup" — within 3/127 counts as at-position. */
const TAKEOVER_TOLERANCE = 3;
/** Debounce window for retriggered buttons. */
const TRIGGER_DEBOUNCE_MS = 50;
/** How long the status bar shows a "MAPPED…" flash. */
const MAPPED_FLASH_MS = 1500;
/** How long the Armed hint stays before reverting to plain Learning. */
const ARMED_TIMEOUT_MS = 6000;

type PickupState = {
  pickedUp: boolean;
  lastCC: number | null;
  lastAppliedValue: unknown;
};

/** Keyed by a stable string for each binding source. */
const pickup = new Map<string, PickupState>();
/** Last trigger time per source (for debounce). */
const triggerAt = new Map<string, number>();
/** Remembers the value we last wrote for boolean-CC bindings (cheap hysteresis). */
const lastBoolCC = new Map<string, boolean>();

function sourceKey(s: MidiBindingSource): string {
  return s.type === "cc"
    ? `cc:${s.channel}:${s.controller}`
    : `note:${s.channel}:${s.note}`;
}

function getOrCreatePickup(key: string): PickupState {
  let st = pickup.get(key);
  if (!st) {
    st = { pickedUp: false, lastCC: null, lastAppliedValue: undefined };
    pickup.set(key, st);
  }
  return st;
}

// ── Value mapping ──────────────────────────────────────────────────────────

function numberFromCC(cc: number, d: ParamDescriptor & { kind: "number" }, invert: boolean): number {
  const t = invert ? 1 - cc / 127 : cc / 127;
  const raw = d.min + t * (d.max - d.min);
  const snapped = d.step > 0 ? Math.round(raw / d.step) * d.step : raw;
  return Math.max(d.min, Math.min(d.max, snapped));
}

function ccFromNumber(value: number, d: ParamDescriptor & { kind: "number" }, invert: boolean): number {
  const span = d.max - d.min || 1;
  const t = (value - d.min) / span;
  const cc = (invert ? 1 - t : t) * 127;
  return Math.max(0, Math.min(127, Math.round(cc)));
}

function enumFromCC(cc: number, d: ParamDescriptor & { kind: "enum" }): string {
  const n = d.options.length;
  const idx = Math.max(0, Math.min(n - 1, Math.floor((cc / 128) * n)));
  return d.options[idx].value;
}

// ── Takeover ───────────────────────────────────────────────────────────────

function applyWithTakeover(
  binding: MidiBinding,
  descriptor: ParamDescriptor & { kind: "number" },
  cc: number
): void {
  const key = sourceKey(binding.source);
  const st = getOrCreatePickup(key);
  const takeover = binding.takeover !== false;
  const invert = binding.invert === true;
  const current = getParamValue(binding.target) as number;

  // If something else (UI, another driver) moved the target away from the
  // value we last wrote, force a re-pickup. Prevents the knob from yanking
  // the param back when the user touches a Tweakpane slider mid-performance.
  if (
    takeover &&
    st.lastAppliedValue !== undefined &&
    typeof current === "number" &&
    Math.abs(current - (st.lastAppliedValue as number)) > 1e-6
  ) {
    st.pickedUp = false;
  }

  const currentAsCC = ccFromNumber(current, descriptor, invert);

  if (takeover && !st.pickedUp) {
    if (st.lastCC === null) {
      if (Math.abs(cc - currentAsCC) <= TAKEOVER_TOLERANCE) {
        st.pickedUp = true;
      }
    } else {
      const crossed = (st.lastCC - currentAsCC) * (cc - currentAsCC) <= 0;
      if (crossed) st.pickedUp = true;
    }
    st.lastCC = cc;
    if (!st.pickedUp) return;
  } else {
    st.lastCC = cc;
  }

  const mapped = numberFromCC(cc, descriptor, invert);
  st.lastAppliedValue = mapped;
  setParamById(binding.target, mapped, "midi");
}

function applyBooleanFromCC(binding: MidiBinding, cc: number): void {
  const key = sourceKey(binding.source);
  const want = cc >= 64;
  if (lastBoolCC.get(key) === want) return;
  lastBoolCC.set(key, want);
  setParamById(binding.target, want, "midi");
}

function applyBooleanToggle(target: ParamId): void {
  const cur = getParamValue(target);
  setParamById(target, !cur, "midi");
}

function applyTrigger(binding: MidiBinding): void {
  const key = sourceKey(binding.source);
  const now = performance.now();
  const last = triggerAt.get(key) ?? 0;
  if (now - last < TRIGGER_DEBOUNCE_MS) return;
  triggerAt.set(key, now);
  triggerParam(binding.target, "midi");
}

// ── Learn ──────────────────────────────────────────────────────────────────

let armedTimeout: ReturnType<typeof setTimeout> | null = null;
let mappedFlashTimeout: ReturnType<typeof setTimeout> | null = null;

function updateLearnStatus(): void {
  if (!midiLearning.value) {
    midiStatusMessage.value = null;
    return;
  }
  const armed = lastTouchedParamId.value;
  if (armed) {
    const d = getDescriptor(armed);
    midiStatusMessage.value = `[LEARNING] Armed: ${d?.label ?? armed} — move a MIDI control`;
  } else {
    midiStatusMessage.value = "[LEARNING] Wiggle a Tweakpane control to arm it…";
  }
}

function flashMapped(binding: MidiBinding): void {
  const d = getDescriptor(binding.target);
  const srcLabel =
    binding.source.type === "cc"
      ? `CC #${binding.source.controller}`
      : `Note ${binding.source.note}`;
  midiStatusMessage.value = `[MAPPED] ${srcLabel} → ${d?.label ?? binding.target}`;
  if (mappedFlashTimeout) clearTimeout(mappedFlashTimeout);
  mappedFlashTimeout = setTimeout(() => {
    // Post-flash, hand the slot back to whichever state applies: learn hint
    // if still learning, or cleared so the main camera status shows through.
    if (midiLearning.value) updateLearnStatus();
    else midiStatusMessage.value = null;
  }, MAPPED_FLASH_MS);
}

function tryLearn(source: MidiBindingSource): boolean {
  if (!midiLearning.value) return false;
  const target = lastTouchedParamId.value;
  if (!target) return false;
  const d = getDescriptor(target);
  if (!d) return false;

  // Only certain source/target combinations make sense. Trigger targets
  // accept only note sources; everything else accepts either.
  if (d.kind === "trigger" && source.type !== "note") return false;

  const binding: MidiBinding = { source, target, takeover: d.kind === "number" };
  addBinding(binding);
  lastTouchedParamId.value = null;
  // Reset pickup state for the new mapping so takeover kicks in cleanly.
  pickup.delete(sourceKey(source));
  flashMapped(binding);
  return true;
}

// ── Message decode ─────────────────────────────────────────────────────────

function decodeAndRoute(data: Uint8Array): void {
  if (data.length < 2) return;
  const statusByte = data[0];
  const type = statusByte & 0xf0;
  const channel = statusByte & 0x0f;
  midiLastMessageAt.value = performance.now();

  if (type === 0xb0) {
    // CC
    const controller = data[1];
    const value = data[2] ?? 0;
    const source: MidiBindingSource = { type: "cc", channel, controller };
    if (tryLearn(source)) return;
    for (const b of midiMapping.value.bindings) {
      if (b.source.type !== "cc") continue;
      if (b.source.channel !== channel || b.source.controller !== controller) continue;
      routeCC(b, value);
    }
  } else if (type === 0x90) {
    // Note on (velocity 0 = note-off by convention)
    const note = data[1];
    const velocity = data[2] ?? 0;
    if (velocity === 0) return;
    const source: MidiBindingSource = { type: "note", channel, note };
    if (tryLearn(source)) return;
    for (const b of midiMapping.value.bindings) {
      if (b.source.type !== "note") continue;
      if (b.source.channel !== channel || b.source.note !== note) continue;
      routeNoteOn(b);
    }
  }
  // Note-off (0x80) and everything else: ignored in v1.
}

function routeCC(b: MidiBinding, cc: number): void {
  const d = getDescriptor(b.target);
  if (!d) return;
  if (d.kind === "number") {
    applyWithTakeover(b, d, cc);
  } else if (d.kind === "enum") {
    setParamById(b.target, enumFromCC(cc, d), "midi");
  } else if (d.kind === "boolean") {
    applyBooleanFromCC(b, cc);
  }
  // trigger: CC doesn't trigger — only note-on does.
}

function routeNoteOn(b: MidiBinding): void {
  const d = getDescriptor(b.target);
  if (!d) return;
  if (d.kind === "trigger") {
    applyTrigger(b);
  } else if (d.kind === "boolean") {
    applyBooleanToggle(b.target);
  } else if (d.kind === "enum") {
    // Cycle to next option.
    const current = getParamValue(b.target);
    const idx = d.options.findIndex((o) => o.value === current);
    const next = d.options[(idx + 1) % d.options.length].value;
    setParamById(b.target, next, "midi");
  } else if (d.kind === "number") {
    // Note-on on a numeric param: bounce between min and max (musical —
    // lets a pad "punch" a parameter up). Cheap and useful; no takeover.
    const current = getParamValue(b.target) as number;
    const mid = (d.min + d.max) / 2;
    const next = current < mid ? d.max : d.min;
    setParamById(b.target, next, "midi");
  }
}

// ── Device subscription ────────────────────────────────────────────────────

let currentInput: MIDIInput | null = null;
let currentHandler: ((e: MIDIMessageEvent) => void) | null = null;

function detachCurrent(): void {
  if (currentInput && currentHandler) {
    currentInput.removeEventListener("midimessage", currentHandler as EventListener);
  }
  currentInput = null;
  currentHandler = null;
}

function attach(deviceId: string | null): void {
  detachCurrent();
  if (!deviceId) return;
  const input = getInput(deviceId);
  if (!input) return;
  const handler = (e: MIDIMessageEvent) => {
    const data = e.data;
    if (data) decodeAndRoute(data);
  };
  input.addEventListener("midimessage", handler as EventListener);
  currentInput = input;
  currentHandler = handler;
}

// ── Boot ───────────────────────────────────────────────────────────────────

let started = false;

export async function startEngine(): Promise<void> {
  if (started) return;
  started = true;
  const ok = await requestAccess();
  if (!ok) return;

  // Re-attach whenever the user picks a new device.
  effect(() => {
    const id = midiMapping.value.deviceId;
    attach(id);
  });

  // Re-attach if the device list changes (e.g. device was unplugged and the
  // effect ran while it was gone — plug it back in and we pick it up).
  onInputsChanged(() => {
    attach(midiMapping.value.deviceId);
  });

  // When the mapping table changes, pickup state becomes stale — recompute
  // lazily per-source in applyWithTakeover (the stored key is source-based,
  // so removed bindings just stop being read).
  effect(() => {
    // Touch to subscribe.
    const m = midiMapping.value;
    void m;
  });

  // Status-bar learn/armed hints.
  effect(() => {
    // Subscribe to both signals.
    void midiLearning.value;
    void lastTouchedParamId.value;
    if (armedTimeout) clearTimeout(armedTimeout);
    updateLearnStatus();
    if (midiLearning.value && lastTouchedParamId.value) {
      armedTimeout = setTimeout(() => {
        if (midiLearning.value && lastTouchedParamId.value) {
          lastTouchedParamId.value = null;
        }
      }, ARMED_TIMEOUT_MS);
    }
  });
}
