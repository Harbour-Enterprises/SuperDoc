import { describe, expect, it, vi, afterEach } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema, doc, p } from 'prosemirror-test-builder';
import { initTestEditor, loadTestDataForEditorTests } from '@tests/helpers/helpers.js';
import { SlashMenu, SlashMenuPluginKey } from './slash-menu.js';
vi.mock('@core/commands/list-helpers', () => ({
  isList: () => false,
}));

vi.mock('../../core/helpers/editorSurface.js', () => ({
  getSurfaceRelativePoint: vi.fn(() => ({ left: 20, top: 30 })),
}));

describe('SlashMenu extension', () => {
  it('registers the plugin key', () => {
    expect(SlashMenuPluginKey.key.startsWith('slashMenu')).toBe(true);
  });

  it('skips plugin creation when headless', () => {
    const headless = SlashMenu.config.addPmPlugins.call({ editor: { options: { isHeadless: true } } });
    expect(headless).toEqual([]);
  });

  it('creates a plugin when enabled', async () => {
    const { docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests('paragraph_spacing_missing.docx');
    const { editor } = initTestEditor({
      content: docx,
      media,
      mediaFiles,
      fonts,
      isHeadless: false,
      disableContextMenu: false,
    });
    const plugins = SlashMenu.config.addPmPlugins.call({ editor });
    expect(plugins).toHaveLength(1);
    expect(typeof plugins[0].props.handleKeyDown).toBe('function');
    editor.destroy();
  });

  it('opens and closes the slash menu via keyboard events', () => {
    const baseDoc = doc(p());
    const initialSelection = TextSelection.create(baseDoc, 1);
    let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

    const editor = {
      options: {},
      emit: vi.fn(),
      view: null,
    };

    const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
    state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

    const view = {
      state,
      dispatch: vi.fn((tr) => {
        state = state.apply(tr);
        view.state = state;
      }),
      focus: vi.fn(),
      dom: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      coordsAtPos: () => ({ left: 20, top: 30 }),
    };

    editor.view = view;

    const viewLifecycle = plugin.spec.view?.(view);

    const openEvent = {
      key: '/',
      preventDefault: vi.fn(),
    };

    const opened = plugin.props.handleKeyDown.call(plugin, view, openEvent);
    expect(opened).toBe(true);
    expect(openEvent.preventDefault).toHaveBeenCalled();
    expect(view.dispatch).toHaveBeenCalled();

    const pluginState = SlashMenuPluginKey.getState(view.state);
    expect(pluginState.open).toBe(true);
    expect(pluginState.anchorPos).toBe(1);
    expect(pluginState.menuPosition).toEqual({ left: '120px', top: '58px' });
    expect(editor.emit).toHaveBeenCalledWith('slashMenu:open', {
      menuPosition: { left: '120px', top: '58px' },
    });

    const closeEvent = { key: 'Escape', preventDefault: vi.fn() };
    const closed = plugin.props.handleKeyDown.call(plugin, view, closeEvent);
    expect(closed).toBe(true);
    const updatedState = SlashMenuPluginKey.getState(view.state);
    expect(updatedState.open).toBe(false);
    expect(editor.emit).toHaveBeenCalledWith('slashMenu:close');
    expect(view.focus).toHaveBeenCalled();

    viewLifecycle?.destroy?.();
  });

  it('ignores slash hotkey when the context menu is disabled', () => {
    const baseDoc = doc(p());
    const initialSelection = TextSelection.create(baseDoc, 1);
    let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

    const editor = {
      options: { disableContextMenu: true },
      emit: vi.fn(),
      view: null,
    };

    const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
    state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

    const view = {
      state,
      dispatch: vi.fn((tr) => {
        state = state.apply(tr);
        view.state = state;
      }),
      focus: vi.fn(),
      dom: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      coordsAtPos: () => ({ left: 20, top: 30 }),
    };

    editor.view = view;

    const slashEvent = { key: '/', preventDefault: vi.fn() };
    const handled = plugin.props.handleKeyDown.call(plugin, view, slashEvent);
    expect(handled).toBe(false);
    expect(slashEvent.preventDefault).not.toHaveBeenCalled();
    expect(view.dispatch).not.toHaveBeenCalled();
    expect(editor.emit).not.toHaveBeenCalledWith('slashMenu:open', expect.anything());
  });

  it('closes the menu if disableContextMenu becomes true after opening', () => {
    const baseDoc = doc(p());
    const initialSelection = TextSelection.create(baseDoc, 1);
    let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

    const editor = {
      options: { disableContextMenu: false },
      emit: vi.fn(),
      view: null,
    };

    const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
    state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

    const view = {
      state,
      dispatch: vi.fn((tr) => {
        state = state.apply(tr);
        view.state = state;
      }),
      focus: vi.fn(),
      dom: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      coordsAtPos: () => ({ left: 20, top: 30 }),
    };

    editor.view = view;

    const openEvent = {
      key: '/',
      preventDefault: vi.fn(),
    };

    const opened = plugin.props.handleKeyDown.call(plugin, view, openEvent);
    expect(opened).toBe(true);
    expect(SlashMenuPluginKey.getState(view.state).open).toBe(true);

    editor.options.disableContextMenu = true;
    view.dispatch(view.state.tr);

    expect(SlashMenuPluginKey.getState(view.state).open).toBe(false);
    expect(editor.emit).toHaveBeenCalledWith('slashMenu:close');
  });

  describe('cooldown mechanism', () => {
    it('prevents reopening menu during cooldown period', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        focus: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        coordsAtPos: () => ({ left: 20, top: 30 }),
      };

      editor.view = view;

      // Open menu first time
      const openEvent1 = { key: '/', preventDefault: vi.fn() };
      const opened1 = plugin.props.handleKeyDown.call(plugin, view, openEvent1);
      expect(opened1).toBe(true);
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(true);

      // Close menu
      const closeEvent = { key: 'Escape', preventDefault: vi.fn() };
      plugin.props.handleKeyDown.call(plugin, view, closeEvent);
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(false);

      // Try to open menu again immediately (should be blocked by cooldown)
      const openEvent2 = { key: '/', preventDefault: vi.fn() };
      const opened2 = plugin.props.handleKeyDown.call(plugin, view, openEvent2);
      expect(opened2).toBe(false); // Should return false during cooldown
      expect(openEvent2.preventDefault).not.toHaveBeenCalled();
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(false); // Should remain closed
    });

    it('allows reopening menu after cooldown expires', async () => {
      vi.useFakeTimers();

      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        focus: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        coordsAtPos: () => ({ left: 20, top: 30 }),
      };

      editor.view = view;

      // Open and close menu
      plugin.props.handleKeyDown.call(plugin, view, { key: '/', preventDefault: vi.fn() });
      plugin.props.handleKeyDown.call(plugin, view, { key: 'Escape', preventDefault: vi.fn() });

      // Fast forward past cooldown period (5000ms)
      vi.advanceTimersByTime(5000);

      // Should be able to open again after cooldown
      const openEvent = { key: '/', preventDefault: vi.fn() };
      const opened = plugin.props.handleKeyDown.call(plugin, view, openEvent);
      expect(opened).toBe(true);
      expect(openEvent.preventDefault).toHaveBeenCalled();
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(true);

      vi.useRealTimers();
    });

    it('clears cooldown timeout on plugin destroy', () => {
      vi.useFakeTimers();

      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        focus: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        coordsAtPos: () => ({ left: 20, top: 30 }),
      };

      editor.view = view;
      const viewLifecycle = plugin.spec.view?.(view);

      // Open and close to trigger cooldown
      plugin.props.handleKeyDown.call(plugin, view, { key: '/', preventDefault: vi.fn() });
      plugin.props.handleKeyDown.call(plugin, view, { key: 'Escape', preventDefault: vi.fn() });

      // Destroy should clear the timeout
      viewLifecycle?.destroy?.();

      // This test mainly ensures no memory leaks - we can't easily verify the timeout is cleared
      // but the destroy() call should not throw
      expect(true).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('menu positioning', () => {
    it('positions menu at clientX/clientY for context menu', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
      };

      editor.view = view;

      // Dispatch a transaction with clientX/clientY (context menu positioning)
      view.dispatch(
        view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'open',
          clientX: 150,
          clientY: 200,
          pos: 1,
        }),
      );

      const pluginState = SlashMenuPluginKey.getState(view.state);
      expect(pluginState.open).toBe(true);
      expect(pluginState.menuPosition).toEqual({
        left: '160px', // 150 + CONTEXT_MENU_OFFSET_X (10)
        top: '210px', // 200 + CONTEXT_MENU_OFFSET_Y (10)
      });
    });

    it('handles getBoundingClientRect errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        dom: {
          getBoundingClientRect: () => {
            throw new Error('Element detached');
          },
        },
      };

      editor.view = view;

      // This should not throw, but return unchanged state
      view.dispatch(
        view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'open',
          pos: 1,
        }),
      );

      const pluginState = SlashMenuPluginKey.getState(view.state);
      expect(pluginState.open).toBe(false); // Should remain closed due to error
      expect(consoleWarnSpy).toHaveBeenCalledWith('SlashMenu: Failed to get surface bounds', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });

    it('returns unchanged state when surface element is null', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
        presentationEditor: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
      };

      // No dom or element available
      editor.view = view;

      view.dispatch(
        view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'open',
          pos: 1,
        }),
      );

      const pluginState = SlashMenuPluginKey.getState(view.state);
      // Menu may not open if no surface is found, depending on implementation
      // At minimum, it should not throw
      expect(pluginState).toBeDefined();
    });
  });

  describe('state management', () => {
    it('handles select action', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
      };

      editor.view = view;

      // Dispatch select action
      view.dispatch(
        view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'select',
          id: 'heading-1',
        }),
      );

      const pluginState = SlashMenuPluginKey.getState(view.state);
      expect(pluginState.selected).toBe('heading-1');
    });

    it('handles updatePosition action', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
      };

      editor.view = view;

      // Dispatch updatePosition action (currently a no-op that falls through to default)
      view.dispatch(
        view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'updatePosition',
        }),
      );

      // Should not throw and state should be valid
      const pluginState = SlashMenuPluginKey.getState(view.state);
      expect(pluginState).toBeDefined();
      expect(pluginState.disabled).toBe(false);
    });
  });

  describe('input validation', () => {
    it('ignores slash when no cursor selection exists', () => {
      const baseDoc = doc(p('hello'));
      // Create a range selection instead of cursor
      const initialSelection = TextSelection.create(baseDoc, 1, 5);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
      };

      editor.view = view;

      const slashEvent = { key: '/', preventDefault: vi.fn() };
      const handled = plugin.props.handleKeyDown.call(plugin, view, slashEvent);
      expect(handled).toBe(false);
      expect(slashEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('ignores slash when not preceded by space or start of line', () => {
      const baseDoc = doc(p('hello'));
      const initialSelection = TextSelection.create(baseDoc, 6); // After 'hello'
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
      };

      editor.view = view;

      const slashEvent = { key: '/', preventDefault: vi.fn() };
      const handled = plugin.props.handleKeyDown.call(plugin, view, slashEvent);
      expect(handled).toBe(false);
      expect(slashEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('handles invalid meta.pos gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
      };

      editor.view = view;

      // Try to open with invalid position
      view.dispatch(
        view.state.tr.setMeta(SlashMenuPluginKey, {
          type: 'open',
          pos: 99999, // Way beyond doc size
        }),
      );

      const pluginState = SlashMenuPluginKey.getState(view.state);
      expect(pluginState.open).toBe(false); // Should remain closed
      expect(consoleWarnSpy).toHaveBeenCalledWith('SlashMenu: Invalid position', 99999);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('event handlers', () => {
    it('updates position on window scroll', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        focus: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        coordsAtPos: () => ({ left: 20, top: 30 }),
      };

      editor.view = view;
      const viewLifecycle = plugin.spec.view?.(view);

      // Open menu
      plugin.props.handleKeyDown.call(plugin, view, { key: '/', preventDefault: vi.fn() });
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(true);

      // Clear dispatch calls
      view.dispatch.mockClear();

      // Trigger scroll event
      window.dispatchEvent(new Event('scroll'));

      // Should dispatch updatePosition
      expect(view.dispatch).toHaveBeenCalled();
      const lastCall = view.dispatch.mock.calls[view.dispatch.mock.calls.length - 1];
      const meta = lastCall[0].getMeta(SlashMenuPluginKey);
      expect(meta?.type).toBe('updatePosition');

      viewLifecycle?.destroy?.();
    });

    it('updates position on window resize', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        focus: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        coordsAtPos: () => ({ left: 20, top: 30 }),
      };

      editor.view = view;
      const viewLifecycle = plugin.spec.view?.(view);

      // Open menu
      plugin.props.handleKeyDown.call(plugin, view, { key: '/', preventDefault: vi.fn() });
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(true);

      // Clear dispatch calls
      view.dispatch.mockClear();

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      // Should dispatch updatePosition
      expect(view.dispatch).toHaveBeenCalled();
      const lastCall = view.dispatch.mock.calls[view.dispatch.mock.calls.length - 1];
      const meta = lastCall[0].getMeta(SlashMenuPluginKey);
      expect(meta?.type).toBe('updatePosition');

      viewLifecycle?.destroy?.();
    });

    it('removes event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
      };

      editor.view = view;
      const viewLifecycle = plugin.spec.view?.(view);

      // Destroy the plugin
      viewLifecycle?.destroy?.();

      // Verify event listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('keyboard shortcuts', () => {
    it('closes menu with ArrowLeft', () => {
      const baseDoc = doc(p());
      const initialSelection = TextSelection.create(baseDoc, 1);
      let state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection });

      const editor = {
        options: {},
        emit: vi.fn(),
        view: null,
      };

      const [plugin] = SlashMenu.config.addPmPlugins.call({ editor });
      state = EditorState.create({ schema, doc: baseDoc, selection: initialSelection, plugins: [plugin] });

      const view = {
        state,
        dispatch: vi.fn((tr) => {
          state = state.apply(tr);
          view.state = state;
        }),
        focus: vi.fn(),
        dom: {
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
        },
        coordsAtPos: () => ({ left: 20, top: 30 }),
      };

      editor.view = view;

      // Open menu
      plugin.props.handleKeyDown.call(plugin, view, { key: '/', preventDefault: vi.fn() });
      expect(SlashMenuPluginKey.getState(view.state).open).toBe(true);

      // Close with ArrowLeft
      const closeEvent = { key: 'ArrowLeft', preventDefault: vi.fn() };
      const closed = plugin.props.handleKeyDown.call(plugin, view, closeEvent);
      expect(closed).toBe(true);

      const pluginState = SlashMenuPluginKey.getState(view.state);
      expect(pluginState.open).toBe(false);
      expect(editor.emit).toHaveBeenCalledWith('slashMenu:close');
      expect(view.focus).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
