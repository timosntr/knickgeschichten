# Fonts (self-hosted, OFL)

Brand mock-up used **Butik Display** (commercial) and **Proxima Nova** (Adobe Fonts).
Neither is redistributable, so we self-host close open-source substitutes under the
SIL Open Font License (free for non-commercial *and* commercial use, no Google Fonts CDN):

- **Boska** (headings ≈ Butik Display) — high-contrast editorial display serif.
  https://www.fontshare.com/fonts/boska · OFL-1.1
- **Metropolis** (body/UI ≈ Proxima Nova) — geometric sans.
  https://github.com/AJ-Dude/Metropolis · OFL-1.1

woff2 weights here are latin-subset static instances (sourced via Fontsource, OFL).
Swap to the licensed fonts later by replacing the @font-face `src` in src/style.css.

`src/pdf/fonts.js` embeds TTF versions of these same fonts (base64) for use in
exported PDFs via jsPDF — regenerate it if these woff2 files change.
