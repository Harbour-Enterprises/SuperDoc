import { defaultNodeListHandler } from './docxImporter';

/**
 * Extract plain text from imported ProseMirror JSON nodes.
 * @param {Array<{type: string, text?: string, content?: any[]}>} nodes
 * @returns {string}
 */
const extractPlainText = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return '';
  const parts = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text);
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  };
  nodes.forEach(walk);
  return parts.join('').replace(/\s+/g, ' ').trim();
};

/**
 * Remove w:footnoteRef placeholders from converted footnote content.
 * In OOXML footnotes, the first run often includes a w:footnoteRef marker which
 * Word uses to render the footnote number. We render numbering ourselves.
 *
 * @param {Array} nodes
 * @returns {Array}
 */
const stripFootnoteMarkerNodes = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes;
  const walk = (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const node = list[i];
      if (!node) continue;
      if (node.type === 'passthroughInline' && node.attrs?.originalName === 'w:footnoteRef') {
        list.splice(i, 1);
        continue;
      }
      if (Array.isArray(node.content)) {
        walk(node.content);
      }
    }
  };
  const copy = JSON.parse(JSON.stringify(nodes));
  walk(copy);
  return copy;
};

/**
 * Parse footnotes.xml into SuperDoc-ready footnote entries.
 *
 * These will be available on converter.footnotes and are used by PresentationEditor
 * to build a footnotes panel.
 *
 * @param {Object} params
 * @param {ParsedDocx} params.docx The parsed docx object
 * @param {NodeListHandler} [params.nodeListHandler] Optional node list handler (defaults to docxImporter default)
 * @param {SuperConverter} params.converter The super converter instance
 * @param {Editor} params.editor The editor instance
 * @param {Object} [params.numbering] Numbering definitions (optional)
 * @returns {Array<{id: string, content: any[], text: string}>}
 */
export function importFootnoteData({ docx, editor, converter, nodeListHandler, numbering } = {}) {
  const handler = nodeListHandler || defaultNodeListHandler();
  const footnotes = docx?.['word/footnotes.xml'];
  if (!footnotes?.elements?.length) return [];

  const root = footnotes.elements[0];
  const elements = Array.isArray(root?.elements) ? root.elements : [];
  const footnoteElements = elements.filter((el) => el?.name === 'w:footnote');
  if (footnoteElements.length === 0) return [];

  const results = [];
  const lists = {};
  const inlineDocumentFonts = [];
  footnoteElements.forEach((el) => {
    const idRaw = el?.attributes?.['w:id'];
    if (idRaw === undefined || idRaw === null) return;
    const id = String(idRaw);
    const idNumber = Number(id);
    // Skip special footnotes by explicit type (Word uses these for separators).
    const type = el?.attributes?.['w:type'];
    if (type === 'separator' || type === 'continuationSeparator') return;
    // Be permissive about ids: some producers emit footnotes starting at 0.
    // Only skip negative ids (Word uses -1 for separator).
    if (!Number.isFinite(idNumber) || idNumber < 0) return;

    const childElements = Array.isArray(el.elements) ? el.elements : [];
    const converted = handler.handler({
      nodes: childElements,
      nodeListHandler: handler,
      docx,
      editor,
      converter,
      numbering,
      lists,
      inlineDocumentFonts,
      path: [el],
    });

    const stripped = stripFootnoteMarkerNodes(converted);
    results.push({
      id,
      content: stripped,
      text: extractPlainText(stripped),
    });
  });

  return results;
}
