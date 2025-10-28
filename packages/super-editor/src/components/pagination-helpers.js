/**
 * Realign pagination break wrappers when the editor is zoomed.
 *
 * @param {import('vue').Ref<HTMLElement | null>} editorElem Vue ref to the editor container element
 * @param {import('vue').Ref<import('../core/Editor.js').Editor | null>} editor Vue ref holding the SuperEditor instance
 */
export function adjustPaginationBreaks(editorElem, editor) {
  if (!editorElem.value || !editor?.value?.options?.scale) return;

  const zoom = editor.value.options.scale;
  const bounds = editorElem.value.getBoundingClientRect();

  // Find all `.pagination-break-wrapper` nodes and adjust them
  const breakNodes = editorElem.value.querySelectorAll('.pagination-break-wrapper');
  let firstLeft;

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
      node.style.transform = `translateX(${diff}px)`;
    }
  });
}
