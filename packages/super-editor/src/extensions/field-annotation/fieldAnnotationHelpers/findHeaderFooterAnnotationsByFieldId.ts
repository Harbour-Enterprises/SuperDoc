import { helpers } from '@core/index.js';
import { getAllHeaderFooterEditors } from '../../../core/helpers/annotator.js';
import type { Editor } from '@core/index.js';
import type { Node as PmNode } from 'prosemirror-model';

const { findChildren } = helpers;

/**
 * Find field annotations in headers and footers by field ID or array of field IDs.
 */
export function findHeaderFooterAnnotationsByFieldId(
  fieldIdOrArray: string | string[],
  editor: Editor,
  activeSectionEditor: Editor,
): Array<{ node: PmNode; pos: number }> {
  const sectionEditors = getAllHeaderFooterEditors() as Array<{ editor: Editor }>;
  const annotations: Array<{ node: PmNode; pos: number }> = [];
  sectionEditors.forEach(({ editor: sectionEditor }) => {
    const state =
      activeSectionEditor.options.documentId === sectionEditor.options.documentId
        ? activeSectionEditor.state
        : sectionEditor.state;
    const fieldAnnotations = findChildren(state.doc, (node: PmNode) => {
      const isFieldAnnotation = node.type.name === 'fieldAnnotation';
      if (Array.isArray(fieldIdOrArray)) {
        return isFieldAnnotation && fieldIdOrArray.includes(node.attrs.fieldId);
      } else {
        return isFieldAnnotation && node.attrs.fieldId === fieldIdOrArray;
      }
    });
    annotations.push(...fieldAnnotations);
  });

  return annotations;
}
