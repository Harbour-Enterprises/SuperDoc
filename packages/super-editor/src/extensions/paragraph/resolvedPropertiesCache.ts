import { resolveParagraphProperties } from '@converter/styles.js';
import type { ParagraphProperties } from '@converter/styles.js';
import { findParentNodeClosestToPos } from '@helpers/index.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { ResolvedPos } from 'prosemirror-model';
import type { Editor } from '@core/Editor.js';

const resolvedParagraphPropertiesCache = new WeakMap<PmNode, ParagraphProperties>();

export function getResolvedParagraphProperties(node: PmNode): ParagraphProperties | undefined {
  return resolvedParagraphPropertiesCache.get(node);
}

export function calculateResolvedParagraphProperties(
  editor: Editor,
  node: PmNode,
  $pos: ResolvedPos,
): ParagraphProperties {
  const cached = getResolvedParagraphProperties(node);
  if (cached) {
    return cached;
  }

  const inlineProps = (node.attrs.paragraphProperties as ParagraphProperties | undefined) || {};

  if (!editor.converter) {
    resolvedParagraphPropertiesCache.set(node, inlineProps);
    return inlineProps;
  }

  const inTable = Boolean(findParentNodeClosestToPos($pos, (node) => node.type.name === 'table'));
  const paragraphProperties = resolveParagraphProperties(
    { docx: editor.converter.convertedXml, numbering: editor.converter.numbering },
    inlineProps,
    inTable,
    false,
  );
  resolvedParagraphPropertiesCache.set(node, paragraphProperties);
  return paragraphProperties;
}
