import { resolveParagraphProperties } from '@converter/styles.js';
import { findParentNodeClosestToPos } from '@helpers/index.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { ResolvedPos } from 'prosemirror-model';
import type { Editor } from '@core/Editor.js';

const resolvedParagraphPropertiesCache = new WeakMap<PmNode, Record<string, unknown>>();

export function getResolvedParagraphProperties(node: PmNode): Record<string, unknown> | undefined {
  return resolvedParagraphPropertiesCache.get(node);
}

export function calculateResolvedParagraphProperties(
  editor: Editor,
  node: PmNode,
  $pos: ResolvedPos,
): Record<string, unknown> {
  if (!editor.converter) {
    return node.attrs.paragraphProperties || {};
  }
  const cached = getResolvedParagraphProperties(node);
  if (cached) {
    return cached;
  }
  const inTable = Boolean(findParentNodeClosestToPos($pos, (node) => node.type.name === 'table'));
  const paragraphProperties = resolveParagraphProperties(
    { docx: editor.converter.convertedXml, numbering: editor.converter.numbering },
    node.attrs.paragraphProperties || {},
    inTable,
    false,
  );
  resolvedParagraphPropertiesCache.set(node, paragraphProperties);
  return paragraphProperties;
}
