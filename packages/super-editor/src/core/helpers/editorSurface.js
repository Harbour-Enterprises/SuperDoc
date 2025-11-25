/**
 * Resolve the DOM element representing the visible editing surface for either flow or presentation editors.
 * @param {import('../Editor.js').Editor} editor
 * @returns {HTMLElement|null}
 */
export function getEditorSurfaceElement(editor) {
  if (!editor) return null;

  return editor.presentationEditor?.element ?? editor.view?.dom ?? editor.options?.element ?? null;
}

/**
 * Convert viewport coordinates into a position relative to the active editor surface.
 * Falls back to the current selection when explicit coordinates are unavailable.
 * @param {import('../Editor.js').Editor} editor
 * @param {{ clientX?: number, clientY?: number }} eventLocation
 * @returns {{ left: number, top: number } | null}
 */
export function getSurfaceRelativePoint(editor, eventLocation = {}) {
  const surface = getEditorSurfaceElement(editor);
  if (!surface) return null;

  const rect = surface.getBoundingClientRect();
  let left;
  let top;

  if (typeof eventLocation.clientX === 'number' && typeof eventLocation.clientY === 'number') {
    left = eventLocation.clientX - rect.left;
    top = eventLocation.clientY - rect.top;
  } else if (editor?.state?.selection) {
    const selectionFrom = editor.state.selection.from;
    const coords = editor.coordsAtPos?.(selectionFrom);
    if (coords) {
      left = coords.left - rect.left;
      top = coords.top - rect.top;
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    return null;
  }

  return { left, top };
}
