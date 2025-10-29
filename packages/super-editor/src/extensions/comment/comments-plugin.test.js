import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'generated-id'),
}));
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

import { Extension } from '@core/Extension.js';
import { CommentsPlugin, CommentsPluginKey, __test__ } from './comments-plugin.js';
import { CommentMarkName } from './comments-constants.js';
import { TrackChangesBasePluginKey } from '../track-changes/plugins/index.js';
import { comments_module_events } from '@harbour-enterprises/common';
import * as CommentHelpers from './comments-helpers.js';
import { normalizeCommentEventPayload, updatePosition } from './helpers/index.js';
import { TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName } from '../track-changes/constants.js';

const {
  getActiveCommentId,
  findTrackedMark,
  handleTrackedChangeTransaction,
  getTrackedChangeText,
  createOrUpdateTrackedChangeComment,
  findRangeById,
} = __test__;

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
    [TrackInsertMarkName]: {
      attrs: { id: {}, author: { default: null }, authorEmail: { default: null }, date: { default: null } },
      inclusive: false,
      toDOM: (mark) => [TrackInsertMarkName, mark.attrs],
      parseDOM: [{ tag: TrackInsertMarkName }],
    },
    [TrackDeleteMarkName]: {
      attrs: { id: {}, author: { default: null }, authorEmail: { default: null }, date: { default: null } },
      inclusive: false,
      toDOM: (mark) => [TrackDeleteMarkName, mark.attrs],
      parseDOM: [{ tag: TrackDeleteMarkName }],
    },
    [TrackFormatMarkName]: {
      attrs: {
        id: {},
        author: { default: null },
        authorEmail: { default: null },
        date: { default: null },
        before: { default: [] },
        after: { default: [] },
      },
      inclusive: false,
      toDOM: (mark) => [TrackFormatMarkName, mark.attrs],
      parseDOM: [{ tag: TrackFormatMarkName }],
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
    options: {
      user: { name: 'Test User', email: 'test.user@example.com', image: 'https://example.com/avatar.png' },
      documentId: 'doc-1',
      isInternal: true,
    },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const command = commands.insertComment({ commentId: 'c-1', isInternal: true, text: '<p>Hello</p>' });
    const tr = currentState.tr;
    const result = command({ tr, state: currentState, dispatch });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalled();
    const dispatchedTr = dispatch.mock.calls[0][0];
    expect(dispatchedTr.getMeta(CommentsPluginKey)).toMatchObject({ event: 'add' });

    expect(editor.emit).toHaveBeenCalledWith(
      'commentsUpdate',
      expect.objectContaining({
        type: comments_module_events.ADD,
        comment: expect.objectContaining({
          commentId: 'c-1',
          isInternal: true,
          commentText: '<p>Hello</p>',
          creatorName: 'Test User',
          creatorEmail: 'test.user@example.com',
          creatorImage: 'https://example.com/avatar.png',
          fileId: 'doc-1',
        }),
        activeCommentId: 'c-1',
      }),
    );

    const applied = currentState;
    const mark = applied.doc.nodeAt(1)?.marks.find((m) => m.type === schema.marks[CommentMarkName]);
    expect(mark?.attrs).toMatchObject({ commentId: 'c-1', internal: true });
  });

  it('skips emitting events when skipEmit flag is provided', () => {
    const schema = createCommentSchema();
    const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const { editor, commands, view } = createEditorEnvironment(schema, doc);

    let currentState = editor.state;
    const dispatch = vi.fn((tr) => {
      currentState = currentState.apply(tr);
      view.state = currentState;
    });

    const command = commands.insertComment({ commentId: 'c-2', isInternal: false, skipEmit: true });
    const tr = currentState.tr;
    const result = command({ tr, state: currentState, dispatch });

    expect(result).toBe(true);
    expect(editor.emit).not.toHaveBeenCalled();

    const applied = currentState;
    const mark = applied.doc.nodeAt(1)?.marks.find((m) => m.type === schema.marks[CommentMarkName]);
    expect(mark?.attrs).toMatchObject({ commentId: 'c-2', internal: false });
  });

  it('assigns generated id and defaults isInternal to false when omitted', () => {
    const schema = createCommentSchema();
    const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const { editor, commands, view } = createEditorEnvironment(schema, doc);

    let currentState = editor.state;
    const dispatch = vi.fn((tr) => {
      currentState = currentState.apply(tr);
      view.state = currentState;
    });

    const command = commands.insertComment({ text: '<p>Body</p>' });
    const tr = currentState.tr;
    const result = command({ tr, state: currentState, dispatch });

    expect(result).toBe(true);
    const event = editor.emit.mock.calls[0][1];
    expect(event.comment.commentId).toBe('generated-id');
    expect(event.comment.isInternal).toBe(false);
    const mark = currentState.doc.nodeAt(1)?.marks.find((m) => m.type === schema.marks[CommentMarkName]);
    expect(mark?.attrs.commentId).toBe('generated-id');
    expect(mark?.attrs.internal).toBe(false);
  });

  it('removes comment marks via helper when removing a comment', () => {
    const schema = createCommentSchema();
    const mark = schema.marks[CommentMarkName].create({ commentId: 'c-3', internal: true });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [mark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const { commands, view } = createEditorEnvironment(schema, doc);

    let currentState = view.state;
    const dispatch = vi.fn((tr) => {
      currentState = currentState.apply(tr);
      view.state = currentState;
    });

    const spy = vi.spyOn(CommentHelpers, 'removeCommentsById');

    const command = commands.removeComment({ commentId: 'c-3' });
    const tr = currentState.tr;
    command({ tr, dispatch, state: currentState });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ commentId: 'c-3' }));
    expect(tr.getMeta(CommentsPluginKey)).toMatchObject({ event: 'deleted' });

    spy.mockRestore();
  });

  it('resolves comment via helper and marks update event', () => {
    const schema = createCommentSchema();
    const mark = schema.marks[CommentMarkName].create({ commentId: 'c-4', internal: true });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [mark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const { commands, view } = createEditorEnvironment(schema, doc);

    let currentState = view.state;
    const dispatch = vi.fn((tr) => {
      currentState = currentState.apply(tr);
      view.state = currentState;
    });

    const spy = vi.spyOn(CommentHelpers, 'removeCommentsById');

    const command = commands.resolveComment({ commentId: 'c-4' });
    const tr = currentState.tr;
    command({ tr, dispatch, state: currentState });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ commentId: 'c-4' }));
    expect(tr.getMeta(CommentsPluginKey)).toMatchObject({ event: 'update' });

    spy.mockRestore();
  });

  it('sets active comment metadata when command is invoked', () => {
    const schema = createCommentSchema();
    const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const { commands } = createEditorEnvironment(schema, doc);

    const tr = { setMeta: vi.fn() };
    const command = commands.setActiveComment({ commentId: 'focus-id' });
    const result = command({ tr });

    expect(result).toBe(true);
    expect(tr.setMeta).toHaveBeenCalledWith(CommentsPluginKey, {
      type: 'setActiveComment',
      activeThreadId: 'focus-id',
      forceUpdate: true,
    });
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

  it('returns false when attempting to set cursor by unknown id', () => {
    const schema = createCommentSchema();
    const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const { editor, commands } = createEditorEnvironment(schema, doc);

    const result = commands.setCursorById('missing')({ state: editor.state, editor });

    expect(result).toBe(false);
    expect(editor.view.focus).not.toHaveBeenCalled();
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

describe('normalizeCommentEventPayload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills missing fields from editor options and fallback values', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);

    const payload = normalizeCommentEventPayload({
      conversation: { text: '<p>Body</p>', skipEmit: true },
      editorOptions: {
        user: { name: 'Payload User', email: 'payload@example.com' },
        documentId: 'doc-42',
      },
      fallbackCommentId: 'fallback-id',
      fallbackInternal: false,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        commentId: 'fallback-id',
        isInternal: false,
        commentText: '<p>Body</p>',
        creatorName: 'Payload User',
        creatorEmail: 'payload@example.com',
        fileId: 'doc-42',
        documentId: 'doc-42',
        createdTime: 1234,
      }),
    );
    expect(payload).not.toHaveProperty('skipEmit');
    expect(payload).not.toHaveProperty('text');

    nowSpy.mockRestore();
  });

  it('respects provided fields over inferred defaults', () => {
    const payload = normalizeCommentEventPayload({
      conversation: {
        commentId: 'provided',
        creatorName: 'Provided User',
        creatorEmail: 'provided@example.com',
        commentText: '<p>Existing</p>',
        isInternal: true,
      },
      editorOptions: { user: { name: 'Fallback', email: 'fallback@example.com' }, documentId: 'doc-99' },
      fallbackCommentId: 'fallback',
      fallbackInternal: false,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        commentId: 'provided',
        creatorName: 'Provided User',
        creatorEmail: 'provided@example.com',
        commentText: '<p>Existing</p>',
        isInternal: true,
      }),
    );
  });
});

