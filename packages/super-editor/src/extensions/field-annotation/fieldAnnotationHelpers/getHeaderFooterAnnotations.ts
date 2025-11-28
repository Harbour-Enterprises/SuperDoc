import { getAllHeaderFooterEditors } from '@core/helpers/annotator.js';
import { getAllFieldAnnotations } from './index.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

interface FoundNode {
  node: PmNode;
  pos: number;
}

/**
 * Get all field annotations in the header and footer.
 * @returns An array of field annotations, and which editor they belong to.
 */
export const getHeaderFooterAnnotations = (): FoundNode[] => {
  const editors = getAllHeaderFooterEditors() as Array<{ editor?: { state: { doc: unknown } } }>;

  const allAnnotations: FoundNode[] = [];
  editors.forEach(({ editor }) => {
    if (!editor || !('state' in editor)) return;
    const annotations = getAllFieldAnnotations(editor.state as { doc: PmNode } as EditorState);
    allAnnotations.push(...annotations);
  });
  return allAnnotations;
};
