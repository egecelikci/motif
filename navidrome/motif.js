// Motif — Navidrome theme (dark).
//
// Shape mirrors navidrome/ui/src/themes/dark.js (MUI v4). This file must be
// copied into navidrome/ui/src/themes/ and registered in index.js, then the UI
// rebuilt — Navidrome has no external theme loading. See ../README.md.
//
// Palette: spec/palette.json (dark).
export default {
  themeName: 'Motif',
  palette: {
    primary: { main: '#ff8e8c' },
    secondary: { main: '#abd1c6' },
    background: {
      default: '#3a2a55',
      paper: '#4a3a6a',
    },
    text: {
      primary: '#e8e2f3',
      secondary: '#d0c8e8',
    },
    type: 'dark',
  },
  overrides: {
    MuiAppBar: {
      colorPrimary: { backgroundColor: '#4a3a6a' },
    },
  },
  player: {
    theme: 'dark',
    // stylesheet: stylesheet,  // add ./motif.css.js to theme the audio player
  },
}
