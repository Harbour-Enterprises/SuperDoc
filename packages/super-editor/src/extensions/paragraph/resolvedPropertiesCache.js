import { resolveParagraphProperties } from '@converter/styles.js';
import { findParentNodeClosestToPos } from '@helpers/index.js';

const resolvedParagraphPropertiesCache = new WeakMap();

export function getResolvedParagraphProperties(node) {
  return resolvedParagraphPropertiesCache.get(node);
}

export function calculateResolvedParagraphProperties(editor, node, $pos) {
  if (!editor.converter) {
    return node.attrs.paragraphProperties || {};
  }
  const cached = getResolvedParagraphProperties(node);
  if (cached) {
    return cached;
  }
  const tableNode = findParentNodeClosestToPos($pos, (node) => node.type.name === 'table');
  const tableStyleId = tableNode?.node.attrs.tableStyleId || null;
  const paragraphProperties = resolveParagraphProperties(
    { docx: editor.converter.convertedXml, numbering: editor.converter.numbering },
    node.attrs.paragraphProperties || {},
    Boolean(tableNode),
    false,
    tableStyleId,
  );
  resolvedParagraphPropertiesCache.set(node, paragraphProperties);
  return paragraphProperties;
}
