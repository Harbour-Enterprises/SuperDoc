/**
 * Resolve the DOM element representing the visible editing surface for either flow or presentation editors.
 *
 * This function handles three scenarios:
 * 1. Editor IS a PresentationEditor - returns the visible layout surface (element property)
 * 2. Flow Editor with attached PresentationEditor - returns the presentation's visible surface
 * 3. Plain flow Editor - returns the ProseMirror view's DOM element
 */
import type { Editor } from '../Editor.js';

export function getEditorSurfaceElement(editor: Editor | null | undefined): HTMLElement | null {
  if (!editor) return null;

  const maybePresentationEditor = editor as unknown as { hitTest?: unknown; element?: unknown };

  // Check if editor IS a PresentationEditor by looking for PresentationEditor-specific method (hitTest)
  // and the element property. This distinguishes from flow Editor which delegates hitTest to presentationEditor.
  if (typeof maybePresentationEditor.hitTest === 'function' && maybePresentationEditor.element instanceof HTMLElement) {
    return maybePresentationEditor.element;
  }

  // For flow Editor: check for attached PresentationEditor, then fall back to view.dom or options.element
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
