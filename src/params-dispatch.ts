/**
 * Central parameter dispatcher. Every driver (Tweakpane UI, MIDI, future
 * automation) writes through here. Routes by ParamId to the correct signal
 * and, for `origin === "ui"`, records the last user-touched parameter so MIDI
 * learn can pick it up.
 *
 * This module intentionally has no UI dependencies — it's pure state plumbing.
 */
import { batch, signal } from "@preact/signals";
import {
  bloomParams,
  cameraAutoRotate,
  cameraAutoRotateSpeed,
  lastTouchedParamId,
  params,
  syphonEnabled,
  toneMappingMode,
  type ToneMappingMode,
} from "./store";
import type { ParamId } from "./params-registry";
import type { BloomParams, RuttEtraParams } from "./types";

/**
 * Fires whenever a non-UI driver (MIDI, automation) writes a parameter.
 * Tweakpane subscribes to this to sync its visible value — but it
 * intentionally does *not* fire for UI-origin writes, because Tweakpane is
 * already the origin and an extra refresh during a drag interrupts its
 * pointer state machine. Monotonic `tick` ensures a write-same-value (e.g.
 * hitting the same value twice) still triggers the subscriber.
 */
export const externalParamChange = signal<{
  id: ParamId;
  value: unknown;
  tick: number;
} | null>(null);
let externalTick = 0;

export type DispatchOrigin = "ui" | "midi" | "init";

export type TriggerHandlers = {
  resetCamera: () => void;
  toggleStage: () => void;
  takeScreenshot: () => void;
};

let triggerHandlers: TriggerHandlers | null = null;

/**
 * Wire the trigger-kind params (buttons) once at app boot. main.ts owns the
 * renderer/controls and knows how to actually reset the camera etc., so it
 * registers the callbacks rather than the dispatcher reaching into those
 * objects directly.
 */
export function registerTriggerHandlers(handlers: TriggerHandlers): void {
  triggerHandlers = handlers;
}

const SHADER_KEYS = new Set<string>(Object.keys(params.value));

function isShaderKey(id: string): id is keyof RuttEtraParams {
  return SHADER_KEYS.has(id);
}

function setBloom<K extends keyof BloomParams>(key: K, value: BloomParams[K]): void {
  bloomParams.value = { ...bloomParams.value, [key]: value };
}

function setShader<K extends keyof RuttEtraParams>(key: K, value: RuttEtraParams[K]): void {
  params.value = { ...params.value, [key]: value };
}

/**
 * Write a parameter by id. `value` is cast inside based on the id — callers
 * are expected to pass a value of the right shape (number for number params,
 * string for enums, boolean for booleans). The dispatcher doesn't validate
 * ranges — that's the UI's job; MIDI does its own remap before dispatching.
 */
export function setParamById(id: ParamId, value: unknown, origin: DispatchOrigin = "ui"): void {
  // Tweakpane's numeric text input can emit NaN when the user clears the
  // field or commits an empty value. Poisoning a signal with NaN propagates
  // into shader uniforms (displacement = NaN → entire mesh disappears), so
  // the dispatcher silently drops non-finite numbers.
  if (typeof value === "number" && !Number.isFinite(value)) return;
  batch(() => {
    if (id.startsWith("bloom.")) {
      const key = id.slice("bloom.".length) as keyof BloomParams;
      setBloom(key, value as BloomParams[typeof key]);
    } else if (id === "toneMapping.mode") {
      toneMappingMode.value = value as ToneMappingMode;
    } else if (id === "camera.autoRotate") {
      cameraAutoRotate.value = value as boolean;
    } else if (id === "camera.autoRotateSpeed") {
      cameraAutoRotateSpeed.value = value as number;
    } else if (id === "output.syphon") {
      syphonEnabled.value = value as boolean;
    } else if (isShaderKey(id)) {
      setShader(id, value as never);
    } else {
      // Triggers don't have a value — misuse; fall through to no-op.
      return;
    }
    if (origin === "ui") {
      lastTouchedParamId.value = id;
    } else {
      // Non-UI write (MIDI today, automation tomorrow): nudge Tweakpane to
      // sync its visible value. We don't do this for UI writes because
      // Tweakpane is already the origin.
      externalParamChange.value = { id, value, tick: ++externalTick };
    }
  });
}

/**
 * Fire a trigger parameter (button). Also records the id as last-touched
 * when origin is "ui", so a MIDI learn can bind a pad to the button.
 */
export function triggerParam(id: ParamId, origin: DispatchOrigin = "ui"): void {
  if (origin === "ui") {
    lastTouchedParamId.value = id;
  }
  if (!triggerHandlers) return;
  switch (id) {
    case "camera.reset":
      triggerHandlers.resetCamera();
      break;
    case "view.present":
      // ParamId kept as "view.present" to preserve existing MIDI bindings
      // persisted in localStorage; semantically this is now the stage peek.
      triggerHandlers.toggleStage();
      break;
    case "view.screenshot":
      triggerHandlers.takeScreenshot();
      break;
    default:
      // Non-trigger id; ignore.
      break;
  }
}

/**
 * Read the current value for an id — used by MIDI takeover to compare the
 * physical knob against where the parameter actually is.
 */
export function getParamValue(id: ParamId): unknown {
  if (id.startsWith("bloom.")) {
    const key = id.slice("bloom.".length) as keyof BloomParams;
    return bloomParams.value[key];
  }
  if (id === "toneMapping.mode") return toneMappingMode.value;
  if (id === "camera.autoRotate") return cameraAutoRotate.value;
  if (id === "camera.autoRotateSpeed") return cameraAutoRotateSpeed.value;
  if (id === "output.syphon") return syphonEnabled.value;
  if (isShaderKey(id)) return params.value[id];
  return undefined;
}
