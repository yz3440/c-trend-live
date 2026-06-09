import { Pane } from "tweakpane";
import type { FolderApi } from "tweakpane";
import { effect } from "@preact/signals";
import {
  bloomParams,
  cameraAutoRotate,
  cameraAutoRotateSpeed,
  hasSyphon,
  params,
  syphonEnabled,
  toneMappingMode,
} from "./store";
import {
  groupedDescriptors,
  type EnumOption,
  type ParamDescriptor,
  type ParamId,
} from "./params-registry";
import { externalParamChange, setParamById, triggerParam } from "./params-dispatch";
import {
  clearAllBindings,
  midiAvailable,
  midiInputs,
  midiLearning,
  midiMapping,
  setDeviceId,
  setLearning,
} from "./midi";
import { ACCENT } from "./ui/tokens";

// Structural shape of what we need from `folder.addBinding()`'s return. The
// library's own exported generic `BindingApi` type is too invariant to match
// the actual return under our flat `Record<string, unknown>` state, so we
// lean on duck-typing for the methods we actually call.
type RefreshableBinding = {
  refresh(): void;
  dispose(): void;
  on(event: "change", handler: (ev: { value: unknown }) => void): RefreshableBinding;
  readonly element: HTMLElement;
};

/**
 * Build the Tweakpane panel from the parameter registry. Every binding is
 * driven by a signal in the store; this file is purely presentation + wiring.
 * No direct mutation of renderer / controls / effects happens here anymore —
 * all of that moved to signal-watching effects in main.ts so MIDI and the
 * Tweakpane UI can coexist without stepping on each other.
 *
 * Refresh discipline: never call `pane.refresh()`. We keep a `bindings` map
 * and refresh individual bindings we own. `pane.refresh()` iterates every
 * binding in the pane, including ones that were disposed during a rebuild
 * (e.g. when the MIDI device dropdown rebuilds for a new input list), which
 * crashes Tweakpane with "View has been already disposed."
 */
