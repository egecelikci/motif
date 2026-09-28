/**
 * Website target: SCSS mixins consumed by <https://ege.celikci.me>.
 *
 * The website owns its own design system — spacing, derivations, brand colors — and only the palette belongs to Motif, so this emits two mixins (`@include motif.light` / `motif.dark`) that assign the palette to the custom properties the site already reads.
 *
 * Mixins rather than `:root` blocks with `[data-theme]` selectors on purpose: the site switches schemes with a `.theme-dark` class *and* a `prefers-color-scheme` query, in different places. Emitting selectors here would hard-code that choice into Motif; a mixin lets the site decide where the values land while Motif stays the source of the values.
 *
 * The site loads it as a Lume remote file pinned to a commit — see that repo's `_config/assets.ts`. It is committed because it is the published interface, not a build by-product.
 */

import { LINE_BANNER } from "./banner.ts";
import type { Palette, PaletteMode, Scheme } from "./palette.ts";

/** The subset of {@link PaletteMode} the website maps to a custom property. */
type MappedToken = keyof PaletteMode;

/**
 * Palette token → the custom property the website consumes.
 *
 * This is the entire translation layer between Motif's vocabulary and the website's. Only properties the site actually uses appear here: `borderHover` is skipped because the site has no hover-border state, and adding an unused custom property would be dead output.
 */
const TOKENS = [
  ["bg", "--color-bg"],
  ["surface", "--color-surface"],
  ["text", "--color-text"],
  ["textMuted", "--color-text-muted"],
  ["border", "--color-border"],
  ["primary", "--color-primary"],
  ["primaryOffset", "--color-primary-offset"],
  ["secondary", "--color-secondary"],
] as const satisfies ReadonlyArray<readonly [MappedToken, string]>;

/**
 * Custom property declarations for one scheme, unindented.
 *
 * Values are copied verbatim from the spec. The website has no contrast check of its own, so it relies on {@link PaletteMode.textMuted} having been validated by `gen/derive.ts` before it arrives.
 */
function declarations(scheme: Scheme, palette: Palette): string[] {
  const mode = palette[scheme];
  return TOKENS.map(([token, property]) => `${property}: ${mode[token]};`);
}

/**
 * Renders `website/_motif.scss` — the partial the website `@use`s.
 *
 * Output is deterministic SCSS: a banner, then one `@mixin light` and one `@mixin dark`, in that order. It is formatted the way `deno fmt` formats SCSS, so the generated file passes `deno fmt --check` like any hand-written source.
 */
export function renderWebsite(palette: Palette): string {
  const mixin = (scheme: Scheme) =>
    `@mixin ${scheme} {\n${declarations(scheme, palette).map((line) => `  ${line}`).join("\n")}\n}`;
  return `${LINE_BANNER}\n\n${mixin("light")}\n\n${mixin("dark")}\n`;
}
