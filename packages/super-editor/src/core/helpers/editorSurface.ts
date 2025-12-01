/**
 * Resolve the DOM element representing the visible editing surface for either flow or presentation editors.
 */
import type { Editor } from '../Editor.js';

export function getEditorSurfaceElement(editor: Editor | null | undefined): HTMLElement | null {
  if (!editor) return null;

  return editor.presentationEditor?.element ?? editor.view?.dom ?? editor.options?.element ?? null;
}

/**
 * Convert viewport coordinates into a position relative to the active editor surface.
 * Falls back to the current selection when explicit coordinates are unavailable.
 */
export function getSurfaceRelativePoint(
  editor: Editor | null | undefined,
  eventLocation: { clientX?: number; clientY?: number } = {},
): { left: number; top: number } | null {
  const surface = getEditorSurfaceElement(editor);
  if (!surface) return null;

  const rect = surface.getBoundingClientRect();
  let left: number | undefined;
  let top: number | undefined;

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

  return { left: left as number, top: top as number };
}
