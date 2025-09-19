import { selectionHasNodeOrMark } from '../cursor-helpers.js';
import { readFromClipboard } from '../../core/utilities/clipboardUtils.js';
import { tableActionsOptions } from './constants.js';
import { markRaw } from 'vue';
/**
 * Get props by item id
 *
 * Takes in the itemId for the menu item and passes the SlashMenu props to help
 * compute the props needed
 * @param {string} itemId
 * @param {Object} props
 * @returns {Object}
 */
export const getPropsByItemId = (itemId, props) => {
  // Common props that are needed regardless of trigger type
  const editor = props.editor;

  const baseProps = {
    editor: markRaw(props.editor),
  };

  switch (itemId) {
    case 'insert-text':
      const { state } = editor.view;
      const { from, to, empty } = state.selection;
      const selectedText = !empty ? state.doc.textBetween(from, to) : '';

      return {
        ...baseProps,
        selectedText,
        handleClose: props.closePopover || (() => null),
        apiKey: editor.options?.aiApiKey,
        endpoint: editor.options?.aiEndpoint,
      };
    case 'insert-link':
      return baseProps;
    case 'insert-table':
      return {
        ...baseProps,
        onSelect: ({ rows, cols }) => {
          editor.commands.insertTable({ rows, cols });
          props.closePopover();
        },
      };
    case 'edit-table':
      return {
        ...baseProps,
        options: tableActionsOptions,
        onSelect: ({ command }) => {
          if (editor.commands[command]) {
            editor.commands[command]();
          }
          props.closePopover();
        },
      };
    case 'copy':
    case 'paste':
      return {
        ...baseProps,
        // These actions don't need additional props
      };

    default:
      return baseProps;
  }
};

/**
 * Get the current editor context for menu logic
 *
 * @param {Object} editor - The editor instance
 * @param {MouseEvent} [event] - Optional mouse event (for context menu)
 * @returns {Promise<Object>} context - Enhanced editor context with comprehensive state information
 */
export async function getEditorContext(editor, event) {
  const { view } = editor;
  const { state } = view;
  const { from, to, empty } = state.selection;
  const selectedText = !empty ? state.doc.textBetween(from, to) : '';

  let pos = null;
  let node = null;

  if (event) {
    const coords = { left: event.clientX, top: event.clientY };
    pos = view.posAtCoords(coords)?.pos ?? null;
    node = pos !== null ? state.doc.nodeAt(pos) : null;
  } else {
    // For slash trigger, use the selection anchor
    pos = from;
    node = state.doc.nodeAt(pos);
  }

  // We need to check if we have anything in the clipboard and request permission if needed
  const clipboardContent = await readFromClipboard(state);

  // Get document structure information
  const isInTable = selectionHasNodeOrMark(state, 'table', { requireEnds: true });
  const isInList =
    selectionHasNodeOrMark(state, 'bulletList', { requireEnds: false }) ||
    selectionHasNodeOrMark(state, 'orderedList', { requireEnds: false });
  const isInSectionNode = selectionHasNodeOrMark(state, 'documentSection', { requireEnds: true });
  const currentNodeType = node?.type?.name || null;

  const activeMarks = [];

  if (event && pos !== null) {
    // For right-click events, get marks at the clicked position
    const $pos = state.doc.resolve(pos);
    $pos.marks().forEach((mark) => activeMarks.push(mark.type.name));

    // Also check marks on the node at this position if it exists
    if (node && node.marks) {
      node.marks.forEach((mark) => activeMarks.push(mark.type.name));
    }
  } else {
    // For slash trigger, use stored marks and selection head marks
    state.storedMarks?.forEach((mark) => activeMarks.push(mark.type.name));
    state.selection.$head.marks().forEach((mark) => activeMarks.push(mark.type.name));
  }

  const isTrackedChange = activeMarks.includes('trackInsert') || activeMarks.includes('trackDelete');

  let trackedChangeId = null;
  if (isTrackedChange && event && pos !== null) {
    const $pos = state.doc.resolve(pos);
    const marksAtPos = $pos.marks();
    const trackedMark = marksAtPos.find((mark) => mark.type.name === 'trackInsert' || mark.type.name === 'trackDelete');
    if (trackedMark) {
      trackedChangeId = trackedMark.attrs.id;
    }
  }

  const cursorCoords = pos ? view.coordsAtPos(pos) : null;
  const cursorPosition = cursorCoords
    ? {
        x: cursorCoords.left,
        y: cursorCoords.top,
      }
    : null;

  return {
    // Selection info
    selectedText,
    hasSelection: !empty,
    selectionStart: from,
    selectionEnd: to,

    // Document structure
    isInTable,
    isInList,
    isInSectionNode,
    currentNodeType,
    activeMarks,

    // Document state
    isTrackedChange,
    trackedChangeId,
    documentMode: editor.options?.documentMode || 'editing',
    canUndo: state.history?.undoDepth > 0,
    canRedo: state.history?.redoDepth > 0,
    isEditable: editor.isEditable,

    // Clipboard
    clipboardContent: {
      html: clipboardContent?.html || null,
      text: clipboardContent?.text || null,
      hasContent: !!(clipboardContent?.html || clipboardContent?.text),
    },

    // Position and trigger info
    cursorPosition,
    pos,
    node,
    event,

    // Editor reference for advanced use cases
    editor,
  };
}
