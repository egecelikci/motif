# Motif

`spec/palette.json` is the single source of truth for the colors and the accessibility statement. `gen/` carries the generator, accessibility contract and tests. `forgejo`, `navidrome` and the `website` folders are for generated artifacts—one directory per consumer. Artifacts are committed on purpose, because that is how consumers get them.
