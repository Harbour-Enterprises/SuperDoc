import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockEditor, createBeforeEachSetup } from './testHelpers.js';

// Mock the modules first
vi.mock('../../../core/utilities/clipboardUtils.js');
vi.mock('../../cursor-helpers.js');
vi.mock('../constants.js', () => ({
  tableActionsOptions: [{ label: 'Add Row', command: 'addRow', icon: '<svg>add-row</svg>' }],
}));
vi.mock('prosemirror-history', () => ({
  undoDepth: vi.fn(() => 0),
  redoDepth: vi.fn(() => 0),
}));
vi.mock('y-prosemirror', () => ({
  yUndoPluginKey: {
    getState: vi.fn(() => ({ undoManager: { undoStack: [], redoStack: [] } })),
  },
}));

import {
  getEditorContext,
  getPropsByItemId,
  __getStructureFromResolvedPosForTest,
  __isCollaborationEnabledForTest,
} from '../utils.js';
import { readFromClipboard } from '../../../core/utilities/clipboardUtils.js';
import { selectionHasNodeOrMark } from '../../cursor-helpers.js';
import { undoDepth, redoDepth } from 'prosemirror-history';
import { yUndoPluginKey } from 'y-prosemirror';

// Get the mocked functions
const mockReadFromClipboard = vi.mocked(readFromClipboard);
const mockSelectionHasNodeOrMark = vi.mocked(selectionHasNodeOrMark);
const mockUndoDepth = vi.mocked(undoDepth);
const mockRedoDepth = vi.mocked(redoDepth);
const mockYUndoPluginKeyGetState = vi.mocked(yUndoPluginKey.getState);

