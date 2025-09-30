import { describe, expect, it, vi, afterEach } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema, doc, p } from 'prosemirror-test-builder';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { SlashMenu, SlashMenuPluginKey } from './slash-menu.js';

describe('SlashMenu extension', () => {
  it('registers the plugin key', () => {
    expect(SlashMenuPluginKey.key.startsWith('slashMenu')).toBe(true);
  });

  it('skips plugin creation when disabled or headless', () => {
    const disabledContextMenu = SlashMenu.config.addPmPlugins.call({
      editor: { options: { disableContextMenu: true } },
    });
    expect(disabledContextMenu).toEqual([]);

    const headless = SlashMenu.config.addPmPlugins.call({ editor: { options: { isHeadless: true } } });
    expect(headless).toEqual([]);
  });

  it('creates a plugin when enabled', () => {
    const { editor } = initTestEditor({
      mode: 'text',
      content: '<p></p>',
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

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
