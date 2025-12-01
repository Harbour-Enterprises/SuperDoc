import { posToDOMRect } from '@core/helpers/index.js';
import { getAllFieldAnnotations } from './getAllFieldAnnotations.js';
import type { EditorView } from 'prosemirror-view';
import type { EditorState } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';

interface FieldAnnotationWithRect {
  node: PmNode;
  pos: number;
  rect: DOMRect | null;
}

/**
 * Get all field annotations with rects in the doc.
 * @param view The editor view.
 * @param state The editor state.
 * @returns The array of field annotations with rects.
 */
export function getAllFieldAnnotationsWithRect(view: EditorView, state: EditorState): FieldAnnotationWithRect[] {
  const fieldAnnotations = getAllFieldAnnotations(state).map(({ node, pos }) => {
    const rect = posToDOMRect(view, pos, pos + node.nodeSize);
    return {
      node,
      pos,
      rect,
    };
  });

  return fieldAnnotations;
}
