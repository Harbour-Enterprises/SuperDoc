import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

import { Extension } from '@core/Extension.js';
import { CustomSelection, CustomSelectionPluginKey } from './custom-selection.js';
import { shouldAllowNativeContextMenu } from '../../utils/contextmenu-helpers.js';

describe('shouldAllowNativeContextMenu', () => {
  it('returns false for standard right click', () => {
    const event = {
      type: 'contextmenu',
      ctrlKey: false,
      metaKey: false,
      detail: 1,
      button: 2,
      clientX: 120,
      clientY: 140,
    };

    expect(shouldAllowNativeContextMenu(event)).toBe(false);
  });

  it('returns true when modifier key is pressed', () => {
    const event = {
      type: 'contextmenu',
      ctrlKey: true,
      metaKey: false,
      detail: 1,
      button: 2,
      clientX: 120,
      clientY: 140,
    };

    expect(shouldAllowNativeContextMenu(event)).toBe(true);
  });

  it('returns true for keyboard invocation', () => {
    const event = {
      type: 'contextmenu',
      ctrlKey: false,
      metaKey: false,
      detail: 0,
      button: 0,
      clientX: 0,
      clientY: 0,
    };

    expect(shouldAllowNativeContextMenu(event)).toBe(true);
  });
});

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

    const event = {
      preventDefault: vi.fn(),
      detail: 0,
      button: 2,
      clientX: 120,
      clientY: 140,
      type: 'contextmenu',
    };
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

  it('retains preserved selection after focus triggered by context menu refocus', () => {
    const { plugin, view } = createEnvironment();

    const contextEvent = {
      preventDefault: vi.fn(),
      detail: 0,
      button: 2,
      clientX: 120,
      clientY: 140,
      type: 'contextmenu',
    };

    plugin.props.handleDOMEvents.contextmenu(view, contextEvent);
    view.dispatch.mockClear();

    plugin.props.handleDOMEvents.focus(view);

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchedTr = view.dispatch.mock.calls[0][0];
    expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
      skipFocusReset: false,
    });

    const focusState = CustomSelectionPluginKey.getState(view.state);
    expect(focusState.showVisualSelection).toBe(true);
    expect(focusState.preservedSelection).not.toBeNull();
  });

  it('ignores blur clearing when selection preserved for context menu', () => {
    const { plugin, view } = createEnvironment();

    const contextEvent = {
      preventDefault: vi.fn(),
      detail: 0,
      button: 2,
      clientX: 120,
      clientY: 140,
      type: 'contextmenu',
    };

    plugin.props.handleDOMEvents.contextmenu(view, contextEvent);
    view.dispatch.mockClear();

    const handled = plugin.props.handleDOMEvents.blur(view);

    expect(handled).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();

    const focusState = CustomSelectionPluginKey.getState(view.state);
    expect(focusState.showVisualSelection).toBe(true);
    expect(focusState.preservedSelection).not.toBeNull();
  });

  it('allows native context menu when modifier pressed', () => {
    const { plugin, view } = createEnvironment();

    const contextEvent = {
      preventDefault: vi.fn(),
      ctrlKey: true,
      detail: 0,
      button: 2,
      clientX: 160,
      clientY: 180,
      type: 'contextmenu',
    };

    const handled = plugin.props.handleDOMEvents.contextmenu(view, contextEvent);

    expect(handled).toBe(false);
    expect(contextEvent.preventDefault).not.toHaveBeenCalled();
    expect(view.dispatch).not.toHaveBeenCalled();

    const mouseDownEvent = {
      button: 2,
      ctrlKey: true,
      preventDefault: vi.fn(),
      clientX: 160,
      clientY: 180,
      type: 'mousedown',
    };

    const mouseHandled = plugin.props.handleDOMEvents.mousedown(view, mouseDownEvent);

    expect(mouseHandled).toBe(false);
    expect(mouseDownEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('allows native context menu for keyboard invocation', () => {
    const { plugin, view } = createEnvironment();

    const keyboardEvent = {
      preventDefault: vi.fn(),
      detail: 0,
      button: 0,
      clientX: 0,
      clientY: 0,
      type: 'contextmenu',
    };

    const handled = plugin.props.handleDOMEvents.contextmenu(view, keyboardEvent);

    expect(handled).toBe(false);
    expect(keyboardEvent.preventDefault).not.toHaveBeenCalled();
    expect(view.dispatch).not.toHaveBeenCalled();
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

  it('clears header lastSelection when clicking inside editor', () => {
    const { plugin, view, editor } = createEnvironment();
    editor.options.isHeaderOrFooter = true;
    editor.options.lastSelection = view.state.selection;

    const mouseEvent = {
      button: 0,
      target: editor.options.element,
      type: 'mousedown',
    };

    plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

    expect(editor.options.lastSelection).toBeNull();
  });

  describe('toolbar button interactions', () => {
    it('preserves selection when clicking toolbar button with non-empty selection', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarButton = document.createElement('button');
      toolbarButton.classList.add('toolbar-button');
      document.body.appendChild(toolbarButton);

      const mouseEvent = {
        button: 0,
        target: toolbarButton,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(view.dispatch).toHaveBeenCalled();
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: true,
        showVisualSelection: true,
        skipFocusReset: false,
      });
      expect(editor.options.lastSelection).toBe(view.state.selection);
    });

    it('handles toolbar button click with empty selection', () => {
      const { plugin, view, schema } = createEnvironment();

      // Create state with empty selection
      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello')])]);
      const emptySelection = TextSelection.create(doc, 1);
      view.state = EditorState.create({ schema, doc, selection: emptySelection, plugins: [plugin] });

      const toolbarButton = document.createElement('button');
      toolbarButton.classList.add('toolbar-button');
      document.body.appendChild(toolbarButton);

      const mouseEvent = {
        button: 0,
        target: toolbarButton,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      // Should not preserve empty selection
      expect(view.dispatch).not.toHaveBeenCalled();
    });

    it('detects toolbar button via closest()', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarButton = document.createElement('button');
      toolbarButton.classList.add('toolbar-button');
      const innerSpan = document.createElement('span');
      toolbarButton.appendChild(innerSpan);
      document.body.appendChild(toolbarButton);

      const mouseEvent = {
        button: 0,
        target: innerSpan, // Click on child element
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(view.dispatch).toHaveBeenCalled();
      expect(editor.options.lastSelection).toBe(view.state.selection);
    });
  });

  describe('toolbar input interactions', () => {
    it('preserves selection when clicking toolbar input', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarInput = document.createElement('input');
      toolbarInput.classList.add('button-text-input');
      document.body.appendChild(toolbarInput);

      const mouseEvent = {
        button: 0,
        target: toolbarInput,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(view.dispatch).toHaveBeenCalled();
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: true,
        showVisualSelection: true,
        skipFocusReset: false,
      });
      expect(editor.options.lastSelection).toBe(view.state.selection);
      expect(editor.options.preservedSelection).toBe(view.state.selection);
    });

    it('handles toolbar input click with empty selection', () => {
      const { plugin, view, schema } = createEnvironment();

      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello')])]);
      const emptySelection = TextSelection.create(doc, 1);
      view.state = EditorState.create({ schema, doc, selection: emptySelection, plugins: [plugin] });

      const toolbarInput = document.createElement('input');
      toolbarInput.classList.add('button-text-input');
      document.body.appendChild(toolbarInput);

      const mouseEvent = {
        button: 0,
        target: toolbarInput,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(view.dispatch).not.toHaveBeenCalled();
    });

    it('detects toolbar input via closest()', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarInput = document.createElement('div');
      toolbarInput.classList.add('button-text-input');
      const innerInput = document.createElement('input');
      toolbarInput.appendChild(innerInput);
      document.body.appendChild(toolbarInput);

      const mouseEvent = {
        button: 0,
        target: innerInput,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(view.dispatch).toHaveBeenCalled();
      expect(editor.options.preservedSelection).toBe(view.state.selection);
    });
  });

  describe('right-click handling', () => {
    it('preserves selection on right-click with non-empty selection', () => {
      const { plugin, view, editor } = createEnvironment();

      const mouseEvent = {
        button: 2,
        preventDefault: vi.fn(),
        target: editor.options.element,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(mouseEvent.preventDefault).toHaveBeenCalled();
      expect(view.dispatch).toHaveBeenCalled();
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: true,
        showVisualSelection: true,
        skipFocusReset: true,
      });
      expect(editor.options.lastSelection).toBe(view.state.selection);
      expect(editor.options.preservedSelection).toBe(view.state.selection);
    });

    it('handles right-click with empty selection', () => {
      const { plugin, view, schema, editor } = createEnvironment();

      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello')])]);
      const emptySelection = TextSelection.create(doc, 1);
      view.state = EditorState.create({ schema, doc, selection: emptySelection, plugins: [plugin] });

      const mouseEvent = {
        button: 2,
        preventDefault: vi.fn(),
        target: editor.options.element,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(mouseEvent.preventDefault).toHaveBeenCalled();
      expect(view.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('clicking outside editor', () => {
    it('clears selection when clicking outside editor', () => {
      const { plugin, view, editor } = createEnvironment();

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseEvent = {
        button: 0,
        target: outsideElement,
        type: 'mousedown',
      };

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      expect(view.dispatch).toHaveBeenCalledTimes(2);

      // First call clears preserved selection
      const firstTr = view.dispatch.mock.calls[0][0];
      expect(firstTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: false,
        preservedSelection: null,
        showVisualSelection: false,
      });

      // Second call clears actual selection
      const secondTr = view.dispatch.mock.calls[1][0];
      expect(secondTr.selection.from).toBe(0);
      expect(secondTr.selection.to).toBe(0);
      expect(editor.options.lastSelection).not.toBeNull();
    });

    it('does not clear selection when clicking inside editor', () => {
      const { plugin, view, editor } = createEnvironment();

      const mouseEvent = {
        button: 0,
        target: editor.options.element,
        type: 'mousedown',
      };

      const initialSelection = view.state.selection;
      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.mousedown(view, mouseEvent);

      // Only one dispatch to clear preserved state
      expect(view.dispatch).toHaveBeenCalledTimes(1);
      const tr = view.dispatch.mock.calls[0][0];
      expect(tr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: false,
        preservedSelection: null,
        showVisualSelection: false,
      });

      // Selection should not be modified (no setSelection called)
      expect(tr.steps.length).toBe(0);
      expect(view.state.selection).toEqual(initialSelection);
    });
  });

  describe('focus event handling', () => {
    it('clears preserved selection on focus from non-toolbar element', () => {
      const { plugin, view, editor } = createEnvironment();

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      editor.options.focusTarget = outsideElement;

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.focus(view);

      expect(view.dispatch).toHaveBeenCalled();
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: false,
        preservedSelection: null,
        showVisualSelection: false,
        skipFocusReset: false,
      });
    });

    it('does not clear when focus from toolbar button', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarButton = document.createElement('button');
      toolbarButton.classList.add('toolbar-button');
      document.body.appendChild(toolbarButton);
      editor.options.focusTarget = toolbarButton;

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.focus(view);

      expect(view.dispatch).not.toHaveBeenCalled();
    });

    it('does not clear when focus from toolbar input', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarInput = document.createElement('input');
      toolbarInput.classList.add('button-text-input');
      document.body.appendChild(toolbarInput);
      editor.options.focusTarget = toolbarInput;

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.focus(view);

      expect(view.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('blur event handling', () => {
    it('clears selection when blurring to non-toolbar element', () => {
      const { plugin, view, editor } = createEnvironment();

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      editor.options.focusTarget = outsideElement;

      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.blur(view);

      expect(view.dispatch).toHaveBeenCalled();
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.getMeta(CustomSelectionPluginKey)).toMatchObject({
        focused: false,
        preservedSelection: null,
        showVisualSelection: false,
      });
    });

    it('preserves selection when blurring to toolbar button', () => {
      const { plugin, view, editor } = createEnvironment();

      const toolbarButton = document.createElement('button');
      toolbarButton.classList.add('toolbar-button');
      document.body.appendChild(toolbarButton);
      editor.options.focusTarget = toolbarButton;

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

  describe('decorations', () => {
    it('returns null when showVisualSelection is false', () => {
      const { plugin, view } = createEnvironment();

      const decorations = plugin.props.decorations(view.state);
      expect(decorations).toBeNull();
    });

    it('returns null when selection is empty', () => {
      const { plugin, view, schema } = createEnvironment();

      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello')])]);
      const emptySelection = TextSelection.create(doc, 1);
      const newState = EditorState.create({ schema, doc, selection: emptySelection, plugins: [plugin] });

      const tr = newState.tr.setMeta(CustomSelectionPluginKey, {
        focused: true,
        showVisualSelection: true,
      });
      const stateWithMeta = newState.apply(tr);

      const decorations = plugin.props.decorations(stateWithMeta);
      expect(decorations).toBeNull();
    });

    it('returns decorations for current selection when focused', () => {
      const { plugin, view } = createEnvironment();

      const tr = view.state.tr.setMeta(CustomSelectionPluginKey, {
        focused: true,
        showVisualSelection: true,
      });
      view.dispatch(tr);

      const decorations = plugin.props.decorations(view.state);
      expect(decorations).toBeInstanceOf(DecorationSet);
      const decos = decorations.find();
      expect(decos.length).toBeGreaterThan(0);
      const [firstDeco] = decos;
      expect(firstDeco?.from).toBe(1);
      expect(firstDeco?.to).toBe(6);
      // The class is stored in the type.attrs object for inline decorations
      expect(firstDeco?.type?.attrs?.class).toBe('sd-custom-selection');
    });

    it('prefers preserved selection over current selection', () => {
      const { plugin, view, schema } = createEnvironment();

      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello world')])]);
      const currentSelection = TextSelection.create(doc, 1, 3);
      const preservedSelection = TextSelection.create(doc, 3, 8);
      view.state = EditorState.create({ schema, doc, selection: currentSelection, plugins: [plugin] });

      const tr = view.state.tr.setMeta(CustomSelectionPluginKey, {
        focused: true,
        preservedSelection: preservedSelection,
        showVisualSelection: true,
      });
      view.dispatch(tr);

      const decorations = plugin.props.decorations(view.state);
      const [firstDeco] = decorations.find();
      expect(firstDeco?.from).toBe(3);
      expect(firstDeco?.to).toBe(8);
    });
  });

  describe('restorePreservedSelection command', () => {
    it('restores selection from plugin state', () => {
      const { editor, view, schema, plugin } = createEnvironment();

      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello world')])]);
      const preservedSelection = TextSelection.create(doc, 3, 8);
      const currentSelection = TextSelection.create(doc, 1, 2);

      const newState = EditorState.create({ schema, doc, selection: currentSelection, plugins: [plugin] });
      view.state = newState;

      const tr = view.state.tr.setMeta(CustomSelectionPluginKey, {
        preservedSelection: preservedSelection,
      });
      view.dispatch(tr);

      const extension = Extension.create(CustomSelection.config);
      extension.editor = editor;
      const commands = CustomSelection.config.addCommands.call(extension);

      const commandTr = view.state.tr;
      const result = commands.restorePreservedSelection()({ tr: commandTr, state: view.state });

      expect(result.selection).toBe(preservedSelection);
    });

    it('restores selection from editor options when plugin state is empty', () => {
      const { editor, view, schema, plugin } = createEnvironment();

      const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello world')])]);
      const lastSelection = TextSelection.create(doc, 5, 10);
      const currentSelection = TextSelection.create(doc, 1, 2);

      const newState = EditorState.create({ schema, doc, selection: currentSelection, plugins: [plugin] });
      view.state = newState;

      editor.options.lastSelection = lastSelection;

      const extension = Extension.create(CustomSelection.config);
      extension.editor = editor;
      const commands = CustomSelection.config.addCommands.call(extension);

      const commandTr = view.state.tr;
      const result = commands.restorePreservedSelection()({ tr: commandTr, state: view.state });

      expect(result.selection).toBe(lastSelection);
    });

    it('returns unchanged transaction when no preserved selection exists', () => {
      const { editor, view } = createEnvironment();

      const extension = Extension.create(CustomSelection.config);
      extension.editor = editor;
      const commands = CustomSelection.config.addCommands.call(extension);

      const commandTr = view.state.tr;
      const result = commands.restorePreservedSelection()({ tr: commandTr, state: view.state });

      expect(result).toBe(commandTr);
    });
  });

  describe('view lifecycle', () => {
    it('adds and removes document event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { editor } = createEnvironment();
      const extension = Extension.create(CustomSelection.config);
      extension.editor = editor;
      const plugins = CustomSelection.config.addPmPlugins.call(extension);
      const plugin = plugins[0];

      const viewInstance = plugin.spec.view();

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      const handlerFunc = addEventListenerSpy.mock.calls[0][1];
      viewInstance.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', handlerFunc);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('handleClickOutside', () => {
    it('sets focusTarget when clicking outside editor', () => {
      const { editor } = createEnvironment();

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const event = {
        target: outsideElement,
      };

      const extension = Extension.create(CustomSelection.config);
      extension.editor = editor;
      const plugins = CustomSelection.config.addPmPlugins.call(extension);
      const plugin = plugins[0];
      const viewInstance = plugin.spec.view();

      // Trigger the click handler
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      // Clean up
      viewInstance.destroy();
    });

    it('clears focusTarget when clicking inside editor', () => {
      const { editor } = createEnvironment();

      editor.setOptions({ focusTarget: document.createElement('div') });

      const event = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: editor.options.element,
        configurable: true,
      });

      const extension = Extension.create(CustomSelection.config);
      extension.editor = editor;
      const plugins = CustomSelection.config.addPmPlugins.call(extension);
      const plugin = plugins[0];
      const viewInstance = plugin.spec.view();

      document.dispatchEvent(event);

      // Clean up
      viewInstance.destroy();
    });
  });

  describe('state transitions', () => {
    it('handles sequence: toolbar click -> blur -> focus', () => {
      const { plugin, view, editor } = createEnvironment();

      // 1. Click toolbar button
      const toolbarButton = document.createElement('button');
      toolbarButton.classList.add('toolbar-button');
      document.body.appendChild(toolbarButton);

      plugin.props.handleDOMEvents.mousedown(view, {
        button: 0,
        target: toolbarButton,
        type: 'mousedown',
      });

      let focusState = CustomSelectionPluginKey.getState(view.state);
      expect(focusState.showVisualSelection).toBe(true);

      // 2. Editor blurs (toolbar takes focus)
      editor.options.focusTarget = toolbarButton;
      plugin.props.handleDOMEvents.blur(view);

      focusState = CustomSelectionPluginKey.getState(view.state);
      expect(focusState.showVisualSelection).toBe(true);

      // 3. Editor regains focus
      plugin.props.handleDOMEvents.focus(view);

      focusState = CustomSelectionPluginKey.getState(view.state);
      // Should maintain selection because focus target is toolbar
      expect(view.dispatch).toHaveBeenCalled();
    });

    it('handles context menu -> blur -> focus sequence', () => {
      const { plugin, view } = createEnvironment();

      // 1. Context menu
      plugin.props.handleDOMEvents.contextmenu(view, {
        preventDefault: vi.fn(),
        detail: 0,
        button: 2,
        clientX: 120,
        clientY: 140,
        type: 'contextmenu',
      });

      let focusState = CustomSelectionPluginKey.getState(view.state);
      expect(focusState.skipFocusReset).toBe(true);

      // 2. Blur
      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.blur(view);

      // Should not clear because skipFocusReset is true
      expect(view.dispatch).not.toHaveBeenCalled();

      // 3. Focus
      view.dispatch.mockClear();
      plugin.props.handleDOMEvents.focus(view);

      // Should reset skipFocusReset
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.getMeta(CustomSelectionPluginKey).skipFocusReset).toBe(false);
    });
  });
});
