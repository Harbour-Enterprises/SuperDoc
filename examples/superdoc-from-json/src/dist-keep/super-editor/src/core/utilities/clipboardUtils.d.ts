/**
 * Serializes the current selection in the editor state to HTML and plain text for clipboard use.
 * @param {EditorState} state - The ProseMirror editor state containing the current selection.
 * @returns {{ htmlString: string, text: string }} An object with the HTML string and plain text of the selection.
 */
export function serializeSelectionToClipboard(state: EditorState): {
    htmlString: string;
    text: string;
};
/**
 * Writes HTML and plain text data to the system clipboard.
 * Uses the Clipboard API if available, otherwise falls back to plain text.
 * @param {{ htmlString: string, text: string }} param0 - The HTML and plain text to write to the clipboard.
 * @returns {Promise<void>} A promise that resolves when the clipboard write is complete.
 */
export function writeToClipboard({ htmlString, text }: {
    htmlString: string;
    text: string;
}): Promise<void>;
/**
 * Reads content from the system clipboard and parses it into a ProseMirror fragment.
 * Attempts to read HTML first, falling back to plain text if necessary.
 * @param {EditorState} state - The ProseMirror editor state, used for schema and parsing.
 * @returns {Promise<ProseMirrorNode|null>} A promise that resolves to a ProseMirror fragment or text node, or null if reading fails.
 */
export function readFromClipboard(state: EditorState): Promise<ProseMirrorNode | null>;
