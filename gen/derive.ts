/**
 * The shared accessibility contract.
 *
 * Motif commits to **WCAG 2.2 Level AA** (`spec.accessibility`). Most of that level is about markup, which this repo does not ship — but one criterion is a property of the palette itself, and it is the one that silently rots:
 *
 * > **SC 1.4.3 Contrast (Minimum)** — normal text needs at least 4.5:1 against its background.
 *
 * Only `textMuted` is checked: `text` clears the threshold by a wide margin, and every other token's contrast depends on where a target places it, which this repo cannot see. The muted color is also the palette's closest text color to the backgrounds, so it fails first — one call to {@link assertAccessible} covers the whole risk.
 *
 * There is deliberately no check for SC 1.4.11 (non-text contrast) or the large-text 3:1 threshold; both need a target's layout and are documented in the spec instead.
 */

import { contrastRatio, mix } from "./color.ts";
import type { Palette, Scheme } from "./palette.ts";

/** WCAG 2.2 SC 1.4.3 minimum for normal text. The value checked in {@link assertAccessible}. */
export const AA_NORMAL_TEXT = 4.5;

/**
 * Every background a target paints text on, as `name → hex`.
 *
 * The names are Forgejo's, because Forgejo's neutral scale is the most demanding consumer: it derives several surfaces *darker* than the palette's own `surface` (the `box-*` steps), and a muted color that passes on `bg` or `surface` can still fail there. Checking against the strictest set means the laxer surfaces — the website's own `--color-surface`, for instance — are correct without being enumerated again.
 *
 * The `mix()` calls mirror the ramps emitted by `gen/forgejo.ts`; if a ramp ratio changes there, change it here too or the check will validate a surface that no longer exists.
 *
 * @returns A fresh map per call; callers must not cache it across palettes.
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
 * Asserts that the scheme's muted text clears {@link AA_NORMAL_TEXT} on every surface from {@link textSurfaces}.
 *
 * @returns The lowest ratio found, so a caller can quote the worst case in the artifact it emits (Forgejo writes it into a CSS comment, which is how a reader of the generated file can tell the check ran).
 * @throws If any surface misses AA, naming the scheme, the color, the surface, and the measured ratio.
 *
 * @example
 * ```ts
 * assertAccessible("light", palette); // 4.83, or throws
 * ```
 */
export function assertAccessible(scheme: Scheme, palette: Palette): number {
  const foreground = palette[scheme].textMuted;
  let worst = Number.POSITIVE_INFINITY;
  for (const [surfaceName, background] of textSurfaces(scheme, palette)) {
    const ratio = contrastRatio(foreground, background);
    if (ratio < AA_NORMAL_TEXT) {
      throw new Error(
        `a11y: ${scheme} textMuted (${foreground}) on ${surfaceName} is ` +
          `${ratio.toFixed(2)}:1, below AA ${AA_NORMAL_TEXT}:1`,
      );
    }
    worst = Math.min(worst, ratio);
  }
  return worst;
}
