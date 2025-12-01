import { helpers } from '@core/index.js';
import type { EditorState } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';

const { findChildren } = helpers;

interface FoundNode {
  node: PmNode;
  pos: number;
}

/**
 * Get all field annotations in the doc.
 * @param state The editor state.
 * @returns The array of field annotations.
 */
export function getAllFieldAnnotations(state: EditorState): FoundNode[] {
  const fieldAnnotations = findChildren(state.doc, (node) => node.type.name === 'fieldAnnotation');

  return fieldAnnotations;
}
