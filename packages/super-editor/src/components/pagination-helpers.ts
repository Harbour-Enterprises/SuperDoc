import { isHeadless } from '@/utils/headless-helpers.js';
import type { Editor } from '../core/Editor.js';
import type { Ref } from 'vue';

/**
 * Adjusts pagination breaks based on editor zoom/positioning
 *
 * @param {HTMLElement} editorElem The editor container element
 * @param {Object} editor The editor instance
 * @returns {void}
 */
export function adjustPaginationBreaks(
  editorElem: Ref<HTMLElement | undefined>,
  editor: Ref<Editor | undefined>,
): void {
  if (!editorElem.value || !editor?.value?.options?.scale || isHeadless(editor)) return;

  const zoom = editor.value.options.scale;
  const bounds = editorElem.value.getBoundingClientRect();

  // Find all `.pagination-break-wrapper` nodes and adjust them
  const breakNodes = editorElem.value.querySelectorAll('.pagination-break-wrapper');
  let firstLeft: number | undefined;

  // We align all nodes to the first one, which is guaranteed to be in the right place
  // since its the original header and is not generated inside any document node
  breakNodes.forEach((node) => {
    const nodeBounds = node.getBoundingClientRect();
    const left = ((nodeBounds.left - bounds.left) / zoom) * -1 + 1;
    if (!firstLeft) firstLeft = left;
    if (left !== firstLeft) {
      const diff = left - firstLeft;
      // Note: elements with "position: fixed" do not work correctly with transform style.
      // node.style.left = `${diff}px`;
      (node as HTMLElement).style.transform = `translateX(${diff}px)`;
    }
  });
}
