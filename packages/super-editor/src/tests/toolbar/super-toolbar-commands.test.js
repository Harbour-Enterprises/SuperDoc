import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuperToolbar } from '../../components/toolbar/super-toolbar.js';

vi.mock('prosemirror-history', () => ({
  undoDepth: () => 0,
  redoDepth: () => 0,
}));

vi.mock('@core/helpers/getActiveFormatting.js', () => ({
  getActiveFormatting: vi.fn(() => []),
}));

vi.mock('@helpers/isInTable.js', () => ({
  isInTable: vi.fn(() => false),
}));

vi.mock('@extensions/linked-styles/index.js', () => ({
  getQuickFormatList: vi.fn(() => []),
}));

vi.mock('@extensions/track-changes/permission-helpers.js', () => ({
  collectTrackedChanges: vi.fn(() => []),
  isTrackedChangeActionAllowed: vi.fn(() => true),
}));

vi.mock('../../components/toolbar/defaultItems.js', () => ({
  makeDefaultItems: () => ({ defaultItems: [], overflowItems: [] }),
}));

const ensureDomApis = () => {
  if (!globalThis.document) {
    globalThis.document = { documentElement: { clientWidth: 1024 } };
  } else if (!globalThis.document.documentElement) {
    globalThis.document.documentElement = { clientWidth: 1024 };
  } else if (typeof globalThis.document.documentElement.clientWidth !== 'number') {
    globalThis.document.documentElement.clientWidth = 1024;
  }

  if (!globalThis.window) {
    globalThis.window = {};
  }

  if (!globalThis.window.matchMedia) {
    globalThis.window.matchMedia = () => ({ matches: false });
  }
};

describe('SuperToolbar intercepted color commands', () => {
  let toolbar;
  let mockEditor;

  beforeEach(() => {
    ensureDomApis();

    mockEditor = {
      focus: vi.fn(),
      options: { isHeaderOrFooter: false, mode: 'docx' },
      state: {
        selection: { from: 1, to: 1 },
        doc: {
          content: { size: 10 },
          resolve: vi.fn(() => ({ depth: 0, node: () => ({ marks: [] }), marks: () => [] })),
          nodeAt: vi.fn(() => ({ marks: [] })),
          nodesBetween: vi.fn(() => {}),
        },
      },
      commands: {
        setColor: vi.fn(),
        setFieldAnnotationsTextColor: vi.fn(),
        setHighlight: vi.fn(),
        setFieldAnnotationsTextHighlight: vi.fn(),
        setCellBackground: vi.fn(),
      },
    };

    toolbar = new SuperToolbar({ editor: mockEditor, hideButtons: false });
    toolbar.updateToolbarState = vi.fn();
  });

  const emitCommand = (command, argument) => {
    const item = { command };
    toolbar.emitCommand({ item, argument });
  };

  it('setColor applies inline color and annotation updates', () => {
    emitCommand('setColor', '#123456');

    expect(mockEditor.focus).toHaveBeenCalled();
    expect(mockEditor.commands.setColor).toHaveBeenCalledWith('#123456');
    expect(mockEditor.commands.setFieldAnnotationsTextColor).toHaveBeenCalledWith('#123456', true);
    expect(toolbar.updateToolbarState).toHaveBeenCalledTimes(1);
  });

  it('setColor treats none as inherit and clears annotations', () => {
    emitCommand('setColor', 'none');

    expect(mockEditor.commands.setColor).toHaveBeenCalledWith('inherit');
    expect(mockEditor.commands.setFieldAnnotationsTextColor).toHaveBeenCalledWith(null, true);
    expect(toolbar.updateToolbarState).toHaveBeenCalledTimes(1);
  });

  it('setColor skips work when argument is missing', () => {
    emitCommand('setColor');

    expect(mockEditor.commands.setColor).not.toHaveBeenCalled();
    expect(mockEditor.commands.setFieldAnnotationsTextColor).not.toHaveBeenCalled();
    expect(toolbar.updateToolbarState).not.toHaveBeenCalled();
  });

  it('setHighlight applies inline highlight and annotation updates', () => {
    emitCommand('setHighlight', '#fedcba');

    expect(mockEditor.commands.setHighlight).toHaveBeenCalledWith('#fedcba');
    expect(mockEditor.commands.setFieldAnnotationsTextHighlight).toHaveBeenCalledWith('#fedcba', true);
    expect(mockEditor.commands.setCellBackground).toHaveBeenCalledWith('#fedcba');
    expect(toolbar.updateToolbarState).toHaveBeenCalledTimes(1);
  });

  it('setHighlight keeps transparent mark when clearing highlight', () => {
    emitCommand('setHighlight', 'none');

    expect(mockEditor.commands.setHighlight).toHaveBeenCalledWith('transparent');
    expect(mockEditor.commands.setFieldAnnotationsTextHighlight).toHaveBeenCalledWith(null, true);
    expect(mockEditor.commands.setCellBackground).toHaveBeenCalledWith(null);
    expect(toolbar.updateToolbarState).toHaveBeenCalledTimes(1);
  });

  it('setHighlight skips work when argument is missing', () => {
    emitCommand('setHighlight');

    expect(mockEditor.commands.setHighlight).not.toHaveBeenCalled();
    expect(mockEditor.commands.setFieldAnnotationsTextHighlight).not.toHaveBeenCalled();
    expect(mockEditor.commands.setCellBackground).not.toHaveBeenCalled();
    expect(toolbar.updateToolbarState).not.toHaveBeenCalled();
  });

  it('does nothing when active editor is unavailable', () => {
    toolbar.activeEditor = null;

    emitCommand('setColor', '#abcdef');
    emitCommand('setHighlight', '#abcdef');

    expect(mockEditor.commands.setColor).not.toHaveBeenCalled();
    expect(mockEditor.commands.setFieldAnnotationsTextColor).not.toHaveBeenCalled();
    expect(mockEditor.commands.setHighlight).not.toHaveBeenCalled();
    expect(mockEditor.commands.setFieldAnnotationsTextHighlight).not.toHaveBeenCalled();
    expect(mockEditor.commands.setCellBackground).not.toHaveBeenCalled();
    expect(toolbar.updateToolbarState).not.toHaveBeenCalled();
  });
});
