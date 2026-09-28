#!/usr/bin/env -S deno run
/**
 * Motif generator — the only writer of the per-target artifacts.
 *
 * ```
 * deno task gen     rewrite every generated file from spec/palette.json
 * deno task check   fail if any generated file is out of date (used by CI)
 * ```
 *
 * ## Contract
 *
 * The generator owns the three output directories (`forgejo/`, `navidrome/`, `website/`) and nothing else. Output is a pure function of `spec/palette.json`: no timestamps, no environment reads, no randomness. That is what makes `check` meaningful — it re-renders into memory and compares bytes, so a mismatch can only mean the committed artifact is stale, never that a build was non-deterministic.
 *
 * Output is also committed, because those files are the interface: Forgejo and Navidrome consume them from a checkout, and the website fetches its partial from the Forgejo origin pinned to a commit. `check` is what keeps the committed copies honest.
 *
 * ## Permissions
 *
 * The task is scoped to the repository (`--allow-read=spec --allow-write=.`) rather than to the individual output directories. Adding a {@link TARGETS} entry therefore needs no change to `deno.json`, and each target creates its own directory before writing. Writes stay inside the repo; `spec/` is the only input.
 */

import { renderWebsite } from "./css.ts";
import { renderForgejo } from "./forgejo.ts";
import { renderNavidrome } from "./navidrome.ts";
import { loadPalette, type Palette } from "./palette.ts";

/**
 * One generated artifact.
 *
 * A target is just "where the bytes go" plus "how to produce them" — deliberately no per-target I/O, formatting, or lifecycle. Anything that needs those belongs in the render function, which must stay pure so `check` can trust it.
 */
interface Target {
  /**
   * Output path, relative to this file (so `../forgejo/motif-light.css`).
   *
   * Relative rather than repo-absolute so the generator works from any working directory and in a checkout that is not named `motif`.
   */
  readonly url: string;

  /**
   * Pure renderer: palette in, file contents out (including the trailing newline and the banner from `gen/banner.ts`).
   *
   * A `Palette` rather than a `Scheme` so color-less targets such as Navidrome, which emits both schemes in one module, fit the same shape.
   */
  readonly render: (palette: Palette) => string;
}

/**
 * The complete registry of generated artifacts.
 *
 * One entry per file, including one per Forgejo scheme, because the two schemes are separate stylesheets Forgejo activates independently. This list is the single place to look to answer "what does `deno task gen` write?".
 */
const TARGETS: readonly Target[] = [
  { url: "../forgejo/motif-light.css", render: (palette) => renderForgejo("light", palette) },
  { url: "../forgejo/motif-dark.css", render: (palette) => renderForgejo("dark", palette) },
  { url: "../navidrome/motif.js", render: renderNavidrome },
  { url: "../website/_motif.scss", render: renderWebsite },
];

/** `--check` runs the whole generator but writes nothing and reports drift instead. */
const check = Deno.args.includes("--check");
const palette = await loadPalette(new URL("../spec/palette.json", import.meta.url));
const stale: string[] = [];

for (const target of TARGETS) {
  const url = new URL(target.url, import.meta.url);
  const content = target.render(palette);
  if (!check) {
    // Create the target directory on demand, so adding a target to TARGETS
    // needs no `git mkdir`/placeholder file to make `gen` work.
    await Deno.mkdir(new URL(".", url), { recursive: true });
    await Deno.writeTextFile(url, content);
    console.log(`wrote ${url.pathname}`);
    continue;
  }
  let onDisk: string | undefined;
  try {
    onDisk = await Deno.readTextFile(url);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    // A missing artifact is stale rather than an error, so CI reports it
    // alongside renamed/edited files instead of failing earlier with ENOENT.
  }
  if (onDisk !== content) stale.push(url.pathname);
}

if (!check) Deno.exit(0);

if (stale.length > 0) {
  console.error(`out of date (run \`deno task gen\`):\n  ${stale.join("\n  ")}`);
  Deno.exit(1);
}
console.log(`ok: ${TARGETS.length} generated files up to date`);
