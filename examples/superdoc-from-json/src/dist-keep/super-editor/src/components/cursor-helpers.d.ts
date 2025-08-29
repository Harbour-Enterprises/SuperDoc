/**
 * Checks if the current selection is inside a node or mark with the given name.
 * Optionally, can restrict the check to only the start or end of the selection (not anywhere in the range).
 *
 * @param {EditorState} state - The ProseMirror editor state.
 * @param {string} name - The node or mark name to check for (e.g. 'paragraph', 'link').
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.requireEnds=false] - If true, only checks if the start or end of the selection has the node/mark, not if it exists anywhere in the selection.
 *
 * This is useful for cases like showing a link popup: you may only want to show the popup if the selection starts or ends with a link, not if a link exists anywhere in the selection.
 *
 * @returns {boolean}
 */
export function selectionHasNodeOrMark(state: EditorState, name: string, options?: {
    requireEnds?: boolean;
}): boolean;
/**
 * Move the editor cursor to the position closest to the mouse event
 * @param {MouseEvent} event
 * @param {Object} editor - The editor instance
 */
export function moveCursorToMouseEvent(event: MouseEvent, editor: any): void;
export function onMarginClickCursorChange(event: MouseEvent, editor: SuperEditor): void;
export function checkNodeSpecificClicks(editor: Editor, event: any, popoverControls: any): void;
