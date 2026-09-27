// Motif — Navidrome themes (light + dark).
//
// Shape mirrors navidrome/ui/src/themes/*.js (MUI v4). Both objects are
// injected into the build and registered in ui/src/themes/index.js; the build
// also patches ui/src/themes/useCurrentTheme.js so the UI's "Auto" preference
// resolves to MotifLight/MotifDark (Navidrome hardcodes Auto to its built-in
// Light/Dark otherwise). See ../navidrome/README.md.
//
// Palette: spec/palette.json. text.secondary uses the a11y-corrected muted
// values, not the raw spec ones (the spec notes targets must darken them).
export const MotifLight = {
  themeName: 'Motif Light',
  palette: {
    primary: { main: '#a60c49' },
    secondary: { main: '#2d6a7a' },
    background: {
      default: '#fef6e4',
      paper: '#f3e1d8',
    },
    text: {
      primary: '#172c66',
      secondary: '#43507d',
    },
    type: 'light',
  },
  player: {
    theme: 'light',
  },
}

export const MotifDark = {
  themeName: 'Motif Dark',
  palette: {
    primary: { main: '#ff8e8c' },
    secondary: { main: '#abd1c6' },
    background: {
      default: '#3a2a55',
      paper: '#4a3a6a',
    },
    text: {
      primary: '#e8e2f3',
      secondary: '#d7d0e3',
    },
    type: 'dark',
  },
  player: {
    theme: 'dark',
  },
}
