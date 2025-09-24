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
 * Normalize clipboard content returned from readFromClipboard into a consistent shape
 * Supports modern clipboard API responses as well as legacy ProseMirror fragments
 * @param {any} rawClipboardContent
 * @returns {{ html: string|null, text: string|null, hasContent: boolean, raw: any }}
 */
function normalizeClipboardContent(rawClipboardContent) {
  if (!rawClipboardContent) {
    return {
      html: null,
      text: null,
      hasContent: false,
      raw: null,
    };
  }

  const html = typeof rawClipboardContent.html === 'string' ? rawClipboardContent.html : null;
  const text = typeof rawClipboardContent.text === 'string' ? rawClipboardContent.text : null;

  const hasHtml = !!html && html.trim().length > 0;
  const hasText = !!text && text.length > 0;
  const isObject = typeof rawClipboardContent === 'object' && rawClipboardContent !== null;
  const fragmentSize = typeof rawClipboardContent.size === 'number' ? rawClipboardContent.size : null;
  const nestedSize =
    isObject && rawClipboardContent.content && typeof rawClipboardContent.content.size === 'number'
      ? rawClipboardContent.content.size
      : null;

  const hasFragmentContent = (fragmentSize ?? nestedSize ?? 0) > 0;

  return {
    html,
    text,
    hasContent: hasHtml || hasText || hasFragmentContent,
    raw: rawClipboardContent,
  };
}

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
  const rawClipboardContent = await readFromClipboard(state);
  const clipboardContent = normalizeClipboardContent(rawClipboardContent);

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
    if ($pos.marks && typeof $pos.marks === 'function') {
      $pos.marks().forEach((mark) => activeMarks.push(mark.type.name));
    }

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
    canUndo: computeCanUndo(editor, state),
    canRedo: computeCanRedo(editor, state),
    isEditable: editor.isEditable,

    // Clipboard
    clipboardContent,

    // Position and trigger info
    cursorPosition,
    pos,
    node,
    event,

    // Editor reference for advanced use cases
    editor,
  };
}

function computeCanUndo(editor, state) {
  if (typeof editor?.can === 'function') {
    try {
      const can = editor.can();
      if (can && typeof can.undo === 'function') {
        return !!can.undo();
      }
    } catch (error) {
      console.warn('[SlashMenu] Unable to determine undo availability via editor.can():', error);
    }
  }

  const undoDepth = state?.history?.undoDepth;
  return typeof undoDepth === 'number' ? undoDepth > 0 : false;
}

function computeCanRedo(editor, state) {
  if (typeof editor?.can === 'function') {
    try {
      const can = editor.can();
      if (can && typeof can.redo === 'function') {
        return !!can.redo();
      }
    } catch (error) {
      console.warn('[SlashMenu] Unable to determine redo availability via editor.can():', error);
    }
  }

  const redoDepth = state?.history?.redoDepth;
  return typeof redoDepth === 'number' ? redoDepth > 0 : false;
}
