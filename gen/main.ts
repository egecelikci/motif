#!/usr/bin/env -S deno run
/**
 * Motif generator — the only writer of the per-target artifacts.
 *
 *   deno task gen     rewrite the generated files from spec/palette.json
 *   deno task check   fail if the generated files are out of date (used in CI)
 *
 * Both modes require only the permissions declared in `deno.json`.
 */

import { renderForgejo } from "./forgejo.ts";
import { renderNavidrome } from "./navidrome.ts";
import { loadPalette, type Palette } from "./palette.ts";

interface Target {
  /** Path relative to this file. */
  readonly url: string;
  readonly render: (palette: Palette) => string;
}

const TARGETS: readonly Target[] = [
  { url: "../forgejo/motif-light.css", render: (palette) => renderForgejo("light", palette) },
  { url: "../forgejo/motif-dark.css", render: (palette) => renderForgejo("dark", palette) },
  { url: "../navidrome/motif.js", render: renderNavidrome },
];

const check = Deno.args.includes("--check");
const palette = await loadPalette(new URL("../spec/palette.json", import.meta.url));
const stale: string[] = [];

for (const target of TARGETS) {
  const url = new URL(target.url, import.meta.url);
  const content = target.render(palette);
  if (!check) {
    await Deno.writeTextFile(url, content);
    console.log(`wrote ${url.pathname}`);
    continue;
  }
  let onDisk: string | undefined;
  try {
    onDisk = await Deno.readTextFile(url);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  if (onDisk !== content) stale.push(url.pathname);
}

if (!check) Deno.exit(0);

if (stale.length > 0) {
  console.error(`out of date (run \`deno task gen\`):\n  ${stale.join("\n  ")}`);
  Deno.exit(1);
}
console.log(`ok: ${TARGETS.length} generated files up to date`);