describe('updatePosition', () => {
  let originalDOMRect;

  beforeEach(() => {
    originalDOMRect = global.DOMRect;
    if (!originalDOMRect) {
      global.DOMRect = class {
        constructor(left, top, width = 0, height = 0) {
          this.left = left;
          this.top = top;
          this.right = left + width;
          this.bottom = top + height;
        }
      };
    }
  });

  afterEach(() => {
    if (!originalDOMRect) {
      delete global.DOMRect;
    } else {
      global.DOMRect = originalDOMRect;
    }
  });

  it('records a new thread entry using DOMRect bounds', () => {
    const allPositions = {};
    const rect = new DOMRect(20, 10, 30, 40);

    updatePosition({
      allCommentPositions: allPositions,
      threadId: 'thread-1',
      pos: 5,
      currentBounds: rect,
      node: { nodeSize: 4 },
    });

    expect(allPositions['thread-1']).toEqual(
      expect.objectContaining({
        threadId: 'thread-1',
        start: 5,
        end: 9,
        bounds: expect.objectContaining({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }),
      }),
    );
  });

  it('extends an existing thread entry while preserving outer bounds', () => {
    const allPositions = {
      'thread-1': {
        threadId: 'thread-1',
        start: 5,
        end: 9,
        bounds: { top: 20, bottom: 30, left: 10, right: 40 },
      },
    };

    updatePosition({
      allCommentPositions: allPositions,
      threadId: 'thread-1',
      pos: 3,
      currentBounds: { top: 15, bottom: 35, left: 8, right: 42 },
      node: { nodeSize: 10 },
    });

    expect(allPositions['thread-1']).toEqual({
      threadId: 'thread-1',
      start: 3,
      end: 13,
      bounds: expect.objectContaining({ top: 15, bottom: 35 }),
    });
  });
});

