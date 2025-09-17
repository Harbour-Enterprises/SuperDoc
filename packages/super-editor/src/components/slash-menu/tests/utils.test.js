import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockEditor, createBeforeEachSetup } from './testHelpers.js';

// Mock the modules first
vi.mock('../../../core/utilities/clipboardUtils.js');
vi.mock('../../cursor-helpers.js');
vi.mock('../constants.js', () => ({
  tableActionsOptions: [{ label: 'Add Row', command: 'addRow', icon: '<svg>add-row</svg>' }],
}));

import { getEditorContext, getPropsByItemId } from '../utils.js';
import { readFromClipboard } from '../../../core/utilities/clipboardUtils.js';
import { selectionHasNodeOrMark } from '../../cursor-helpers.js';

// Get the mocked functions
const mockReadFromClipboard = vi.mocked(readFromClipboard);
const mockSelectionHasNodeOrMark = vi.mocked(selectionHasNodeOrMark);

describe('utils.js', () => {
  let mockEditor;

  beforeEach(
    createBeforeEachSetup(() => {
      // Clear mock call history but keep implementations
      mockReadFromClipboard.mockClear();
      mockSelectionHasNodeOrMark.mockClear();

      // Reset selection mock to default
      mockSelectionHasNodeOrMark.mockReturnValue(false);

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
        documentMode: 'editing',
        canUndo: true,
        canRedo: true,
        isEditable: true,

        // Clipboard
        clipboardContent: {
          html: '<p>clipboard html</p>',
          text: 'clipboard text',
          hasContent: true,
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
      const mockMark = { type: { name: 'trackedInsert' } };
      mockEditor.view.state.storedMarks = [mockMark];
      mockEditor.view.state.selection.$head.marks.mockReturnValue([{ type: { name: 'bold' } }]);

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);

      const context = await getEditorContext(mockEditor);

      expect(context.activeMarks).toContain('trackedInsert');
      expect(context.activeMarks).toContain('bold');
      expect(context.isTrackedChange).toBe(true);
    });

    it('should handle event-based context (right-click)', async () => {
      const mockEvent = { clientX: 300, clientY: 400 };

      mockReadFromClipboard.mockResolvedValue({ html: null, text: null });
      mockSelectionHasNodeOrMark.mockReturnValue(false);
      mockEditor.view.posAtCoords.mockReturnValue({ pos: 20 });
      mockEditor.view.state.doc.nodeAt.mockReturnValue({ type: { name: 'text' } });

      const context = await getEditorContext(mockEditor, mockEvent);

      expect(context.pos).toBe(20);
      expect(context.node).toEqual({ type: { name: 'text' } });
      expect(context.event).toBe(mockEvent);
      expect(mockEditor.view.posAtCoords).toHaveBeenCalledWith({ left: 300, top: 400 });
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
});
