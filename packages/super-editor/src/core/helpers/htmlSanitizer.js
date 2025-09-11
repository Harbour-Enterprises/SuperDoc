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

  // Semantic attributes to preserve
  const SEMANTIC_ATTRS = [
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
    'type', // for lists
  ];

  const cleanNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // Remove all non-semantic attributes
    [...node.attributes].forEach((attr) => {
      if (!SEMANTIC_ATTRS.includes(attr.name.toLowerCase())) {
        node.removeAttribute(attr.name);
      }
    });

    // Recursively clean children
    [...node.children].forEach(cleanNode);
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}
