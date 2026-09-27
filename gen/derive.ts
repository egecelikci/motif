/**
 * Derived values shared by the targets, including the accessibility contract.
 *
 * The spec's raw `textMuted` is only ~4.2:1 on its own surface, so targets must
 * not copy it verbatim. Instead every target uses `mutedTokens`, a ramp mixed
 * from the surface toward the text colour, whose darkest step is verified to
 * meet WCAG 2.2 SC 1.4.3 (AA, 4.5:1) on every surface it can appear on.
 */

import { contrastRatio, mix } from "./color.ts";
import type { Palette, Scheme } from "./palette.ts";

/** WCAG 2.2 SC 1.4.3 minimum for normal text. */
export const AA_NORMAL_TEXT = 4.5;

const MUTED_RATIO = {
  light: [0.82, 0.81, 0.8, 0.79],
  dark: [0.94, 0.93, 0.9, 0.88],
} as const satisfies Record<Scheme, readonly [number, number, number, number]>;

export type MutedTokens = readonly [string, string, string, string];

/** `[text-light, text-light-1, text-light-2, text-light-3]` as hex strings. */
export function mutedTokens(scheme: Scheme, palette: Palette): MutedTokens {
  const mode = palette[scheme];
  const base = scheme === "light" ? mode.surface : mode.bg;
  const [a, b, c, d] = MUTED_RATIO[scheme];
  return [
    mix(base, mode.text, a),
    mix(base, mode.text, b),
    mix(base, mode.text, c),
    mix(base, mode.text, d),
  ];
}

/**
 * Surfaces that carry text in each scheme, as `name → background`. Keep in sync
 * with the ramps emitted by `forgejo.ts`.
 */
export function textSurfaces(scheme: Scheme, palette: Palette): ReadonlyMap<string, string> {
  const mode = palette[scheme];
  if (scheme === "light") {
    return new Map([
      ["body", mode.bg],
      ["input", "#ffffff"],
      ["box-body (zinc50)", mix(mode.surface, mode.text, 0.03)],
      ["box-header (zinc100)", mix(mode.surface, mode.text, 0.06)],
      ["box-body-highlight (zinc200)", mix(mode.surface, mode.text, 0.12)],
    ]);
  }
  return new Map([
    ["body", mode.bg],
    ["card (steel700)", mix(mode.bg, mode.text, 0.14)],
    ["input (steel650)", mix(mode.bg, mode.text, 0.2)],
  ]);
}

/**
 * Validates the muted ramp against every text surface and returns the worst
 * (lowest) ratio. Throws with the offending token/surface when AA is missed.
 */
export function assertAccessible(scheme: Scheme, palette: Palette): number {
  const tokens = mutedTokens(scheme, palette);
  const surfaces = textSurfaces(scheme, palette);
  let worst = Number.POSITIVE_INFINITY;
  for (const [surfaceName, background] of surfaces) {
    for (let i = 0; i < tokens.length; i++) {
      const foreground = tokens[i];
      if (foreground === undefined) continue;
      const ratio = contrastRatio(foreground, background);
      if (ratio < AA_NORMAL_TEXT) {
        const token = i === 0 ? "--color-text-light" : `--color-text-light-${i}`;
        throw new Error(
          `a11y: ${scheme} ${token} (${foreground}) on ${surfaceName} is ` +
            `${ratio.toFixed(2)}:1, below AA ${AA_NORMAL_TEXT}:1`,
        );
      }
      worst = Math.min(worst, ratio);
    }
  }
  return worst;
}
