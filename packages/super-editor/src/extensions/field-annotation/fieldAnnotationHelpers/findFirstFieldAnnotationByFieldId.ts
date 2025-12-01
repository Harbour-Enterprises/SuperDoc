import type { Node as PmNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

/**
 * Find first field annotation by field ID.
 */
export function findFirstFieldAnnotationByFieldId(
  fieldId: string,
  state: EditorState,
): { node: PmNode; pos: number } | null {
  const fieldAnnotation = findNode(state.doc, (node: PmNode) => {
    return node.type.name === 'fieldAnnotation' && node.attrs.fieldId === fieldId;
  });

  return fieldAnnotation;
}

function findNode(node: PmNode, predicate: (node: PmNode) => boolean): { node: PmNode; pos: number } | null {
  let found: { node: PmNode; pos: number } | null = null;
  node.descendants((node: PmNode, pos: number) => {
    if (predicate(node)) found = { node, pos };
    if (found) return false;
  });
  return found;
}
