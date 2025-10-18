/**
 * Measure the top coordinate of the editor container relative to the viewport.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @returns {number} Container top in pixels (defaults to 0 when unavailable).
 */
export function getContainerTop(view) {
  if (!view?.dom?.getBoundingClientRect) return 0;
  const rect = view.dom.getBoundingClientRect();
  return Number.isFinite(rect?.top) ? rect.top : 0;
}
