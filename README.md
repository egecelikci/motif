# Motif

Motif is a color palette I created for my own use, as well as the project I use to automatically
apply it to various software applications. Documentation is available at
<http://ege.celikci.me/motif>.

`spec/palette.json` is the single source of truth for the colors and the accessibility statement.
`gen/` carries the generator, accessibility contract and tests. `forgejo`, `navidrome` and the
`website` folders are for generated artifacts, we have one directory per consumer. Artifacts are
committed on purpose, because that is how consumers get them.

## Adding a Target

1. Add `gen/<name>.ts` exporting a pure `render(palette: Palette): string`.
2. Add one entry to `TARGETS` in `gen/main.ts`.
3. Run `deno task gen`, then commit the generated file.

## Accessibility

Motif targets WCAG 2.2 Level AA for the part a palette can own: text contrast (SC 1.4.3).
`gen/derive.ts` checks the muted text color against every surface a target paints text on, and each
generator fails rather than emit a scheme below 4.5:1.

Explicitly not claimed: SC 1.4.11 (non-text contrast) and the large-text 3:1 threshold, since both
depend on where a target places a color — layout this repo cannot see. The spec's `accessibility`
block and <https://ege.celikci.me/motif> carry the full statement.
