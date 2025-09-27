import { selectionHasNodeOrMark } from '../cursor-helpers.js';
import { readFromClipboard } from '../../core/utilities/clipboardUtils.js';
import { tableActionsOptions } from './constants.js';
import { markRaw } from 'vue';
import { undoDepth, redoDepth } from 'prosemirror-history';
import { yUndoPluginKey } from 'y-prosemirror';
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
  const structureFromResolvedPos = pos !== null ? getStructureFromResolvedPos(state, pos) : null;
  const isInTable =
    structureFromResolvedPos?.isInTable ?? selectionHasNodeOrMark(state, 'table', { requireEnds: true });
  const isInList =
    structureFromResolvedPos?.isInList ??
    (selectionHasNodeOrMark(state, 'bulletList', { requireEnds: false }) ||
      selectionHasNodeOrMark(state, 'orderedList', { requireEnds: false }));
  const isInSectionNode =
    structureFromResolvedPos?.isInSectionNode ??
    selectionHasNodeOrMark(state, 'documentSection', { requireEnds: true });
  const currentNodeType = node?.type?.name || null;

  const activeMarks = [];
  let trackedChangeId = null;

  if (event && pos !== null) {
    const $pos = state.doc.resolve(pos);

    // Process marks with a helper function to avoid duplication
    const processMark = (mark) => {
      if (!activeMarks.includes(mark.type.name)) {
        activeMarks.push(mark.type.name);
      }

      // extract tracked change ID if this is a tracked change mark and we haven't found one yet
      if (
        !trackedChangeId &&
        (mark.type.name === 'trackInsert' || mark.type.name === 'trackDelete' || mark.type.name === 'trackFormat')
      ) {
        trackedChangeId = mark.attrs.id;
      }
    };

    // Check all parent nodes for marks
    for (let depth = 0; depth <= $pos.depth; depth++) {
      const nodeAtDepth = $pos.node(depth);
      if (nodeAtDepth && nodeAtDepth.marks) {
        nodeAtDepth.marks.forEach(processMark);
      }
    }

    if (state.storedMarks) {
      state.storedMarks.forEach(processMark);
    }
  } else {
    // For slash trigger, use stored marks and selection head marks
    state.storedMarks?.forEach((mark) => activeMarks.push(mark.type.name));
    state.selection.$head.marks().forEach((mark) => activeMarks.push(mark.type.name));
  }

  const isTrackedChange =
    activeMarks.includes('trackInsert') || activeMarks.includes('trackDelete') || activeMarks.includes('trackFormat');

  const cursorCoords = pos ? view.coordsAtPos(pos) : null;
  const cursorPosition = cursorCoords
    ? {
        x: cursorCoords.left,
        y: cursorCoords.top,
      }
    : null;

  const context = {
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
    trigger: event ? 'click' : 'slash',

    // Editor reference for advanced use cases
    editor,
  };

  return context;
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

  if (isCollaborationEnabled(editor)) {
    try {
      const undoManager = yUndoPluginKey.getState(state)?.undoManager;
      return !!undoManager && undoManager.undoStack.length > 0;
    } catch (error) {
      console.warn('[SlashMenu] Unable to determine undo availability via y-prosemirror:', error);
    }
  }

  try {
    return undoDepth(state) > 0;
  } catch (error) {
    console.warn('[SlashMenu] Unable to determine undo availability via history plugin:', error);
    return false;
  }
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

  if (isCollaborationEnabled(editor)) {
    try {
      const undoManager = yUndoPluginKey.getState(state)?.undoManager;
      return !!undoManager && undoManager.redoStack.length > 0;
    } catch (error) {
      console.warn('[SlashMenu] Unable to determine redo availability via y-prosemirror:', error);
    }
  }

  try {
    return redoDepth(state) > 0;
  } catch (error) {
    console.warn('[SlashMenu] Unable to determine redo availability via history plugin:', error);
    return false;
  }
}

function isCollaborationEnabled(editor) {
  return Boolean(editor?.options?.collaborationProvider && editor?.options?.ydoc);
}

function getStructureFromResolvedPos(state, pos) {
  try {
    const $pos = state.doc.resolve(pos);
    const ancestors = new Set();

    for (let depth = $pos.depth; depth > 0; depth--) {
      ancestors.add($pos.node(depth).type.name);
    }

    const isInList = ancestors.has('bulletList') || ancestors.has('orderedList');

    // ProseMirror table structure typically includes tableRow/tableCell, so check those too
    const isInTable =
      ancestors.has('table') || ancestors.has('tableRow') || ancestors.has('tableCell') || ancestors.has('tableHeader');

    const isInSectionNode = ancestors.has('documentSection');

    return {
      isInTable,
      isInList,
      isInSectionNode,
    };
  } catch (error) {
    console.warn('[SlashMenu] Unable to resolve position for structural context:', error);
    return null;
  }
}

export {
  getStructureFromResolvedPos as __getStructureFromResolvedPosForTest,
  isCollaborationEnabled as __isCollaborationEnabledForTest,
};
