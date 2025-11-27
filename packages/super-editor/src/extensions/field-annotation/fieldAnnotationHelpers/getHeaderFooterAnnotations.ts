import { getAllHeaderFooterEditors } from '@core/helpers/annotator.js';
import { getAllFieldAnnotations } from './index.js';
import type { Node as PmNode } from 'prosemirror-model';

interface FoundNode {
  node: PmNode;
  pos: number;
}

/**
 * Get all field annotations in the header and footer.
 * @returns An array of field annotations, and which editor they belong to.
 */
export const getHeaderFooterAnnotations = (): FoundNode[] => {
  const editors = getAllHeaderFooterEditors();

  const allAnnotations: FoundNode[] = [];
  editors.forEach(({ editor }) => {
    const annotations = getAllFieldAnnotations(editor.state);
    allAnnotations.push(...annotations);
  });
  return allAnnotations;
};
