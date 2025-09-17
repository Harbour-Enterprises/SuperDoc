//@ts-check
/**
 * Strip all inline styles and non-semantic attributes from HTML
 * Preserves structure while removing presentation
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Clean HTML with semantic structure only
 */
export function stripHtmlStyles(html) {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Supported attributes to preserve
  const SUPPORTED_ATTRS = [
    'href',
    'src',
    'alt',
    'title',
    'colspan',
    'rowspan',
    'headers',
    'scope',
    'lang',
    'dir',
    'cite',
    'start',
    'type',
    'styleid',
  ];

  const cleanNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();

      const shouldKeep = SUPPORTED_ATTRS.includes(name) || name.startsWith('data-'); // Keep all data-* attributes

      if (!shouldKeep) {
        node.removeAttribute(attr.name);
      }
    });
    [...node.children].forEach(cleanNode);
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}