describe('utils.js', () => {
  let mockEditor;

  beforeEach(
    createBeforeEachSetup(() => {
      // Clear mock call history but keep implementations
      mockReadFromClipboard.mockClear();
      mockSelectionHasNodeOrMark.mockClear();

      // Reset selection mock to default
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      mockUndoDepth.mockReturnValue(1);
      mockRedoDepth.mockReturnValue(1);
      mockYUndoPluginKeyGetState.mockReturnValue({ undoManager: { undoStack: [1], redoStack: [1] } });

      // Create editor with default configuration
      mockEditor = createMockEditor({
        documentMode: 'editing',
        isEditable: true,
        view: {
          state: {
            selectedText: 'selected text',
            undoDepth: 2,
            redoDepth: 1,
          },
        },
      });
    }),
  );

  describe('getEditorContext', () => {
    it('should return comprehensive editor context', async () => {
      // Mock returns object with html/text properties (not ProseMirror content)
      mockReadFromClipboard.mockResolvedValue({
        html: '<p>clipboard html</p>',
        text: 'clipboard text',
      });

      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context).toEqual({
        // Selection info
        selectedText: 'selected text',
        hasSelection: true,
        selectionStart: 10,
        selectionEnd: 15,

        // Document structure
        isInTable: false,
        isInList: false,
        isInSectionNode: false,
        currentNodeType: 'paragraph',
        activeMarks: [],

        // Document state
        isTrackedChange: false,
        trackedChangeId: null,
        documentMode: 'editing',
        canUndo: true,
        canRedo: true,
        isEditable: true,

        // Clipboard
        clipboardContent: {
          html: '<p>clipboard html</p>',
          text: 'clipboard text',
          hasContent: true,
          raw: {
            html: '<p>clipboard html</p>',
            text: 'clipboard text',
          },
        },

        // Position and trigger info
        cursorPosition: { x: 100, y: 200 },
        pos: 10,
        node: { type: { name: 'paragraph' } },
        event: undefined,

        // Editor reference
        editor: mockEditor,
      });
    });

    it('should handle empty selection', async () => {
      // Reconfigure editor for empty selection
      mockEditor.view.state.selection.empty = true;
      mockEditor.view.state.selection.from = 10;
      mockEditor.view.state.selection.to = 10;
      mockEditor.view.state.doc.textBetween.mockReturnValue('');

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.selectedText).toBe('');
      expect(context.hasSelection).toBe(false);
      expect(context.selectionStart).toBe(10);
      expect(context.selectionEnd).toBe(10);
    });

    it('should detect active marks and tracked changes', async () => {
      const mockMark = { type: { name: 'trackInsert' } };
      mockEditor.view.state.storedMarks = [mockMark];
      mockEditor.view.state.selection.$head.marks.mockReturnValue([{ type: { name: 'bold' } }]);

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.activeMarks).toContain('trackInsert');
      expect(context.activeMarks).toContain('bold');
      expect(context.isTrackedChange).toBe(true);
    });

    it('should handle event-based context (right-click)', async () => {
      const mockEvent = { clientX: 300, clientY: 400 };

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);
      mockEditor.view.posAtCoords.mockReturnValue({ pos: 20 });
      mockEditor.view.state.doc.nodeAt.mockReturnValue({ type: { name: 'text' } });
      mockEditor.view.state.doc.content = { size: 100 }; // Add missing content.size mock
      mockEditor.view.state.doc.nodesBetween = vi.fn((from, to, callback) => {
        // Mock nodesBetween to call the callback with a node that has the expected mark
        const mockNode = {
          marks: [{ type: { name: 'trackDelete' }, attrs: { id: 'track-1' } }],
          nodeSize: 1,
        };
        callback(mockNode, 20); // Call callback with mock node at position 20
      });
      mockEditor.view.state.doc.resolve.mockReturnValue({
        depth: 5,
        node: (depth) => {
          const map = {
            1: { type: { name: 'paragraph' } },
            2: { type: { name: 'orderedList' } },
            3: { type: { name: 'tableCell' } },
            4: { type: { name: 'tableRow' } },
            5: { type: { name: 'documentSection' } },
          };
          return map[depth] || { type: { name: 'doc' } };
        },
        marks: vi.fn(() => [{ type: { name: 'trackDelete' }, attrs: { id: 'track-1' } }]),
      });

      const context = await getEditorContext(mockEditor, mockEvent);

      expect(context.pos).toBe(20);
      expect(context.node).toEqual({ type: { name: 'text' } });
      expect(context.event).toBe(mockEvent);
      expect(mockEditor.view.posAtCoords).toHaveBeenCalledWith({ left: 300, top: 400 });
      expect(context.isInTable).toBe(true);
      expect(context.isInList).toBe(true);
      expect(context.isInSectionNode).toBe(true);
      expect(context.activeMarks).toContain('trackDelete');
      expect(context.trackedChangeId).toBe('track-1');
    });

    it('should handle document mode variations', async () => {
      mockEditor.options.documentMode = 'viewing';
      mockEditor.isEditable = false;

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.documentMode).toBe('viewing');
      expect(context.isEditable).toBe(false);
    });

    it('should derive canUndo/canRedo from editor command availability', async () => {
      delete mockEditor.view.state.history;

      mockEditor.can = vi.fn(() => ({
        undo: () => true,
        redo: () => false,
      }));

      mockUndoDepth.mockReturnValue(0);
      mockRedoDepth.mockReturnValue(0);

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(mockEditor.can).toHaveBeenCalled();
      expect(context.canUndo).toBe(true);
      expect(context.canRedo).toBe(false);
    });

    it('should fall back to history depth when editor.can is unavailable', async () => {
      mockEditor.can = undefined;
      mockUndoDepth.mockReturnValueOnce(2);
      mockRedoDepth.mockReturnValueOnce(0);
      mockYUndoPluginKeyGetState.mockReturnValueOnce({ undoManager: { undoStack: [], redoStack: [] } });

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(mockUndoDepth).toHaveBeenCalledWith(mockEditor.view.state);
      expect(mockRedoDepth).toHaveBeenCalledWith(mockEditor.view.state);
      expect(context.canUndo).toBe(true);
      expect(context.canRedo).toBe(false);
    });

    it('should use y-prosemirror undo manager when collaboration is enabled', async () => {
      mockEditor.options.collaborationProvider = {};
      mockEditor.options.ydoc = {};
      mockEditor.can = undefined;
      mockYUndoPluginKeyGetState
        .mockReturnValueOnce({
          undoManager: {
            undoStack: [{ id: 1 }],
            redoStack: [],
          },
        })
        .mockReturnValueOnce({
          undoManager: {
            undoStack: [{ id: 1 }],
            redoStack: [],
          },
        });
      mockUndoDepth.mockReturnValueOnce(0);
      mockRedoDepth.mockReturnValueOnce(0);

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(mockYUndoPluginKeyGetState).toHaveBeenCalledWith(mockEditor.view.state);
      expect(context.canUndo).toBe(true);
      expect(context.canRedo).toBe(false);
    });

    it('should handle clipboard content variations', async () => {
      mockReadFromClipboard.mockResolvedValue({
        html: '<p>rich content</p>',
        text: 'plain content',
      });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.clipboardContent).toEqual({
        html: '<p>rich content</p>',
        text: 'plain content',
        hasContent: true,
        raw: {
          html: '<p>rich content</p>',
          text: 'plain content',
        },
      });
    });

    it('should detect clipboard content from ProseMirror slices', async () => {
      const slice = { size: 3 };
      mockReadFromClipboard.mockResolvedValue(slice);
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.clipboardContent).toEqual({
        html: null,
        text: null,
        hasContent: true,
        raw: slice,
      });
    });

    it('should detect clipboard content from nested slice structure', async () => {
      const slice = { content: { size: 2 } };
      mockReadFromClipboard.mockResolvedValue(slice);
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.clipboardContent).toEqual({
        html: null,
        text: null,
        hasContent: true,
        raw: slice,
      });
    });
  });

  describe('getPropsByItemId', () => {
    let mockProps;

    beforeEach(() => {
      mockProps = {
        editor: mockEditor,
        closePopover: vi.fn(),
      };
    });

    it('should return AI writer props for insert-text item', () => {
      mockEditor.options = {
        aiApiKey: 'test-key',
        aiEndpoint: 'https://test-endpoint.com',
      };

      const props = getPropsByItemId('insert-text', mockProps);

      expect(props).toEqual({
        editor: expect.any(Object),
        selectedText: 'selected text',
        handleClose: mockProps.closePopover,
        apiKey: 'test-key',
        endpoint: 'https://test-endpoint.com',
      });
    });

    it('should return table grid props for insert-table item', () => {
      const props = getPropsByItemId('insert-table', mockProps);

      expect(props).toHaveProperty('editor');
      expect(props).toHaveProperty('onSelect');
      expect(typeof props.onSelect).toBe('function');
    });

    it('should handle table insertion through onSelect', () => {
      mockEditor.commands = {
        insertTable: vi.fn(),
      };

      const props = getPropsByItemId('insert-table', mockProps);
      props.onSelect({ rows: 3, cols: 4 });

      expect(mockEditor.commands.insertTable).toHaveBeenCalledWith({ rows: 3, cols: 4 });
      expect(mockProps.closePopover).toHaveBeenCalled();
    });

    it('should return table actions props for edit-table item', () => {
      const props = getPropsByItemId('edit-table', mockProps);

      expect(props).toHaveProperty('editor');
      expect(props).toHaveProperty('options');
      expect(props).toHaveProperty('onSelect');
      expect(Array.isArray(props.options)).toBe(true);
      expect(typeof props.onSelect).toBe('function');
    });

    it('should handle table action execution through onSelect', () => {
      mockEditor.commands = {
        addRow: vi.fn(),
      };

      const props = getPropsByItemId('edit-table', mockProps);
      props.onSelect({ command: 'addRow' });

      expect(mockEditor.commands.addRow).toHaveBeenCalled();
      expect(mockProps.closePopover).toHaveBeenCalled();
    });

    it('should handle missing command gracefully in table actions', () => {
      mockEditor.commands = {};

      const props = getPropsByItemId('edit-table', mockProps);

      // Should not throw
      expect(() => props.onSelect({ command: 'nonexistentCommand' })).not.toThrow();
      expect(mockProps.closePopover).toHaveBeenCalled();
    });
  });

  describe('internal helpers', () => {
    it('should detect structure from resolved position', () => {
      const state = {
        doc: {
          resolve: vi.fn(() => ({
            depth: 4,
            node: (depth) => {
              const map = {
                1: { type: { name: 'paragraph' } },
                2: { type: { name: 'tableCell' } },
                3: { type: { name: 'tableRow' } },
                4: { type: { name: 'table' } },
              };
              return map[depth] || { type: { name: 'doc' } };
            },
          })),
        },
      };

      const result = __getStructureFromResolvedPosForTest(state, 42);

      expect(state.doc.resolve).toHaveBeenCalledWith(42);
      expect(result).toEqual({ isInTable: true, isInList: false, isInSectionNode: false });
    });

    it('should return null when position resolution fails', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state = {
        doc: {
          resolve: vi.fn(() => {
            throw new Error('boom');
          }),
        },
      };

      const result = __getStructureFromResolvedPosForTest(state, 0);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should reflect collaboration enablement', () => {
      expect(__isCollaborationEnabledForTest({ options: { collaborationProvider: {}, ydoc: {} } })).toBe(true);
      expect(__isCollaborationEnabledForTest({ options: { collaborationProvider: {} } })).toBe(false);
      expect(__isCollaborationEnabledForTest({ options: { ydoc: {} } })).toBe(false);
      expect(__isCollaborationEnabledForTest({ options: {} })).toBe(false);
    });
  });
});
