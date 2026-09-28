/**
 * Navidrome target.
 *
 * Navidrome supports no external theme loading — there is no stylesheet or config file it will read at runtime. Its themes are Material-UI palette objects compiled into the UI bundle, so the only way to theme it is to replace a source module and rebuild. This target therefore emits **source code**, not a stylesheet: `navidrome/motif.js` is dropped into a Navidrome checkout.
 *
 * Both schemes live in one module because Navidrome's "Auto" setting resolves `light`/`dark` itself. In `ui/src/themes/index.js`, `LightTheme` and `DarkTheme` are `./light` and `./dark`, and `useCurrentTheme` hands those to `AUTO_THEME_ID`. So the integration is simply replacing those two modules with this file's two exports — no patch to `useCurrentTheme` is needed, and a single scheme would leave "Auto" showing the stock palette half the time.
 *
 * Two details are Navidrome workarounds rather than palette decisions:
 *
 * - `palette.type` — read by `useCurrentTheme` (`theme.palette?.type === "dark"`) to set the body background. Required; MUI v5's `mode` would not be read.
 * - `overrides.NDLogin.systemNameLink` — the login screen's link has a hard-coded fallback to MUI indigo and ignores the palette unless overridden explicitly. Stock Navidrome themes set it the same way.
 *
 * `player.stylesheet` is intentionally omitted: it is optional in `useCurrentTheme` (guarded by an `if`), and Motif has no player CSS to inject. `player.theme` is kept for parity with the stock themes.
 */

import { LINE_BANNER } from "./banner.ts";
import type { Palette } from "./palette.ts";

/**
 * Renders `navidrome/motif.js`: an ES module exporting `MotifLight` and `MotifDark` MUI theme objects.
 *
 * Only the roles Navidrome understands are mapped — MUI derives the rest from `primary`/`secondary`/`background`/`text`. `textMuted` is used as MUI's `text.secondary`, so the same AA-checked color the other targets ship is what Navidrome renders as secondary text.
 *
 * Output is indented and quoted the way `deno fmt` formats TypeScript, so the generated module passes `deno fmt --check`.
 */
export function renderNavidrome(palette: Palette): string {
  const { light, dark } = palette;
  const lightMuted = light.textMuted;
  const darkMuted = dark.textMuted;

  return [
    LINE_BANNER,
    "",
    "export const MotifLight = {",
    '  themeName: "Motif Light",',
    "  palette: {",
    `    primary: { main: "${light.primary}" },`,
    `    secondary: { main: "${light.secondary}" },`,
    `    background: { default: "${light.bg}", paper: "${light.surface}" },`,
    `    text: { primary: "${light.text}", secondary: "${lightMuted}" },`,
    '    type: "light",',
    "  },",
    "  overrides: {",
    `    NDLogin: { systemNameLink: { color: "${light.primary}" } },`,
    "  },",
    '  player: { theme: "light" },',
    "};",
    "",
    "export const MotifDark = {",
    '  themeName: "Motif Dark",',
    "  palette: {",
    `    primary: { main: "${dark.primary}" },`,
    `    secondary: { main: "${dark.secondary}" },`,
    `    background: { default: "${dark.bg}", paper: "${dark.surface}" },`,
    `    text: { primary: "${dark.text}", secondary: "${darkMuted}" },`,
    '    type: "dark",',
    "  },",
    "  overrides: {",
    `    NDLogin: { systemNameLink: { color: "${dark.primary}" } },`,
    "  },",
    '  player: { theme: "dark" },',
    "};",
    "",
  ].join("\n");
}
