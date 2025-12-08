// packages/superdoc/src/components/PdfViewer/PdfViewer.vue
const PDF_VIEWER_CLASS = '.superdoc-pdf-viewer';

export default {
  plugins: [
    (await import('postcss-nested')).default,
    // https://github.com/dbtedman/postcss-prefixwrap
    // This is necessary for pdf.js style scoping.
    (await import('postcss-prefixwrap')).default(PDF_VIEWER_CLASS, {
      whitelist: ['pdf-viewer.css'],
      ignoredSelectors: [],
      prefixRootTags: false,
    }),
  ]
}
