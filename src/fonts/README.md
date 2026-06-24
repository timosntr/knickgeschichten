# Fonts (self-hosted, OFL)

Brand mock-up used **Butik Display** (commercial) and **Proxima Nova** (Adobe Fonts).
Neither is redistributable, so we self-host close open-source substitutes under the
SIL Open Font License (free for non-commercial *and* commercial use, no Google Fonts CDN):

- **Fraunces** (headings ≈ Butik Display) — high-contrast editorial display serif.
  https://github.com/undercasetype/Fraunces  · OFL-1.1
- **Hanken Grotesk** (body/UI ≈ Proxima Nova) — humanist geometric sans.
  https://github.com/hanken-design/HankenGrotesk · OFL-1.1

woff2 weights here are latin-subset static instances (sourced via Fontsource, OFL).
Swap to the licensed fonts later by replacing the @font-face `src` in src/style.css.
