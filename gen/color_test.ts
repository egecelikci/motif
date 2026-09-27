import { assertEquals, assertThrows } from "@std/assert";
import { contrastRatio, mix, mixCss, parseHex, round, toHex } from "./color.ts";

Deno.test("parseHex accepts #rrggbb and rejects everything else", () => {
  assertEquals(parseHex("#172c66"), { r: 23, g: 44, b: 102 });
  assertThrows(() => parseHex("#172c6"));
  assertThrows(() => parseHex("172c66"));
  assertThrows(() => parseHex("#gggggg"));
});

Deno.test("toHex round-trips parsed colours", () => {
  assertEquals(toHex(parseHex("#a60c49")), "#a60c49");
});

Deno.test("mix matches CSS color-mix(in srgb, …) gamma-encoded blending", () => {
  assertEquals(mix("#3a2a55", "#e8e2f3", 0.2), "#5d4f75");
  assertEquals(mix("#f3e1d8", "#172c66", 0.03), "#ecdcd5");
  assertEquals(mixCss("#f3e1d8", "#172c66", 0.03), "color-mix(in srgb,#f3e1d8,#172c66 3%)");
});

Deno.test("contrastRatio matches the WCAG 2.x formula", () => {
  assertEquals(round(contrastRatio("#172c66", "#fef6e4")), 12.29);
  assertEquals(round(contrastRatio("#000000", "#ffffff")), 21);
});
