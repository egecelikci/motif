#!/usr/bin/env -S deno run
/**
 * Cut a release on the Forgejo instance.
 *
 * There is no Actions runner on this instance, so releases are created from a
 * workstation after pushing a tag:
 *
 *   git tag v1.2.3 && git push origin v1.2.3
 *   FORGEJO_TOKEN=… deno task release v1.2.3 --dry-run
 *   FORGEJO_TOKEN=… deno task release v1.2.3
 *
 * Forgejo attaches the source archives to the release automatically. Those
 * archives contain the committed generated artifacts, so nothing else needs
 * uploading. `FORGEJO_TOKEN` needs write access to egecelikci/motif.
 */

const API = "https://git.celikci.me/api/v1/repos/egecelikci/motif";
const TOKEN_ENV = "FORGEJO_TOKEN";

const dryRun = Deno.args.includes("--dry-run");
const tag = Deno.args.find((arg) => !arg.startsWith("-"));

if (tag === undefined) {
  console.error("usage: deno task release <tag> [--dry-run]");
  Deno.exit(2);
}

const token = Deno.env.get(TOKEN_ENV);
if (!dryRun && token === undefined) {
  console.error(`${TOKEN_ENV} is not set (needs write access to the repository)`);
  Deno.exit(2);
}

const payload = {
  tag_name: tag,
  name: tag,
  body: `Motif ${tag}`,
  draft: false,
  prerelease: tag.includes("-"),
};

if (dryRun) {
  console.log(`POST ${API}/releases`);
  console.log(JSON.stringify(payload, null, 2));
  Deno.exit(0);
}

const response = await fetch(`${API}/releases`, {
  method: "POST",
  headers: { authorization: `token ${token}`, "content-type": "application/json" },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  console.error(`release failed: ${response.status} ${await response.text()}`);
  Deno.exit(1);
}

const release = (await response.json()) as { html_url?: string };
console.log(`released ${tag}: ${release.html_url ?? "(created)"}`);
