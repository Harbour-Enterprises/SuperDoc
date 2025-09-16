import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@core/helpers/getActiveFormatting.js', () => ({
  getActiveFormatting: vi.fn(() => []),
}));
vi.mock('@helpers/isInTable.js', () => ({
  isInTable: vi.fn(() => false),
}));
vi.mock('@extensions/linked-styles/linked-styles.js', () => ({
  getQuickFormatList: vi.fn(() => []),
}));
vi.mock('y-prosemirror', () => ({
  yUndoPluginKey: { getState: () => undefined },
}));

describe('SuperToolbar color/highlight intercepted commands', () => {
  let toolbar;
  let mockEditor;
  let SuperToolbar;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockEditor = {
      commands: {
        setColor: vi.fn(),
        setHighlight: vi.fn(),
        setFieldAnnotationsTextColor: vi.fn(),
        setFieldAnnotationsTextHighlight: vi.fn(),
        setCellBackground: vi.fn(),
      },
      // Mark as Yjs-enabled so toolbar uses yUndo path and avoids prosemirror-history helpers
      options: { isHeaderOrFooter: false, ydoc: true },
      focus: vi.fn(),
      on: vi.fn(),
    };

    // Dynamic import after mocks are set up
    ({ SuperToolbar } = await import('../../components/toolbar/super-toolbar.js'));
    toolbar = new SuperToolbar({ selector: '#test-toolbar', editor: mockEditor, role: 'editor' });
    toolbar.activeEditor = mockEditor;
    toolbar.documentMode = 'editing';
  });

  it('setColor("none") applies cascade-aware negation and updates annotations', () => {
    const item = { name: { value: 'color' }, command: 'setColor' };
    toolbar.emitCommand({ item, argument: 'none' });

    expect(mockEditor.commands.setColor).toHaveBeenCalledWith('inherit');
    expect(mockEditor.commands.setFieldAnnotationsTextColor).toHaveBeenCalledWith(null, true);
  });

  it('setColor("#00ff00") applies inline color and updates annotations', () => {
    const item = { name: { value: 'color' }, command: 'setColor' };
    toolbar.emitCommand({ item, argument: '#00ff00' });

    expect(mockEditor.commands.setColor).toHaveBeenCalledWith('#00ff00');
    expect(mockEditor.commands.setFieldAnnotationsTextColor).toHaveBeenCalledWith('#00ff00', true);
  });

  it('setHighlight("none") applies cascade-aware negation and updates annotations/cell', () => {
    const item = { name: { value: 'highlight' }, command: 'setHighlight' };
    toolbar.emitCommand({ item, argument: 'none' });

    expect(mockEditor.commands.setHighlight).toHaveBeenCalledWith('transparent');
    expect(mockEditor.commands.setFieldAnnotationsTextHighlight).toHaveBeenCalledWith(null, true);
    expect(mockEditor.commands.setCellBackground).toHaveBeenCalledWith(null);
  });

  it('setHighlight("red") applies inline highlight and updates annotations/cell', () => {
    const item = { name: { value: 'highlight' }, command: 'setHighlight' };
    toolbar.emitCommand({ item, argument: 'red' });

    expect(mockEditor.commands.setHighlight).toHaveBeenCalledWith('red');
    expect(mockEditor.commands.setFieldAnnotationsTextHighlight).toHaveBeenCalledWith('red', true);
    expect(mockEditor.commands.setCellBackground).toHaveBeenCalledWith('red');
  });
});
vi.mock('y-prosemirror', () => ({
  yUndoPluginKey: { getState: () => undefined },
}));
