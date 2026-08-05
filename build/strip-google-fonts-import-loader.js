// The vendored semantic-ui-css stylesheet embeds a live
// `@import url(https://fonts.googleapis.com/...)` for a Lato weight the app
// doesn't use — replaced by the self-hosted Boska/Metropolis fonts. Left in,
// that @import ships in our bundle verbatim (css-loader's `import: false`
// option only skips *parsing* @import, it does not strip the at-rule from the
// output) and fires a request to Google Fonts on every page load: a second,
// hidden third-party request beyond the //cdnjs.cloudflare.com <link> this
// self-hosting is meant to remove. Runs as a raw source transform before
// css-loader ever sees the file — see webpack.config.js.
module.exports = function stripGoogleFontsImport(source) {
  return source.replace(/@import\s+url\(https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g, '');
};
