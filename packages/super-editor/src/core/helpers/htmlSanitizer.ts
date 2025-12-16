/**
 * Strip all inline styles(but alignment) and non-semantic attributes from HTML
 * Preserves structure while removing presentation
 *
 * @param html - Raw HTML string
 * @returns Clean HTML with semantic structure only
 */
export function stripHtmlStyles(html: string): string {
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

  const cleanNode = (node: Node): void => {
    if (node.nodeType !== window.Node.ELEMENT_NODE) return;

    const element = node as Element;

    // Process spans with only text inside
    if (element.nodeName.toLowerCase() === 'span' && !element.children.length) {
      element.innerHTML = preserveSpaces(element.innerHTML);
    }

    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();

      if (name === 'style') {
        const cleanedStyle = cleanStyle(attr.value);
        if (!cleanedStyle) {
          element.removeAttribute(attr.name);
        } else element.setAttribute(attr.name, cleanedStyle);

        return;
      }

      const shouldKeep = SUPPORTED_ATTRS.includes(name) || name.startsWith('data-'); // Keep all data-* attributes

      if (!shouldKeep) {
        element.removeAttribute(attr.name);
      }
    });
    Array.from(element.children).forEach(cleanNode);
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/**
 * Strip all styles except of alignment
 *
 * @param style - Style attribute value
 * @returns Clean style string with supported styling
 */
function cleanStyle(style: string): string {
  if (!style) return '';

  const declarations = style
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  const textAlign = declarations.find((d) => d.startsWith('text-align'));

  return textAlign ? `${textAlign};` : '';
}

/**
 * Replaces all leading and trailing spaces inside innerHtml with special space symbol
 *
 * @param innerHtml - innerHtml of DOM node
 * @returns Updated innerHTML
 */
function preserveSpaces(innerHtml: string): string {
  return innerHtml.replace(/^\s+/, '&nbsp;').replace(/\s+$/, '&nbsp;');
}
