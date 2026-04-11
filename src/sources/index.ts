import type { Source } from "./types";
import { earthcamSource } from "./earthcam";

export const SOURCES: Source[] = [earthcamSource];

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}
