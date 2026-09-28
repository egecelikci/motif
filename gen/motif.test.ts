/** Cross-target tests: the spec's a11y contract, each target's shape, and that committed artifacts match the generator. */

import { assert, assertEquals } from "@std/assert";
import { renderWebsite } from "./css.ts";
import { assertAccessible } from "./derive.ts";
import { renderForgejo } from "./forgejo.ts";
import { renderNavidrome } from "./navidrome.ts";
import { loadPalette } from "./palette.ts";

const palette = await loadPalette(new URL("../spec/palette.json", import.meta.url));

/** The headline accessibility promise; fails with the offending surface when the palette can no longer keep it. */
Deno.test("spec textMuted meets WCAG 2.2 AA in both schemes", () => {
  assert(assertAccessible("light", palette) >= 4.5);
  assert(assertAccessible("dark", palette) >= 4.5);
});

/** Locks in the "one AA-checked muted value, four slots" decision so a future edit cannot quietly reintroduce a derived ramp. */
Deno.test("forgejo muted slots all carry the spec's textMuted", () => {
  const names = [
    "--color-text-light",
    "--color-text-light-1",
    "--color-text-light-2",
    "--color-text-light-3",
  ];
  for (const scheme of ["light", "dark"] as const) {
    const css = renderForgejo(scheme, palette);
    for (const name of names) {
      assert(css.includes(`${name}: ${palette[scheme].textMuted};`), `${scheme} ${name}`);
    }
  }
});

/** Smoke test for the fragment's shape: the base overrides, a ramp endpoint, the banner, and a closed block. */
Deno.test("forgejo fragment declares the key overrides", () => {
  const css = renderForgejo("light", palette);
  for (const name of ["--color-body", "--zinc-50", "--zinc-900", "--color-primary-alpha-90"]) {
    assert(css.includes(name), `missing ${name}`);
  }
  assert(css.startsWith("/* Generated"));
  assert(css.trimEnd().endsWith("}"));
});

/** Navidrome's "Auto" setting needs both themes exported, each tagged with its own `type`. */
Deno.test("navidrome exports both variants", () => {
  const js = renderNavidrome(palette);
  assert(js.includes("export const MotifLight"));
  assert(js.includes("export const MotifDark"));
  assert(js.includes('type: "light"') && js.includes('type: "dark"'));
});

/** Guards against a template literal degrading to a plain string: the artifact would ship `${…}` verbatim, and `check` cannot catch it because source and artifact then agree. */
Deno.test("generated artifacts contain no unexpanded placeholders", async () => {
  const files = [
    "../forgejo/motif-light.css",
    "../forgejo/motif-dark.css",
    "../navidrome/motif.js",
    "../website/_motif.scss",
  ];
  for (const file of files) {
    const content = await Deno.readTextFile(new URL(file, import.meta.url));
    assert(!content.includes("${"), `${file} contains an unexpanded \${...}`);
  }
});

/**
 * Freshness check: the committed artifacts equal a live render.
 *
 * `deno task check` runs the same comparison against the working tree; this test fails the suite directly so a stale artifact is caught by `deno task test` alone, with the offending path named by `assertEquals`.
 */
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
  assertEquals(
    await Deno.readTextFile(new URL("../website/_motif.scss", import.meta.url)),
    renderWebsite(palette),
  );
});
