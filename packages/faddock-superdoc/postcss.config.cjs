// packages/faddock-superdoc/src/components/PdfViewer/PdfViewer.vue
const PDF_VIEWER_CLASS = '.faddock-superdoc-pdf-viewer';

module.exports = {
  plugins: [
    require('postcss-nested'),
    // https://github.com/dbtedman/postcss-prefixwrap
    // This is necessary for pdf.js style scoping.
    require('postcss-prefixwrap')(PDF_VIEWER_CLASS, {
      whitelist: ['pdf-viewer.css'],
      ignoredSelectors: [],
      prefixRootTags: false,
    }),
  ]
}
