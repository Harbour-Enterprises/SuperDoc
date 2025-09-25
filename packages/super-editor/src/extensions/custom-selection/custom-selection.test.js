import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

import { Extension } from '@core/Extension.js';
import { CustomSelection, CustomSelectionPluginKey } from './custom-selection.js';

const createEnvironment = () => {
  const nodes = {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    text: { group: 'inline' },
  };

  const schema = new Schema({ nodes, marks: {} });
  const paragraph = schema.node('paragraph', null, [schema.text('Hello world')]);
  const doc = schema.node('doc', null, [paragraph]);
  const selection = TextSelection.create(doc, 1, 6);

  const element = document.createElement('div');
  document.body.appendChild(element);

  const editor = {
    schema,
    options: {
      element,
      focusTarget: null,
      lastSelection: null,
    },
    setOptions(updates) {
      Object.assign(this.options, updates);
    },
    emit: vi.fn(),
  };

  const extension = Extension.create(CustomSelection.config);
  extension.addPmPlugins = CustomSelection.config.addPmPlugins.bind(extension);
  extension.addCommands = CustomSelection.config.addCommands.bind(extension);
  extension.editor = editor;
  const plugin = extension.addPmPlugins()[0];

  let state = EditorState.create({ schema, doc, selection, plugins: [plugin] });

  const view = {
    state,
    dispatch: vi.fn((tr) => {
      state = state.apply(tr);
      view.state = state;
    }),
    focus: vi.fn(),
  };

  Object.defineProperty(editor, 'state', {
    get() {
      return view.state;
    },
  });
  editor.view = view;

  return { editor, plugin, view, schema };
};

describe('CustomSelection plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('preserves selection on context menu interactions', () => {
    const { plugin, view } = createEnvironment();

    const event = { preventDefault: vi.fn() };
    const handled = plugin.props.handleDOMEvents.contextmenu(view, event);

    expect(handled).toBe(false);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(view.dispatch).toHaveBeenCalled();

    const dispatchedTr = view.dispatch.mock.calls[0][0];
    expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
      focused: true,
      showVisualSelection: true,
    });

    vi.runAllTimers();
    expect(view.focus).toHaveBeenCalled();
  });

  it('returns decorations for preserved selections', () => {
    const { plugin, view } = createEnvironment();

    // Simulate stored selection via metadata
    const tr = view.state.tr.setMeta(CustomSelectionPluginKey, {
      focused: true,
      preservedSelection: view.state.selection,
      showVisualSelection: true,
    });
    view.dispatch(tr);

    const decorations = plugin.props.decorations(view.state);
    expect(decorations).toBeInstanceOf(DecorationSet);
    const [firstDeco] = decorations.find();
    expect(firstDeco?.from).toBe(1);
    expect(firstDeco?.to).toBe(6);
  });

  it('keeps selection visible when toolbar elements retain focus', () => {
    const { plugin, view, editor } = createEnvironment();

    const tr = view.state.tr.setMeta(CustomSelectionPluginKey, {
      focused: true,
      preservedSelection: view.state.selection,
      showVisualSelection: true,
    });
    view.dispatch(tr);

    const toolbarInput = document.createElement('input');
    toolbarInput.classList.add('button-text-input');
    editor.options.focusTarget = toolbarInput;

    view.dispatch.mockClear();
    plugin.props.handleDOMEvents.blur(view);

    expect(view.dispatch).toHaveBeenCalled();
    const dispatchedTr = view.dispatch.mock.calls[0][0];
    expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
      focused: true,
      showVisualSelection: true,
    });
  });
});
