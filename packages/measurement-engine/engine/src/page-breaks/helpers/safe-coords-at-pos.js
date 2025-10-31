/**
 * Safely read the coordinates for a document position, swallowing ProseMirror errors.
 *
 * @param {import('prosemirror-view').EditorView} view Measurement editor view.
 * @param {number} pos Document position to sample.
 * @returns {{top:number,bottom:number,left:number,right:number}|null} Coordinate object or null when unavailable.
 */
export function safeCoordsAtPos(view, pos) {
  if (!view || typeof pos !== 'number') return null;
  try {
    return view.coordsAtPos(pos);
  } catch {
    return null;
  }
}
