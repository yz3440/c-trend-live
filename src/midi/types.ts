import type { ParamId } from "../params-registry";

/**
 * Where the MIDI message originates on the physical controller.
 * `channel` is 0-15 (MIDI spec). Using `-1` as a wildcard is intentionally
 * not supported — matching is exact to keep bindings predictable.
 */
export type MidiBindingSource =
  | { readonly type: "cc"; readonly channel: number; readonly controller: number }
  | { readonly type: "note"; readonly channel: number; readonly note: number };

export interface MidiBinding {
  readonly source: MidiBindingSource;
  readonly target: ParamId;
  /** Reserved for v2 UI; engine honors it when present. */
  readonly invert?: boolean;
  /** Default true. Ignored for booleans / triggers. */
  readonly takeover?: boolean;
}

export interface MidiMappingState {
  /** The input device the user selected. Null = none. */
  readonly deviceId: string | null;
  readonly bindings: readonly MidiBinding[];
}

export const EMPTY_MAPPING: MidiMappingState = {
  deviceId: null,
  bindings: [],
};
