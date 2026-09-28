/** Tests the website target's interface: mixin names, token coverage, and AA on the site's own surfaces. */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { contrastRatio } from "./color.ts";
import { renderWebsite } from "./css.ts";
import { loadPalette } from "./palette.ts";

const palette = await loadPalette(new URL("../spec/palette.json", import.meta.url));

/** The custom properties the site's `_variables.scss` reads; must match `TOKENS` in `css.ts`. */
const MAPPED = [
  "--color-bg",
  "--color-surface",
  "--color-text",
  "--color-text-muted",
  "--color-border",
  "--color-primary",
  "--color-primary-offset",
  "--color-secondary",
] as const;

/** The site does `@include motif.light` / `motif.dark`; renaming a mixin is a breaking change to the site. */
Deno.test("website partial is a light and a dark mixin", () => {
  const scss = renderWebsite(palette);
  assert(scss.startsWith("// Generated"));
  assertStringIncludes(scss, "@mixin light {");
  assertStringIncludes(scss, "@mixin dark {");
  assertEquals(scss.trimEnd().split("\n").at(-1), "}");
});

/** Catches a token dropped from the mapping: the site would silently fall back to an inherited or undefined value. */
Deno.test("website partial declares every mapped token in both schemes", () => {
  const scss = renderWebsite(palette);
  for (const property of MAPPED) {
    assertEquals(
      scss.match(new RegExp(`${property}:`, "g"))?.length,
      2,
      `${property} should appear once per scheme`,
    );
  }
});

/** The site is not allowed to derive its own muted color; it must be the spec's, so a palette edit is the only way to change it. */
Deno.test("website textMuted comes straight from the spec", () => {
  const scss = renderWebsite(palette);
  for (const scheme of ["light", "dark"] as const) {
    assertStringIncludes(scss, `--color-text-muted: ${palette[scheme].textMuted};`);
  }
});

/**
 * Independent a11y check against the surfaces the *website* uses, which are lighter than the Forgejo surfaces `derive.ts` checks. If `derive.ts` is ever relaxed to only the site's surfaces, or a lighter one is added, this fails. `textDim` is included because the site ships it as real text.
 */
Deno.test("website text colors clear WCAG 2.2 AA on their surfaces", () => {
  for (const scheme of ["light", "dark"] as const) {
    const colors = [palette[scheme].textMuted];
    if (scheme === "dark" && palette.dark.textDim !== undefined) colors.push(palette.dark.textDim);
    for (const color of colors) {
      for (const background of [palette[scheme].bg, palette[scheme].surface]) {
        const ratio = contrastRatio(color, background);
        assert(ratio >= 4.5, `${scheme} ${color} on ${background} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

/** `textDim` is dark-only; emitting it for light too would override the site's own derived dim color with a value it never chose. */
Deno.test("website dark scheme carries the optional textDim token", () => {
  const scss = renderWebsite(palette);
  assertEquals(palette.light.textDim, undefined);
  assertStringIncludes(scss, `--color-text-dim: ${palette.dark.textDim};`);
  assertEquals(scss.match(/--color-text-dim:/g)?.length, 1);
});
