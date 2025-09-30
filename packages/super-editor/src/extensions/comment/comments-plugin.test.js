import { describe, it, expect, vi, afterEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

import { Extension } from '@core/Extension.js';
import { CommentsPlugin, CommentsPluginKey } from './comments-plugin.js';
import { CommentMarkName } from './comments-constants.js';
import { TrackChangesBasePluginKey } from '../track-changes/plugins/index.js';

const createCommentSchema = () => {
  const nodes = {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    text: { group: 'inline' },
  };

  const marks = {
    [CommentMarkName]: {
      attrs: { commentId: {}, importedId: { default: null }, internal: { default: true } },
      inclusive: false,
      toDOM: (mark) => [CommentMarkName, mark.attrs],
      parseDOM: [{ tag: CommentMarkName }],
    },
  };

  return new Schema({ nodes, marks });
};

const createEditorEnvironment = (schema, doc) => {
  const endPos = Math.min(doc.content.size, 2);
  const selection = endPos > 1 ? TextSelection.create(doc, 1, endPos) : TextSelection.create(doc, 1, 1);
  const baseState = EditorState.create({ schema, doc, selection });

  const view = {
    state: baseState,
    dispatch: vi.fn((tr) => {
      view.state = view.state.apply(tr);
    }),
    focus: vi.fn(),
  };

  const editor = {
    schema,
    view,
    emit: vi.fn(),
    options: {},
    setOptions: vi.fn(),
  };

  Object.defineProperty(editor, 'state', {
    get() {
      return view.state;
    },
  });

  const extension = Extension.create(CommentsPlugin.config);
  extension.addCommands = CommentsPlugin.config.addCommands.bind(extension);
  extension.addPmPlugins = CommentsPlugin.config.addPmPlugins.bind(extension);
  extension.editor = editor;

  return { editor, commands: extension.addCommands(), view };
};

describe('CommentsPlugin commands', () => {
  it('inserts new comment marks with metadata', () => {
    const schema = createCommentSchema();
    const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const { editor, commands, view } = createEditorEnvironment(schema, doc);

    let currentState = editor.state;
    const dispatch = vi.fn((tr) => {
      currentState = currentState.apply(tr);
      view.state = currentState;
    });

    const command = commands.insertComment({ commentId: 'c-1', isInternal: true });
    const tr = currentState.tr;
    const result = command({ tr, state: currentState, dispatch });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    const dispatchedTr = dispatch.mock.calls[0][0];
    expect(dispatchedTr.getMeta(CommentsPluginKey)).toMatchObject({ event: 'add' });

    const applied = currentState;
    const mark = applied.doc.nodeAt(1)?.marks.find((m) => m.type === schema.marks[CommentMarkName]);
    expect(mark?.attrs).toMatchObject({ commentId: 'c-1', internal: true });
  });

  it('updates comment internals when toggled', () => {
    const schema = createCommentSchema();
    const mark = schema.marks[CommentMarkName].create({ commentId: 'c-42', internal: true });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [mark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const { editor, commands, view } = createEditorEnvironment(schema, doc);

    let currentState = editor.state;
    const dispatch = vi.fn((tr) => {
      currentState = currentState.apply(tr);
      view.state = currentState;
    });

    const command = commands.setCommentInternal({ commentId: 'c-42', isInternal: false });
    const tr = currentState.tr;
    const result = command({ tr, state: currentState, dispatch });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    const dispatchedTr = dispatch.mock.calls[0][0];
    expect(dispatchedTr.getMeta(CommentsPluginKey)).toMatchObject({ type: 'setCommentInternal' });

    const updatedMark = currentState.doc.nodeAt(1)?.marks.find((m) => m.type === schema.marks[CommentMarkName]);
    expect(updatedMark?.attrs.internal).toBe(false);
  });

  it('focuses editor when moving the cursor to a comment by id', () => {
    const schema = createCommentSchema();
    const mark = schema.marks[CommentMarkName].create({ commentId: 'c-10', internal: true });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [mark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const { editor, commands } = createEditorEnvironment(schema, doc);

    const result = commands.setCursorById('c-10')({ state: editor.state, editor });

    expect(result).toBe(true);
    expect(editor.view.focus).toHaveBeenCalled();
  });
});

const createPluginStateEnvironment = () => {
  const schema = createCommentSchema();
  const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
  const doc = schema.node('doc', null, [paragraph]);
  const selection = TextSelection.create(doc, 1);

  let state = EditorState.create({ schema, doc, selection });

  const editor = {
    options: { documentId: 'doc-1' },
    emit: vi.fn(),
    view: null,
  };

  const extension = Extension.create(CommentsPlugin.config);
  extension.addCommands = CommentsPlugin.config.addCommands.bind(extension);
  extension.addPmPlugins = CommentsPlugin.config.addPmPlugins.bind(extension);
  extension.editor = editor;
  const [plugin] = extension.addPmPlugins();

  state = EditorState.create({ schema, doc, selection, plugins: [plugin] });

  const view = {
    state,
    dispatch: vi.fn((tr) => {
      state = state.apply(tr);
      view.state = state;
    }),
    focus: vi.fn(),
  };

  editor.view = view;
  plugin.spec.view?.(view);

  return { plugin, editor, view, schema };
};

describe('CommentsPlugin state', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates active thread and emits events when setActiveComment meta is applied', () => {
    const { view, editor } = createPluginStateEnvironment();

    const tr = view.state.tr.setMeta(CommentsPluginKey, {
      type: 'setActiveComment',
      activeThreadId: 'thread-1',
      forceUpdate: true,
    });

    view.dispatch(tr);

    const pluginState = CommentsPluginKey.getState(view.state);
    expect(pluginState.activeThreadId).toBe('thread-1');
    expect(pluginState.changedActiveThread).toBe(true);
  });

  it('stores decorations provided through metadata', () => {
    const { view } = createPluginStateEnvironment();
    const decorations = DecorationSet.create(view.state.doc, []);

    const tr = view.state.tr.setMeta(CommentsPluginKey, {
      decorations,
      allCommentPositions: { thread: { start: 1, end: 2 } },
    });

    view.dispatch(tr);

    const pluginState = CommentsPluginKey.getState(view.state);
    expect(pluginState.decorations).toBe(decorations);
    expect(pluginState.allCommentPositions).toEqual({ thread: { start: 1, end: 2 } });
  });

  it('collects tracked change metadata and emits updates', () => {
    const { view, editor } = createPluginStateEnvironment();
    const trackedMark = {
      attrs: { id: 'change-1', author: 'A', authorEmail: 'a@example.com', date: 'now' },
      type: { name: 'trackInsert' },
    };

    const tr = view.state.tr.setMeta(TrackChangesBasePluginKey, {
      insertedMark: trackedMark,
      deletionMark: null,
      formatMark: null,
      deletionNodes: [],
      step: { slice: { content: { content: [view.state.doc.firstChild] } } },
    });

    view.dispatch(tr);

    const pluginState = CommentsPluginKey.getState(view.state);
    expect(pluginState.trackedChanges['change-1']).toBeDefined();
  });
});
