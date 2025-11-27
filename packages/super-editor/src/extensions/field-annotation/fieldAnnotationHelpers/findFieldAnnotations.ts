import { getAllFieldAnnotations } from './getAllFieldAnnotations.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

export function findFieldAnnotations(
  predicate: (node: PmNode) => boolean,
  state: EditorState,
): Array<{ node: PmNode; pos: number }> {
  const allFieldAnnotations = getAllFieldAnnotations(state);
  const fieldAnnotations: Array<{ node: PmNode; pos: number }> = [];

  allFieldAnnotations.forEach((annotation: { node: PmNode; pos: number }) => {
    if (predicate(annotation.node)) {
      fieldAnnotations.push(annotation);
    }
  });

  return fieldAnnotations;
}
