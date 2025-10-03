//@ts-check
/**
 * Strip all inline styles(but alignment) and non-semantic attributes from HTML
 * Preserves structure while removing presentation
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Clean HTML with semantic structure only
 */
export function stripHtmlStyles(html) {
  if (!html) return '';

  const parser = new window.DOMParser();
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
    if (node.nodeType !== window.Node.ELEMENT_NODE) return;

    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();

      if (name === 'style') {
        const cleanedStyle = cleanStyle(attr.value);
        if (!cleanedStyle) {
          node.removeAttribute(attr.name);
        } else node.setAttribute(attr.name, cleanedStyle);

        return;
      }

      const shouldKeep = SUPPORTED_ATTRS.includes(name) || name.startsWith('data-'); // Keep all data-* attributes

      if (!shouldKeep) {
        node.removeAttribute(attr.name);
      }

      if (node.nodeName.toLowerCase() === 'span') {
        // Preserve trailing spaces
        node.innerHTML = node.innerHTML.replace(/(\S) (<\/span>)/g, '$1&nbsp;$2');
      }
    });
    [...node.children].forEach(cleanNode);
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/**
 * Strip all styles except of alignment
 *
 * @param {string} style - Style attribute value
 * @returns {string} Clean style string with supported styling
 */
function cleanStyle(style) {
  if (!style) return '';

  const declarations = style
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  const textAlign = declarations.find((d) => d.startsWith('text-align'));

  return textAlign ? `${textAlign};` : '';
}
