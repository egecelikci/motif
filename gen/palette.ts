/**
 * Palette loading and validation — the boundary between the spec and the code.
 *
 * `spec/palette.json` is the single source of truth for Motif. Every target is generated from the object this module returns, so nothing downstream needs to know the JSON shape or re-check it.
 *
 * Two deliberate properties:
 *
 * - **Strict about what it reads.** Every token a target depends on is required and validated (present, a string, a well-formed `#rrggbb`). A typo in the spec fails the build with the offending path in the message rather than producing an off-color theme.
 * - **Tolerant about what it ignores.** Unknown keys are dropped. The spec is also prose (descriptions, target notes, accessibility policy); those fields are documentation, not inputs, and adding them must never break generation.
 *
 * The spec's document format itself is not a separate JSON Schema; this module *is* the schema, and {@link Palette} plus {@link PaletteMode} are its machine-readable description.
 */

import { parseHex } from "./color.ts";

/** A color scheme. Motif ships exactly two, and every target must handle both. */
export type Scheme = "light" | "dark";

/**
 * The colors one scheme provides, as hex strings.
 *
 * These are *semantic roles*, not a color ramp: each key answers "what job does this color do", so a target can map it to whatever its own vocabulary calls that job. The same role may change hue between schemes (Motif's light and dark are not the same hue family), which is why the schemes are two independent objects rather than one base plus overrides.
 */
export interface PaletteMode {
  /** Page background. The largest area on screen; everything else is measured against it. */
  readonly bg: string;
  /** Raised surfaces: cards, menus, popovers, inputs. Sits "above" {@link bg}. */
  readonly surface: string;
  /** Primary body text. */
  readonly text: string;
  /**
   * Secondary text: captions, timestamps, placeholders, metadata.
   *
   * This is the one token the accessibility contract polices. It is the closest text color to the backgrounds, so it is the first to fall below WCAG 2.2 AA. `gen/derive.ts` verifies it against every surface a target paints text on and fails the build otherwise; see `assertAccessible`.
   */
  readonly textMuted: string;
  /** Dividers, separators, and the resting border of inputs and buttons. */
  readonly border: string;
  /** {@link border} for hovered/focused interactive elements; must read as "more prominent". */
  readonly borderHover: string;
  /** Brand accent: links, primary buttons, focus indicators, selections. */
  readonly primary: string;
  /** Pressed/hover state of {@link primary}. Kept separate because a scheme's primary is often too light or too dark to darken mechanically. */
  readonly primaryOffset: string;
  /** Supporting accent: secondary buttons and highlights that must not compete with {@link primary}. */
  readonly secondary: string;
  /**
   * Third text emphasis level, dimmer than {@link textMuted} — used for timestamps, disabled labels, and other intentionally de-emphasised text.
   *
   * Only the dark scheme defines it today, so this is a **required key whose value may be `undefined`** rather than an optional key. That spelling is forced by `exactOptionalPropertyTypes` in `deno.json`: `textDim?: string` means "the key may be absent", while `textDim: string | undefined` means "the key is always present and may hold `undefined`". {@link parseMode} always assigns the key, so only the latter type-checks. Targets must branch on `undefined` instead of assuming the token exists.
   */
  readonly textDim: string | undefined;
}

/**
 * A complete palette: a display name plus both schemes.
 *
 * {@link name} is used for places that need to identify the theme as a whole (for example Navidrome's `themeName`), not as a color.
 */
export interface Palette {
  /** Human-readable theme name ("Motif"), for places that label the whole theme rather than a color. */
  readonly name: string;
  /** colors for the light scheme. */
  readonly light: PaletteMode;
  /** colors for the dark scheme. */
  readonly dark: PaletteMode;
}

/**
 * Reads and validates a palette from disk.
 *
 * @param url Location of the palette JSON, normally `spec/palette.json`.
 * @throws Whatever {@link parsePalette} throws, plus `Deno.errors.NotFound` if the file is missing.
 */
export async function loadPalette(url: URL): Promise<Palette> {
  return parsePalette(await Deno.readTextFile(url));
}

/**
 * Validates an in-memory palette document.
 *
 * Kept separate from {@link loadPalette} so it can be tested without a file and so callers holding a JSON string (a build cache, a remote fetch) can reuse the validation.
 *
 * @throws If the document is not an object, `name` is missing/not a string, or either scheme fails {@link parseMode}.
 */
export function parsePalette(json: string): Palette {
  const raw: unknown = JSON.parse(json);
  if (!isRecord(raw)) throw new Error("palette must be a JSON object");
  const name = raw["name"];
  if (typeof name !== "string") throw new Error("palette.name must be a string");
  return { name, light: parseMode(raw["light"], "light"), dark: parseMode(raw["dark"], "dark") };
}

/**
 * Validates one scheme and drops everything the code does not consume.
 *
 * Every key except {@link PaletteMode.textDim} is required. Errors name the full spec path (`palette.light.primary`) so a failure points straight at the typo.
 */
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
    textDim: optionalHex(value, scheme, "textDim"),
  };
}

/**
 * Like {@link hex}, but tolerates an absent key.
 *
 * Used for tokens a scheme is allowed to omit. Returns `undefined` for a missing key but still rejects a present-but-malformed value, so "omitted" and "wrong" stay distinguishable.
 */
function optionalHex(
  source: Record<string, unknown>,
  scheme: Scheme,
  key: string,
): string | undefined {
  return source[key] === undefined ? undefined : hex(source, scheme, key);
}

/**
 * Reads a required hex color out of a scheme object.
 *
 * @throws If the value is absent or not a string, or if it is not a valid `#rrggbb` color (via `parseHex`).
 */
function hex(source: Record<string, unknown>, scheme: Scheme, key: string): string {
  const value = source[key];
  if (typeof value !== "string") {
    throw new Error(`palette.${scheme}.${key} must be a string`);
  }
  parseHex(value); // throws on malformed color
  return value;
}

/**
 * Narrows an unknown JSON value to a plain object.
 *
 * `Array` is excluded explicitly: `typeof [] === "object"`, and accepting an array as a scheme would surface later as confusing "missing key" errors.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
