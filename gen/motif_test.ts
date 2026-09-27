import { assert, assertEquals } from "@std/assert";
import { contrastRatio } from "./color.ts";
import { assertAccessible, mutedTokens, textSurfaces } from "./derive.ts";
import { renderForgejo } from "./forgejo.ts";
import { renderNavidrome } from "./navidrome.ts";
import { loadPalette } from "./palette.ts";

const palette = await loadPalette(new URL("../spec/palette.json", import.meta.url));

Deno.test("muted tokens meet WCAG 2.2 AA in both schemes", () => {
  assert(assertAccessible("light", palette) >= 4.5);
  assert(assertAccessible("dark", palette) >= 4.5);
});

Deno.test("muted ramp gets progressively lighter", () => {
  for (const scheme of ["light", "dark"] as const) {
    const tokens = mutedTokens(scheme, palette);
    const body = textSurfaces(scheme, palette).get("body");
    assert(body !== undefined);
    const ratios = tokens.map((token) => contrastRatio(token, body));
    for (let index = 1; index < ratios.length; index++) {
      const previous = ratios[index - 1] ?? 0;
      const current = ratios[index] ?? 0;
      assert(current < previous, `${scheme} step ${index} is not lighter than step ${index - 1}`);
    }
  }
});

Deno.test("forgejo fragment declares the key overrides", () => {
  const css = renderForgejo("light", palette);
  for (const name of ["--color-body", "--zinc-50", "--zinc-900", "--color-primary-alpha-90"]) {
    assert(css.includes(name), `missing ${name}`);
  }
  assert(css.startsWith("/* Generated"));
  assert(css.trimEnd().endsWith("}"));
});

Deno.test("navidrome exports both variants", () => {
  const js = renderNavidrome(palette);
  assert(js.includes("export const MotifLight"));
  assert(js.includes("export const MotifDark"));
  assert(js.includes('type: "light"') && js.includes('type: "dark"'));
});

Deno.test("committed artifacts match the generator output", async () => {
  assertEquals(
    await Deno.readTextFile(new URL("../forgejo/motif-light.css", import.meta.url)),
    renderForgejo("light", palette),
  );
  assertEquals(
    await Deno.readTextFile(new URL("../forgejo/motif-dark.css", import.meta.url)),
    renderForgejo("dark", palette),
  );
  assertEquals(
    await Deno.readTextFile(new URL("../navidrome/motif.js", import.meta.url)),
    renderNavidrome(palette),
  );
});