describe('internal helper functions', () => {
  it('getActiveCommentId returns the nearest comment mark id', () => {
    const schema = createCommentSchema();
    const commentMark = schema.marks[CommentMarkName].create({ commentId: 'comment-123', internal: true });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [commentMark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const selection = TextSelection.create(doc, 1);
    expect(getActiveCommentId(doc, selection)).toBe('comment-123');
  });

  it('getActiveCommentId returns tracked change id when present', () => {
    const schema = createCommentSchema();
    const trackMark = schema.marks[TrackInsertMarkName].create({ id: 'change-abc' });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [trackMark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const selection = TextSelection.create(doc, 1);
    expect(getActiveCommentId(doc, selection)).toBe('change-abc');
  });

  it('getActiveCommentId ignores non-collapsed selections', () => {
    const schema = createCommentSchema();
    const commentMark = schema.marks[CommentMarkName].create({ commentId: 'comment-456' });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [commentMark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const selection = TextSelection.create(doc, 1, 2);
    expect(getActiveCommentId(doc, selection)).toBeUndefined();
  });

  it('findTrackedMark locates the first tracked change mark in range', () => {
    const schema = createCommentSchema();
    const trackMark = schema.marks[TrackInsertMarkName].create({ id: 'tracked-1' });
    const paragraph = schema.node('paragraph', null, [schema.text('Hello', [trackMark])]);
    const doc = schema.node('doc', null, [paragraph]);
    const found = findTrackedMark({ doc, from: 1, to: 1 });
    expect(found?.mark?.attrs.id).toBe('tracked-1');
  });

  it('findTrackedMark returns undefined when no mark exists', () => {
    const schema = createCommentSchema();
    const paragraph = schema.node('paragraph', null, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const found = findTrackedMark({ doc, from: 1, to: 1 });
    expect(found).toBeUndefined();
  });

  it('handleTrackedChangeTransaction emits add and update events', () => {
    const schema = createCommentSchema();
    const insertMark = schema.marks[TrackInsertMarkName].create({
      id: 'change-tracked',
      author: 'Alice',
      authorEmail: 'alice@example.com',
      date: 'today',
    });
    const textNode = schema.text('Inserted', [insertMark]);
    const paragraph = schema.node('paragraph', null, [textNode]);
    const doc = schema.node('doc', null, [paragraph]);
    const state = EditorState.create({ schema, doc });
    const editor = { options: { documentId: 'doc-1' }, emit: vi.fn() };

    const meta = {
      insertedMark: insertMark,
      deletionMark: null,
      formatMark: null,
      deletionNodes: [],
      step: { slice: { content: { content: [textNode] } } },
    };

    const first = handleTrackedChangeTransaction(meta, {}, state, editor);
    expect(first['change-tracked']).toMatchObject({ insertion: 'change-tracked' });
    expect(editor.emit).toHaveBeenCalledWith(
      'commentsUpdate',
      expect.objectContaining({ event: comments_module_events.ADD, changeId: 'change-tracked' }),
    );

    editor.emit.mockClear();
    const second = handleTrackedChangeTransaction(meta, first, state, editor);
    expect(second['change-tracked']).toBeDefined();
    expect(editor.emit).toHaveBeenCalledWith(
      'commentsUpdate',
      expect.objectContaining({ event: comments_module_events.UPDATE, changeId: 'change-tracked' }),
    );
  });

  it('handleTrackedChangeTransaction returns original state when no marks provided', () => {
    const schema = createCommentSchema();
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Text')])]);
    const state = EditorState.create({ schema, doc });
    const editor = { options: { documentId: 'doc-1' }, emit: vi.fn() };

    const result = handleTrackedChangeTransaction({ deletionNodes: [] }, { existing: 'value' }, state, editor);
    expect(result).toBeUndefined();
    expect(editor.emit).not.toHaveBeenCalled();
  });

  it('getTrackedChangeText extracts insertion, deletion, and format strings', () => {
    const schema = createCommentSchema();
    const insertMark = schema.marks[TrackInsertMarkName].create({ id: 'insert-1' });
    const deleteMark = schema.marks[TrackDeleteMarkName].create({ id: 'delete-1' });
    const formatMark = schema.marks[TrackFormatMarkName].create({
      id: 'format-1',
      before: [{ type: 'bold' }],
      after: [{ type: 'italic' }],
    });

    const insertionNodes = [schema.text('Added', [insertMark])];
    const deletionNodes = [schema.text('Removed', [deleteMark])];

    const insertionResult = getTrackedChangeText({
      nodes: insertionNodes,
      mark: insertMark,
      trackedChangeType: TrackInsertMarkName,
      isDeletionInsertion: false,
    });
    expect(insertionResult.trackedChangeText).toBe('Added');
    expect(insertionResult.deletionText).toBe('');

    const deletionResult = getTrackedChangeText({
      nodes: deletionNodes,
      mark: deleteMark,
      trackedChangeType: TrackDeleteMarkName,
      isDeletionInsertion: false,
    });
    expect(deletionResult.deletionText).toBe('Removed');

    const formatResult = getTrackedChangeText({
      nodes: [schema.text('Format', [formatMark])],
      mark: formatMark,
      trackedChangeType: TrackFormatMarkName,
      isDeletionInsertion: false,
    });
    expect(formatResult.trackedChangeText).toContain('Added formatting');

    const combinedResult = getTrackedChangeText({
      nodes: [...insertionNodes, ...deletionNodes],
      mark: insertMark,
      trackedChangeType: TrackInsertMarkName,
      isDeletionInsertion: true,
    });
    expect(combinedResult.deletionText).toBe('Removed');
  });

  it('createOrUpdateTrackedChangeComment builds add and update payloads', () => {
    const schema = createCommentSchema();
    const insertMark = schema.marks[TrackInsertMarkName].create({
      id: 'create-1',
      author: 'Author',
      authorEmail: 'author@example.com',
      date: 'today',
    });
    const nodes = [schema.text('Body', [insertMark])];
    const state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [schema.node('paragraph', null, nodes)]),
    });

    const baseArgs = {
      marks: { insertedMark: insertMark, deletionMark: null, formatMark: null },
      deletionNodes: [],
      nodes,
      newEditorState: state,
      documentId: 'doc-1',
    };

    const addPayload = createOrUpdateTrackedChangeComment({ event: 'add', ...baseArgs });
    expect(addPayload).toMatchObject({
      event: comments_module_events.ADD,
      changeId: 'create-1',
      trackedChangeText: 'Body',
    });

    const updatePayload = createOrUpdateTrackedChangeComment({ event: 'update', ...baseArgs });
    expect(updatePayload.event).toBe(comments_module_events.UPDATE);

    const emptyState = EditorState.create({
      schema,
      doc: schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Plain')])]),
    });

    const emptyPayload = createOrUpdateTrackedChangeComment({
      event: 'add',
      marks: { insertedMark: insertMark, deletionMark: null, formatMark: null },
      deletionNodes: [],
      nodes: [schema.text('No mark')],
      newEditorState: emptyState,
      documentId: 'doc-1',
    });
    expect(emptyPayload).toBeUndefined();
  });

  it('findRangeById returns ranges for comment and tracked marks', () => {
    const schema = createCommentSchema();
    const commentMark = schema.marks[CommentMarkName].create({ commentId: 'comment-range' });
    const trackedMark = schema.marks[TrackInsertMarkName].create({ id: 'tracked-range' });
    const paragraph = schema.node('paragraph', null, [
      schema.text('Comment', [commentMark]),
      schema.text('Tracked', [trackedMark]),
    ]);
    const doc = schema.node('doc', null, [paragraph]);

    const commentRange = findRangeById(doc, 'comment-range');
    expect(commentRange).toEqual(expect.objectContaining({ from: expect.any(Number), to: expect.any(Number) }));

    const trackedRange = findRangeById(doc, 'tracked-range');
    expect(trackedRange).toEqual(expect.objectContaining({ from: expect.any(Number), to: expect.any(Number) }));

    expect(findRangeById(doc, 'missing-id')).toBeNull();
  });
});
