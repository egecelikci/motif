/**
 * Palette loading and validation.
 *
 * The palette is the single source of truth; every target is generated from it.
 * Unknown keys are ignored so the spec can document extra tokens (e.g.
 * `textDim`) without breaking generation.
 */

import { parseHex } from "./color.ts";

export type Scheme = "light" | "dark";

export interface PaletteMode {
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly textMuted: string;
  readonly border: string;
  readonly borderHover: string;
  readonly primary: string;
  readonly primaryOffset: string;
  readonly secondary: string;
}

export interface Palette {
  readonly name: string;
  readonly light: PaletteMode;
  readonly dark: PaletteMode;
}

export async function loadPalette(url: URL): Promise<Palette> {
  return parsePalette(await Deno.readTextFile(url));
}

export function parsePalette(json: string): Palette {
  const raw: unknown = JSON.parse(json);
  if (!isRecord(raw)) throw new Error("palette must be a JSON object");
  const name = raw["name"];
  if (typeof name !== "string") throw new Error("palette.name must be a string");
  return { name, light: parseMode(raw["light"], "light"), dark: parseMode(raw["dark"], "dark") };
}

function parseMode(value: unknown, scheme: Scheme): PaletteMode {
  if (!isRecord(value)) throw new Error(`palette.${scheme} must be an object`);
  return {
    bg: hex(value, scheme, "bg"),
    surface: hex(value, scheme, "surface"),
    text: hex(value, scheme, "text"),
    textMuted: hex(value, scheme, "textMuted"),
    border: hex(value, scheme, "border"),
    borderHover: hex(value, scheme, "borderHover"),
    primary: hex(value, scheme, "primary"),
    primaryOffset: hex(value, scheme, "primaryOffset"),
    secondary: hex(value, scheme, "secondary"),
  };
}

function hex(source: Record<string, unknown>, scheme: Scheme, key: string): string {
  const value = source[key];
  if (typeof value !== "string") {
    throw new Error(`palette.${scheme}.${key} must be a string`);
  }
  parseHex(value); // throws on malformed colour
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