export function createParamsPane(container: HTMLElement): Pane {
  const pane = new Pane({ container });

  // Single flat mirror object Tweakpane can bind against. Initialised from
  // the live signals so the UI matches current state on mount.
  const state: Record<string, unknown> = {
    ...params.value,
    "bloom.enabled": bloomParams.value.enabled,
    "bloom.intensity": bloomParams.value.intensity,
    "bloom.threshold": bloomParams.value.threshold,
    "bloom.smoothing": bloomParams.value.smoothing,
    "bloom.radius": bloomParams.value.radius,
    "toneMapping.mode": toneMappingMode.value,
    "camera.autoRotate": cameraAutoRotate.value,
    "camera.autoRotateSpeed": cameraAutoRotateSpeed.value,
  };

  // Guard against feedback loops: when the signal→state sync path writes to
  // the mirror and we refresh a binding, Tweakpane fires change events for
  // the dirty binding. Without this flag those events would call
  // setParamById again, breaking learn mode by re-stomping
  // lastTouchedParamId on a MIDI-driven refresh.
  let applyingFromSignal = false;

  // Map of parameter id → binding. External-origin (MIDI) writes refresh
  // exactly one binding through this map; UI-origin writes are not synced
  // back from the signal at all, so Tweakpane's drag state is never
  // interrupted by our own refresh() calls.
  const bindings = new Map<ParamId, RefreshableBinding>();

  const optionsFor = (options: readonly EnumOption[]): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const o of options) out[o.label] = o.value;
    return out;
  };

  /**
   * Push an externally-originated value (e.g. from MIDI) into Tweakpane's
   * mirror + visible control. Never called on a UI-origin write — that path
   * doesn't need syncing and refreshing mid-drag was what was breaking
   * slider draggability.
   */
  const syncBinding = (id: ParamId, newValue: unknown): void => {
    if (state[id] === newValue) return;
    state[id] = newValue;
    const b = bindings.get(id);
    if (!b) return;
    applyingFromSignal = true;
    try {
      b.refresh();
    } finally {
      applyingFromSignal = false;
    }
  };

  const addParamBinding = (folder: FolderApi, d: ParamDescriptor): void => {
    if (d.kind === "trigger") {
      folder.addButton({ title: d.label }).on("click", () => {
        triggerParam(d.id, "ui");
      });
      return;
    }

    let opts: Record<string, unknown>;
    if (d.kind === "number") {
      opts = { min: d.min, max: d.max, step: d.step, label: d.label };
    } else if (d.kind === "enum") {
      opts = { label: d.label, options: optionsFor(d.options) };
    } else {
      opts = { label: d.label };
    }

    const binding = folder
      .addBinding(state, d.id, opts)
      .on("change", (ev: { value: unknown }) => {
        if (applyingFromSignal) return;
        // Defer the signal write so Tweakpane's pointer handler returns
        // immediately. Without this defer, `setParamById` runs batched
        // effects (shader uniform updates, learn-status) synchronously
        // inside Tweakpane's own change emit — which interferes with its
        // drag state machine and makes sliders "just click" without
        // continuous drag. Microtask timing keeps UI responsiveness —
        // effects still run before the next frame.
        const value = ev.value;
        queueMicrotask(() => setParamById(d.id, value, "ui"));
      });

    bindings.set(d.id, binding);
  };

  // ── MIDI folder (first, so it's at the top of the pane) ────────────────
  const midiFolder = pane.addFolder({ title: "MIDI" });
  const midiState = {
    device: midiMapping.value.deviceId ?? "",
    mappings: `${midiMapping.value.bindings.length} mapped`,
  };

  const mappingCountBinding = midiFolder.addBinding(midiState, "mappings", {
    readonly: true,
    label: "Status",
  });

  const learnButton = midiFolder.addButton({ title: "MIDI Learn (M)" });
  learnButton.on("click", () => setLearning(!midiLearning.value));

  midiFolder.addButton({ title: "Clear All Mappings" }).on("click", () => {
    clearAllBindings();
  });

  // The device dropdown is created lazily — see device-rebuild effect below.
  // We can't build it synchronously with meaningful options because the
  // input list only arrives after the async requestMIDIAccess() resolves.
  let currentDeviceBinding: RefreshableBinding | null = null;
  let lastInputsSignature: string | null = null;
  let rebuildScheduled = false;

  const buildDeviceBinding = (): void => {
    const opts: Record<string, string> = { None: "" };
    for (const input of midiInputs.value) opts[input.name] = input.id;
    const savedId = midiMapping.peek().deviceId;
    if (savedId && !midiInputs.value.some((i) => i.id === savedId)) {
      opts[`(disconnected) ${savedId.slice(0, 8)}`] = savedId;
    }
    midiState.device = savedId ?? "";

    // Dispose the previous binding first. Pairing this with per-binding
    // refresh (above) means no stale-binding iteration from pane.refresh().
    if (currentDeviceBinding) {
      currentDeviceBinding.dispose();
      currentDeviceBinding = null;
    }

    const binding = midiFolder.addBinding(midiState, "device", {
      label: "Device",
      options: opts,
      index: 0,
    });
    binding.on("change", (ev: { value: string }) => {
      setDeviceId(ev.value ? ev.value : null);
    });
    currentDeviceBinding = binding;
  };

  const scheduleDeviceRebuild = (): void => {
    if (rebuildScheduled) return;
    rebuildScheduled = true;
    // Defer so we don't dispose+recreate during Tweakpane's own event
    // processing or in the middle of an effect cascade (which was the
    // original source of "View has been already disposed" errors).
    queueMicrotask(() => {
      rebuildScheduled = false;
      buildDeviceBinding();
    });
  };

  // ── Parameter folders from the registry ────────────────────────────────
  for (const { group, items } of groupedDescriptors()) {
    const folder = pane.addFolder({ title: group });
    for (const d of items) addParamBinding(folder, d);
  }

  // ── External → Tweakpane sync ──────────────────────────────────────────
  // Only MIDI / automation writes trigger a Tweakpane refresh. UI writes
  // don't need it (Tweakpane already has the value) and a refresh mid-drag
  // would reset the pointer state and break draggability.
  const dispose: Array<() => void> = [];

  // ── Desktop-only: Syphon output (Electron injects window.syphon) ─────────
  // A button toggle, not a checkbox: unambiguous and theme-proof. It drives +
  // reflects the syphonEnabled signal through the normal dispatcher, so MIDI
  // and automation still work. Created after the registry folders so it lands
  // at the bottom of the pane.
  if (hasSyphon.value) {
    const outputFolder = pane.addFolder({ title: "Output" });
    const syphonTitle = (on: boolean): string => `Syphon Output: ${on ? "ON" : "OFF"}`;
    const syphonBtn = outputFolder.addButton({ title: syphonTitle(syphonEnabled.value) });
    syphonBtn.on("click", () => setParamById("output.syphon", !syphonEnabled.value, "ui"));
    dispose.push(
      effect(() => {
        syphonBtn.title = syphonTitle(syphonEnabled.value);
      })
    );
  }

  dispose.push(
    effect(() => {
      const change = externalParamChange.value;
      if (!change) return;
      syncBinding(change.id, change.value);
    })
  );

  // MIDI folder reactivity.
  dispose.push(
    effect(() => {
      const count = midiMapping.value.bindings.length;
      midiState.mappings = count === 0 ? "no mappings" : `${count} mapped`;
      applyingFromSignal = true;
      try {
        mappingCountBinding.refresh();
      } finally {
        applyingFromSignal = false;
      }
    })
  );

  // Rebuild the device dropdown only when the input list actually changes.
  // Compared via a stable signature so unrelated signal churn can't cause a
  // superfluous dispose+recreate.
  dispose.push(
    effect(() => {
      const inputs = midiInputs.value;
      const signature = inputs
        .map((i) => i.id)
        .sort()
        .join("|");
      if (signature === lastInputsSignature) return;
      lastInputsSignature = signature;
      scheduleDeviceRebuild();
    })
  );

  dispose.push(
    effect(() => {
      const on = midiLearning.value;
      learnButton.title = on ? "Stop Learning (M)" : "MIDI Learn (M)";
      container.style.boxShadow = on ? `inset 0 0 0 1px ${ACCENT}` : "";
    })
  );

  dispose.push(
    effect(() => {
      if (!midiAvailable.value) {
        midiState.mappings = "MIDI unavailable";
        applyingFromSignal = true;
        try {
          mappingCountBinding.refresh();
        } finally {
          applyingFromSignal = false;
        }
      }
    })
  );

  // Patch dispose to also tear down our effects.
  const origDispose = pane.dispose.bind(pane);
  pane.dispose = () => {
    for (const fn of dispose) fn();
    origDispose();
  };

  return pane;
}
