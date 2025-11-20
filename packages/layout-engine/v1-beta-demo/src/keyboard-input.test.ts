import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayoutKeyboard } from './keyboard-input';
import type { Layout, FlowBlock, Measure } from '@superdoc/contracts';

describe('LayoutKeyboard - navigation pass-through', () => {
  let layoutContainer: HTMLElement;

  beforeEach(() => {
    layoutContainer = document.createElement('div');
    document.body.appendChild(layoutContainer);
  });

  afterEach(() => {
    layoutContainer.remove();
  });

  it('handles horizontal navigation and prevents default for vertical navigation', () => {
    const editor: any = {
      commands: {
        enter: vi.fn(),
        deleteSelection: vi.fn(),
        toggleBold: vi.fn(),
        toggleItalic: vi.fn(),
        toggleUnderline: vi.fn(),
        setTextSelection: vi.fn(),
      },
      state: { selection: { from: 0, to: 0 }, doc: { content: { size: 0 } } },
      view: { dispatch: vi.fn(), dom: document.createElement('div') },
    };

    const onRequestFocus = vi.fn();
    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus,
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    // Activate to allow shouldHandleEvent to proceed
    keyboard.activate();

    // Test horizontal navigation - should NOT preventDefault
    const horizontalKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    for (const key of horizontalKeys) {
      const preventDefault = vi.fn();
      (keyboard as any).handleKeyDown({
        key,
        target: layoutContainer,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        preventDefault,
      } as unknown as KeyboardEvent);

      expect(preventDefault).not.toHaveBeenCalled();
    }

    // Test vertical navigation - should NOT preventDefault when layout is unavailable
    const verticalKeys = ['ArrowUp', 'ArrowDown'];
    for (const key of verticalKeys) {
      const preventDefault = vi.fn();
      (keyboard as any).handleKeyDown({
        key,
        target: layoutContainer,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        preventDefault,
      } as unknown as KeyboardEvent);

      // Should not prevent default since navigation will fail without layout
      expect(preventDefault).not.toHaveBeenCalled();
    }

    // Ensure no basic editing commands were routed for navigation keys
    expect(editor.commands.enter).not.toHaveBeenCalled();
    expect(editor.commands.deleteSelection).not.toHaveBeenCalled();
    expect(editor.commands.toggleBold).not.toHaveBeenCalled();
    expect(editor.commands.toggleItalic).not.toHaveBeenCalled();
    expect(editor.commands.toggleUnderline).not.toHaveBeenCalled();
  });

  it('navigates vertically using layout-based positioning', async () => {
    // Mock layout with 2 lines
    const mockLayout: Layout = {
      pageSize: { w: 612, h: 792 },
      contentBox: { x: 72, y: 72, w: 468, h: 648 },
      pages: [
        {
          fragments: [
            {
              kind: 'para',
              blockId: 'block1',
              x: 72,
              y: 72,
              width: 468,
              height: 48,
              pmStart: 0,
              pmEnd: 50,
              fromLine: 0,
              toLine: 2,
            },
          ],
        },
      ],
    };

    const mockBlocks: FlowBlock[] = [
      {
        id: 'block1',
        kind: 'paragraph',
        pmDoc: 0,
        pmOffset: 0,
        runs: [
          { text: 'First line of text here', formats: {} },
          { text: 'Second line of text here', formats: {} },
        ],
      },
    ];

    const mockMeasures: Measure[] = [
      {
        kind: 'paragraph',
        lines: [
          {
            runs: [{ text: 'First line of text here', width: 200 }],
            lineHeight: 24,
            baseline: 18,
            width: 200,
          },
          {
            runs: [{ text: 'Second line of text here', width: 220 }],
            lineHeight: 24,
            baseline: 18,
            width: 220,
          },
        ],
        height: 48,
      },
    ];

    const setTextSelection = vi.fn();
    const editor: any = {
      commands: {
        setTextSelection,
      },
      state: {
        selection: { from: 5, to: 5 }, // Position on first line
        doc: { content: { size: 50 } },
      },
      view: { dispatch: vi.fn(), dom: document.createElement('div') },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => mockLayout,
      getBlocks: () => mockBlocks,
      getMeasures: () => mockMeasures,
    });
    keyboard.activate();

    // Mock selectionToRects to return a rect for position 5
    const selectionToRectsSpy = vi.spyOn(await import('../../layout-bridge/src/index.ts'), 'selectionToRects');
    selectionToRectsSpy.mockReturnValue([{ x: 100, y: 72, width: 2, height: 24, pageIndex: 0 }]);

    // Mock clickToPosition to return position on second line
    const clickToPositionSpy = vi.spyOn(await import('../../layout-bridge/src/index.ts'), 'clickToPosition');
    clickToPositionSpy.mockReturnValue({
      pos: 28,
      pageIndex: 0,
      column: 0,
      lineIndex: 1,
    });

    // Simulate ArrowDown
    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'ArrowDown',
      target: layoutContainer,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Should prevent default
    expect(preventDefault).toHaveBeenCalled();

    // Should call setTextSelection with new position
    expect(setTextSelection).toHaveBeenCalledWith({ from: 28, to: 28 });

    // Verify clickToPosition was called with correct Y offset (one line down)
    // Calculation: currentY (72 + 24/2 = 84) + lineHeight (24) = 108
    expect(clickToPositionSpy).toHaveBeenCalledWith(mockLayout, mockBlocks, mockMeasures, { x: 100, y: 108 });

    selectionToRectsSpy.mockRestore();
    clickToPositionSpy.mockRestore();
  });

  it('handles Enter key with command chain', async () => {
    const splitRun = vi.fn().mockReturnValue(false);
    const newlineInCode = vi.fn().mockReturnValue(false);
    const createParagraphNear = vi.fn().mockReturnValue(false);
    const liftEmptyBlock = vi.fn().mockReturnValue(false);
    const splitBlockCmd = vi.fn().mockReturnValue(true);

    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        first: vi.fn((callback: any) => {
          const commands = {
            splitRun,
            newlineInCode,
            createParagraphNear,
            liftEmptyBlock,
            splitBlock: splitBlockCmd,
          };
          const handlers = callback({ commands });
          for (const handler of handlers) {
            if (handler()) return true;
          }
          return false;
        }),
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
        tr: {
          delete: vi.fn().mockReturnThis(),
          insertText: vi.fn().mockReturnThis(),
        },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Enter',
      target: editorDom,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Wait for queueCommand to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should prevent default
    expect(preventDefault).toHaveBeenCalled();

    // Should try command chain in order
    expect(editor.commands.first).toHaveBeenCalled();
    expect(splitRun).toHaveBeenCalled();
    expect(newlineInCode).toHaveBeenCalled();
    expect(createParagraphNear).toHaveBeenCalled();
    expect(liftEmptyBlock).toHaveBeenCalled();
    expect(splitBlockCmd).toHaveBeenCalled();
  });

  it('handles Shift-Enter for line breaks', () => {
    const insertLineBreak = vi.fn().mockReturnValue(true);

    const editor: any = {
      commands: {
        insertLineBreak,
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: document.createElement('div'),
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Enter',
      target: layoutContainer,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: true,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Should prevent default
    expect(preventDefault).toHaveBeenCalled();

    // Should call insertLineBreak
    expect(insertLineBreak).toHaveBeenCalled();
  });

  it('handles Mod-Enter for exiting code blocks', () => {
    const exitCode = vi.fn().mockReturnValue(true);

    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        exitCode,
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const onRequestFocus = vi.fn();
    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus,
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    // Test with metaKey (Mac)
    const preventDefaultMeta = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Enter',
      target: editorDom,
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault: preventDefaultMeta,
    } as unknown as KeyboardEvent);

    expect(preventDefaultMeta).toHaveBeenCalled();
    expect(exitCode).toHaveBeenCalledTimes(1);
    expect(onRequestFocus).toHaveBeenCalled();

    // Test with ctrlKey (Windows/Linux)
    const preventDefaultCtrl = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Enter',
      target: editorDom,
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      preventDefault: preventDefaultCtrl,
    } as unknown as KeyboardEvent);

    expect(preventDefaultCtrl).toHaveBeenCalled();
    expect(exitCode).toHaveBeenCalledTimes(2);
  });

  it('handles beforeinput insertParagraph event', () => {
    const splitRun = vi.fn().mockReturnValue(false);
    const newlineInCode = vi.fn().mockReturnValue(false);
    const createParagraphNear = vi.fn().mockReturnValue(false);
    const liftEmptyBlock = vi.fn().mockReturnValue(false);
    const splitBlock = vi.fn().mockReturnValue(true);

    const editor: any = {
      commands: {
        first: vi.fn((callback: any) => {
          const commands = {
            splitRun,
            newlineInCode,
            createParagraphNear,
            liftEmptyBlock,
            splitBlock,
          };
          const handlers = callback({ commands });
          for (const handler of handlers) {
            if (handler()) return true;
          }
          return false;
        }),
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: document.createElement('div'),
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    const preventDefault = vi.fn();
    (keyboard as any).handleBeforeInput({
      inputType: 'insertParagraph',
      target: layoutContainer,
      preventDefault,
    } as unknown as InputEvent);

    // Should prevent default
    expect(preventDefault).toHaveBeenCalled();

    // Should use command chain
    expect(editor.commands.first).toHaveBeenCalled();
  });

  it('does not prevent default on Enter during composition', async () => {
    const editorDom = document.createElement('div');
    const splitBlockCmd = vi.fn().mockReturnValue(true);
    const insertContent = vi.fn().mockReturnValue(true);
    const editor: any = {
      commands: {
        first: vi.fn((callback: any) => {
          const commands = {
            splitRun: vi.fn().mockReturnValue(false),
            newlineInCode: vi.fn().mockReturnValue(false),
            createParagraphNear: vi.fn().mockReturnValue(false),
            liftEmptyBlock: vi.fn().mockReturnValue(false),
            splitBlock: splitBlockCmd,
          };
          const handlers = callback({ commands });
          for (const handler of handlers) {
            if (handler()) return true;
          }
          return false;
        }),
        insertContent,
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
        tr: {
          insertText: vi.fn().mockReturnThis(),
        },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    // Start composition
    (keyboard as any).handleCompositionStart({
      target: editorDom,
    } as unknown as CompositionEvent);

    // Try to handle Enter during composition
    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Enter',
      target: editorDom,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Should NOT prevent default during composition (let IME handle it)
    expect(preventDefault).not.toHaveBeenCalled();

    // Command should NOT have been called during composition
    expect(editor.commands.first).not.toHaveBeenCalled();

    // End composition
    (keyboard as any).handleCompositionEnd({
      target: editorDom,
    } as unknown as CompositionEvent);

    // Simulate beforeinput after composition (what IME would send)
    const preventDefaultBeforeInput = vi.fn();
    (keyboard as any).handleBeforeInput({
      inputType: 'insertParagraph',
      target: editorDom,
      preventDefault: preventDefaultBeforeInput,
    } as unknown as InputEvent);

    // Wait for queued command to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Now the command chain should be executed via beforeinput
    expect(preventDefaultBeforeInput).toHaveBeenCalled();
    expect(editor.commands.first).toHaveBeenCalled();
  });

  it('handles Backspace with command chain for joining paragraphs', async () => {
    const deleteSelection = vi.fn().mockReturnValue(false);
    const joinBackward = vi.fn().mockReturnValue(true);
    const selectNodeBackward = vi.fn().mockReturnValue(false);

    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        first: vi.fn((callback: any) => {
          const commands = {
            deleteSelection,
            joinBackward,
            selectNodeBackward,
          };
          const handlers = callback({ commands });
          for (const handler of handlers) {
            if (handler()) return true;
          }
          return false;
        }),
      },
      state: {
        selection: { from: 10, to: 10 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Backspace',
      target: editorDom,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Wait for queueCommand to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should prevent default
    expect(preventDefault).toHaveBeenCalled();

    // Should try command chain
    expect(editor.commands.first).toHaveBeenCalled();
    expect(deleteSelection).toHaveBeenCalled();
    expect(joinBackward).toHaveBeenCalled();
  });

  it('handles Delete with command chain for joining paragraphs', async () => {
    const deleteSelection = vi.fn().mockReturnValue(false);
    const joinForward = vi.fn().mockReturnValue(true);
    const selectNodeForward = vi.fn().mockReturnValue(false);

    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        first: vi.fn((callback: any) => {
          const commands = {
            deleteSelection,
            joinForward,
            selectNodeForward,
          };
          const handlers = callback({ commands });
          for (const handler of handlers) {
            if (handler()) return true;
          }
          return false;
        }),
      },
      state: {
        selection: { from: 10, to: 10 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Delete',
      target: editorDom,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Wait for queueCommand to execute
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should prevent default
    expect(preventDefault).toHaveBeenCalled();

    // Should try command chain
    expect(editor.commands.first).toHaveBeenCalled();
    expect(deleteSelection).toHaveBeenCalled();
    expect(joinForward).toHaveBeenCalled();
  });

  it('handles Cmd/Ctrl-A to select all', async () => {
    const selectAll = vi.fn().mockReturnValue(true);
    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        selectAll,
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'a',
      target: layoutContainer, // Use layoutContainer as target
      metaKey: true,
      ctrlKey: true, // Set both for platform compatibility
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(preventDefault).toHaveBeenCalled();
    expect(selectAll).toHaveBeenCalled();
  });

  it('handles Cmd/Ctrl-Z for undo and Shift-Cmd/Ctrl-Z for redo', async () => {
    const undo = vi.fn().mockReturnValue(true);
    const redo = vi.fn().mockReturnValue(true);
    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        undo,
        redo,
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    // Test Cmd-Z (undo)
    const preventDefaultUndo = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'z',
      target: layoutContainer, // Use layoutContainer as target
      metaKey: true,
      ctrlKey: true, // Set both for platform compatibility
      altKey: false,
      shiftKey: false,
      preventDefault: preventDefaultUndo,
    } as unknown as KeyboardEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(preventDefaultUndo).toHaveBeenCalled();
    expect(undo).toHaveBeenCalled();

    // Test Shift-Cmd-Z (redo)
    const preventDefaultRedo = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'z',
      target: layoutContainer, // Use layoutContainer as target
      metaKey: true,
      ctrlKey: true, // Set both for platform compatibility
      altKey: false,
      shiftKey: true,
      preventDefault: preventDefaultRedo,
    } as unknown as KeyboardEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(preventDefaultRedo).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();
  });

  it('handles Ctrl-Y for redo on Windows', async () => {
    const redo = vi.fn().mockReturnValue(true);
    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {
        redo,
      },
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    // Mock navigator.platform to simulate Windows
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    });

    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'y',
      target: editorDom,
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(preventDefault).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();

    // Restore original platform
    if (originalPlatform) {
      Object.defineProperty(navigator, 'platform', originalPlatform);
    }
  });

  it('does not prevent default for unhandled shortcuts', () => {
    const editorDom = document.createElement('div');
    const editor: any = {
      commands: {},
      state: {
        selection: { from: 5, to: 5 },
        doc: { content: { size: 50 } },
      },
      view: {
        dispatch: vi.fn(),
        dom: editorDom,
      },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null,
      getBlocks: () => [],
      getMeasures: () => [],
    });
    keyboard.activate();

    // Test Cmd-K (unhandled shortcut)
    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'k',
      target: editorDom,
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    // Should NOT prevent default for unhandled shortcuts
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('LayoutKeyboard - undo/redo shortcuts', () => {
  let layoutContainer: HTMLElement;

  beforeEach(() => {
    layoutContainer = document.createElement('div');
    document.body.appendChild(layoutContainer);
  });

  afterEach(() => {
    layoutContainer.remove();
  });

  function makeKeyboard() {
    const editor: any = {
      commands: {
        undo: vi.fn(),
        redo: vi.fn(),
      },
      view: { dom: document.createElement('div') },
    };

    const keyboard = new LayoutKeyboard({
      getEditor: () => editor,
      onRequestFocus: vi.fn(),
      layoutContainer,
      getLayout: () => null as any,
      getBlocks: () => [] as any,
      getMeasures: () => [] as any,
    });
    keyboard.activate();
    return { keyboard, editor };
  }

  it('Cmd/Ctrl+Z triggers undo and prevents default', () => {
    const { keyboard, editor } = makeKeyboard();
    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'z',
      target: layoutContainer,
      metaKey: true,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(editor.commands.undo).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it('Cmd/Ctrl+Shift+Z triggers redo and prevents default', () => {
    const { keyboard, editor } = makeKeyboard();
    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'Z',
      target: layoutContainer,
      metaKey: true,
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(editor.commands.redo).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it('Cmd/Ctrl+Y triggers redo and prevents default', () => {
    const { keyboard, editor } = makeKeyboard();
    const preventDefault = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'y',
      target: layoutContainer,
      metaKey: true,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(editor.commands.redo).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it('Alt+Z and Alt+Y alone do not trigger undo/redo or prevent default', () => {
    const { keyboard, editor } = makeKeyboard();
    const preventDefaultZ = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'z',
      target: layoutContainer,
      metaKey: false,
      ctrlKey: false,
      altKey: true,
      shiftKey: false,
      preventDefault: preventDefaultZ,
    } as unknown as KeyboardEvent);

    const preventDefaultY = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'y',
      target: layoutContainer,
      metaKey: false,
      ctrlKey: false,
      altKey: true,
      shiftKey: false,
      preventDefault: preventDefaultY,
    } as unknown as KeyboardEvent);

    expect(editor.commands.undo).not.toHaveBeenCalled();
    expect(editor.commands.redo).not.toHaveBeenCalled();
    expect(preventDefaultZ).not.toHaveBeenCalled();
    expect(preventDefaultY).not.toHaveBeenCalled();
  });

  it('Cmd/Ctrl+Alt+Z/Y do not trigger undo/redo and do not prevent default', () => {
    const { keyboard, editor } = makeKeyboard();

    const preventDefaultZ = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'z',
      target: layoutContainer,
      metaKey: true,
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      preventDefault: preventDefaultZ,
    } as unknown as KeyboardEvent);

    const preventDefaultY = vi.fn();
    (keyboard as any).handleKeyDown({
      key: 'y',
      target: layoutContainer,
      metaKey: true,
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      preventDefault: preventDefaultY,
    } as unknown as KeyboardEvent);

    expect(editor.commands.undo).not.toHaveBeenCalled();
    expect(editor.commands.redo).not.toHaveBeenCalled();
    expect(preventDefaultZ).not.toHaveBeenCalled();
    expect(preventDefaultY).not.toHaveBeenCalled();
  });
});
