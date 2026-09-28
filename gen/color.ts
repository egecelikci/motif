/** Color maths shared by every target: sRGB parsing, CSS-parity mixing, WCAG contrast. */

/** sRGB color. Channels are 0–255 floats, not necessarily integers. */
export interface Rgb {
  /** Red channel, 0–255. */
  readonly r: number;
  /** Green channel, 0–255. */
  readonly g: number;
  /** Blue channel, 0–255. */
  readonly b: number;
}

/** Accepted input format: a six-digit hex triplet. Alpha, shorthand, and named colors are rejected. */
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * Parses `#rrggbb` (case-insensitive) into {@link Rgb}.
 *
 * @throws If `value` is not exactly six hex digits after a `#`. Throwing is intentional: an unparseable color is a spec typo, and failing the build is cheaper than silently emitting a broken theme.
 *
 * @example
 * ```ts
 * parseHex("#172c66"); // { r: 23, g: 44, b: 102 }
 * ```
 */
export function parseHex(value: string): Rgb {
  if (!HEX_PATTERN.test(value)) {
    throw new Error(`invalid hex color (want #rrggbb): ${value}`);
  }
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

/**
 * Formats {@link Rgb} back to lowercase `#rrggbb`.
 *
 * Channels are rounded and clamped to two digits, so it accepts the fractional results that {@link mix} produces.
 */
export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/**
 * Mixes `t` of `b` into `a`: `t = 0` returns `a`, `t = 1` returns `b`.
 *
 * Blending happens on gamma-encoded channels, matching `color-mix(in srgb, …)`, so a hex produced here is the same color the browser computes from the equivalent CSS. Contrast against the raw-sRGB approach only shows up on mid-tones, which is exactly where a palette ramp lives.
 *
 * @example
 * ```ts
 * mix("#f3e1d8", "#172c66", 0.03); // "#ecdcd5"
 * ```
 */
export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/**
 * Emits `color-mix(in srgb, a, b t%)` — the browser-side counterpart of {@link mix}.
 *
 * Targets that ship a stylesheet use this instead of a precomputed hex when the value should keep following the CSS variables it references (for example a hover color derived from whichever surface happens to be active).
 */
export function mixCss(a: string, b: string, t: number): string {
  return `color-mix(in srgb,${a},${b} ${percent(t)}%)`;
}

/**
 * Emits `color-mix(in srgb, a t%, transparent)` — mixes a color towards full transparency, preserving its hue. Used for translucent overlays such as hover backgrounds and focus rings.
 */
export function alphaCss(a: string, t: number): string {
  return `color-mix(in srgb,${a} ${percent(t)}%,transparent)`;
}

/**
 * Converts a 0–1 ratio to the integer percentage `color-mix()` expects.
 *
 * Rounded (not truncated) so that e.g. `0.58` does not silently become `57%`; the emitted CSS also stays short and diff-friendly.
 */
function percent(t: number): number {
  return Math.round(t * 100);
}

/**
 * Undoes sRGB gamma encoding for one channel and returns its linear value (0–1), per the WCAG 2.x relative-luminance definition.
 *
 * The two-piece formula and the `0.04045` knee are WCAG's, not an approximation of it — a plain `c ** 2.2` would not match published contrast calculators.
 */
function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * WCAG 2.x relative luminance of a color, 0 (black) to 1 (white).
 *
 * Coefficients are the sRGB ones from the WCAG definition; they are not the human-perception weights used by some other formulas.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * WCAG 2.x contrast ratio between two colors, in the range 1–21.
 *
 * Order does not matter and the result is always >= 1, so a ratio can be compared directly against a threshold such as `AA_NORMAL_TEXT` in `gen/derive.ts`.
 *
 * @example
 * ```ts
 * round(contrastRatio("#172c66", "#fef6e4")); // 12.29
 * ```
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Rounds to `decimals` places.
 *
 * Exists to keep generated comments (e.g. `"worst case 4.83:1"`) and test expectations stable across floating-point noise.
 */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
