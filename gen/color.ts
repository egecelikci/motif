/**
 * Colour maths shared by every target.
 *
 * The mixing semantics intentionally mirror CSS `color-mix(in srgb, …)`, which
 * blends gamma-encoded sRGB channels (not linear light). Hexes the generator
 * emits for `color-mix()` therefore match what the browser computes.
 */

/** sRGB colour, channels 0–255. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export function parseHex(value: string): Rgb {
  if (!HEX_PATTERN.test(value)) {
    throw new Error(`invalid hex colour (want #rrggbb): ${value}`);
  }
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Mix `t` of `b` into `a` (t=0 → a, t=1 → b), gamma-encoded like CSS. */
export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/** `color-mix(in srgb, a, b t%)` — the browser-side equivalent of `mix`. */
export function mixCss(a: string, b: string, t: number): string {
  return `color-mix(in srgb,${a},${b} ${percent(t)}%)`;
}

/** `color-mix(in srgb, a t%, transparent)`. */
export function alphaCss(a: string, t: number): string {
  return `color-mix(in srgb,${a} ${percent(t)}%,transparent)`;
}

function percent(t: number): number {
  return Math.round(t * 100);
}

function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG 2.x contrast ratio, always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
