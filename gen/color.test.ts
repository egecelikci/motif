/** Unit tests for `color.ts`: CSS-parity mixing and the WCAG formulas, pinned to the published definitions. */

import { assertEquals, assertThrows } from "@std/assert";
import { contrastRatio, mix, mixCss, parseHex, round, toHex } from "./color.ts";

/** Guards the accept/reject line: valid `#rrggbb` parses, everything else throws rather than yielding a partial color. */
Deno.test("parseHex accepts #rrggbb and rejects everything else", () => {
  assertEquals(parseHex("#172c66"), { r: 23, g: 44, b: 102 });
  assertThrows(() => parseHex("#172c6"));
  assertThrows(() => parseHex("172c66"));
  assertThrows(() => parseHex("#gggggg"));
});

/** Round-tripping matters because parsed colors are re-emitted into committed artifacts; any drift would show up as a diff. */
Deno.test("toHex round-trips parsed colors", () => {
  assertEquals(toHex(parseHex("#a60c49")), "#a60c49");
});

/**
 * The CSS-parity guarantee. If `mix` ever switches to linear-light blending these expectations fail, which is the point: Forgejo's ramps are `color-mix()` expressions that must equal the hexes `derive.ts` measures for contrast.
 */
Deno.test("mix matches CSS color-mix(in srgb, …) gamma-encoded blending", () => {
  assertEquals(mix("#3a2a55", "#e8e2f3", 0.2), "#5d4f75");
  assertEquals(mix("#f3e1d8", "#172c66", 0.03), "#ecdcd5");
  assertEquals(mixCss("#f3e1d8", "#172c66", 0.03), "color-mix(in srgb,#f3e1d8,#172c66 3%)");
});

/** Anchors the accessibility contract to the WCAG reference points: 21:1 for black on white, and the spec's own body-text pair. */
Deno.test("contrastRatio matches the WCAG 2.x formula", () => {
  assertEquals(round(contrastRatio("#172c66", "#fef6e4")), 12.29);
  assertEquals(round(contrastRatio("#000000", "#ffffff")), 21);
});
