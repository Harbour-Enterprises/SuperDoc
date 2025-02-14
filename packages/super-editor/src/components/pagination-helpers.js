/**
 * Adjusts pagination breaks based on editor zoom/positioning
 * 
 * @param {HTMLElement} editorElem The editor container element
 * @param {Object} editor The editor instance
 * @returns {void}
 */
export function adjustPaginationBreaks(editorElem, editor) {
  if (!editorElem.value || !editor?.value?.options?.scale) return;

  const zoom = editor.value.options.scale;
  const bounds = editorElem.value.getBoundingClientRect();
  const { pageMargins } = editor.value.getPageStyles();
  const marginLeft = pageMargins.left; 

  // Find all `.pagination-break-wrapper` nodes and adjust them
  const breakNodes = editorElem.value.querySelectorAll('.pagination-break-wrapper');

  breakNodes.forEach((node) => {
    const nodeBounds = node.getBoundingClientRect();
    if (nodeBounds.left === bounds.left) return;
    const left = ((nodeBounds.left - bounds.left) / zoom) * -1 + 1;
    const minLeft = Math.min(marginLeft * -96, left)
    node.style.transform = `translateX(${minLeft}px)`;
  });
}

/**
 * Pagination helper to ensure that breaks are always aligned to the editor container
 * @param {HTMLElement} editorElem The editor container element
 * @param {Object} editor The editor instance
 * @returns {MutationObserver} The observer instance
 */
export const observeDomChanges = (editorElem, editor) => {
  if (!editorElem.value || !editor) return;

  const observer = new MutationObserver((mutationsList) => {
    adjustPaginationBreaks(editorElem, editor);
  });

  observer.observe(editorElem.value, {
    childList: true,
    subtree: true,
  });

  return observer;
};
