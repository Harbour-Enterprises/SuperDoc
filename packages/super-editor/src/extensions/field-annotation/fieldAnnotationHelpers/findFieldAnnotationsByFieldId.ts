import { helpers } from '@core/index.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

const { findChildren } = helpers;

/**
 * Find field annotations by field ID or array of field IDs.
 */
export function findFieldAnnotationsByFieldId(
  fieldIdOrArray: string | string[],
  state: EditorState,
): Array<{ node: PmNode; pos: number }> {
  const fieldAnnotations = findChildren(state.doc, (node: PmNode) => {
    const isFieldAnnotation = node.type.name === 'fieldAnnotation';
    if (Array.isArray(fieldIdOrArray)) {
      return isFieldAnnotation && fieldIdOrArray.includes(node.attrs.fieldId);
    } else {
      return isFieldAnnotation && node.attrs.fieldId === fieldIdOrArray;
    }
  });

  return fieldAnnotations;
}
