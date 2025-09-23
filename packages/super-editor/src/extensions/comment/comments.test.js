import { describe, it, expect, vi, afterEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

import { CommentRangeStart, CommentRangeEnd, CommentReference } from './comment.js';
import { CommentsMark } from './comments-marks.js';
import { CommentMarkName } from './comments-constants.js';
import * as CommentHelpers from './comments-helpers.js';
import { CommentsPlugin, CommentsPluginKey } from './comments-plugin.js';

const {
  removeCommentsById,
  getCommentPositionsById,
  prepareCommentsForExport,
  getPreparedComment,
  prepareCommentsForImport,
  translateFormatChangesToEnglish,
  getHighlightColor,
} = CommentHelpers;

afterEach(() => {
  vi.restoreAllMocks();
});

const createCommentSchema = () => {
  const nodes = {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    commentRangeStart: {
      inline: true,
      group: 'inline',
      atom: true,
      attrs: { 'w:id': {}, internal: { default: true } },
      toDOM: (node) => ['commentRangeStart', node.attrs],
      parseDOM: [{ tag: 'commentRangeStart' }],
    },
    commentRangeEnd: {
      inline: true,
      group: 'inline',
      atom: true,
      attrs: { 'w:id': {}, internal: { default: true } },
      toDOM: (node) => ['commentRangeEnd', node.attrs],
      parseDOM: [{ tag: 'commentRangeEnd' }],
    },
    commentReference: {
      inline: true,
      group: 'inline',
      atom: true,
      attrs: { attributes: { default: null } },
      toDOM: (node) => ['commentReference', node.attrs],
      parseDOM: [{ tag: 'commentReference' }],
    },
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

const createStateWithComment = (schema, commentId = 'c-1') => {
  const mark = schema.marks[CommentMarkName].create({ commentId, internal: true });
  const paragraph = schema.nodes.paragraph.create(null, schema.text('Hello', [mark]));
  const doc = schema.nodes.doc.create(null, [paragraph]);
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, 1, 6),
  });
};

describe('comment nodes and mark', () => {
  it('merges attributes when rendering comment nodes', () => {
    const result = CommentRangeStart.config.renderDOM.call(CommentRangeStart, {
      htmlAttributes: { 'data-test': 'value' },
    });
    expect(result[0]).toBe('commentRangeStart');
    expect(result[1]).toMatchObject({ 'aria-label': 'Comment range start node', 'data-test': 'value' });

    const endResult = CommentRangeEnd.config.renderDOM.call(CommentRangeEnd, {
      htmlAttributes: { 'data-id': 'end' },
    });
    expect(endResult[0]).toBe('commentRangeEnd');
    expect(endResult[1]).toMatchObject({ 'aria-label': 'Comment range end node', 'data-id': 'end' });

    const referenceDom = CommentReference.config.renderDOM.call(CommentReference, {
      htmlAttributes: { 'data-ref': '1' },
    });
    expect(referenceDom[0]).toBe('commentReference');
    expect(referenceDom[1]).toMatchObject({ 'aria-label': 'Comment reference node', 'data-ref': '1' });

    const markDom = CommentsMark.config.renderDOM.call(CommentsMark, {
      htmlAttributes: { 'data-id': 'comment-1' },
    });
    expect(markDom[0]).toBe(CommentMarkName);
    expect(markDom[1]).toMatchObject({ class: 'sd-editor-comment', 'data-id': 'comment-1' });
  });
});

describe('comment helpers', () => {
  it('gets comment positions by id', () => {
    const schema = createCommentSchema();
    const state = createStateWithComment(schema, 'comment-123');

    const positions = getCommentPositionsById('comment-123', state.doc);

    expect(positions).toEqual([{ from: 1, to: 6 }]);
  });

  it('removes comments by id and dispatches transaction', () => {
    const schema = createCommentSchema();
    const state = createStateWithComment(schema, 'comment-123');
    const tr = state.tr;
    const dispatch = vi.fn();
    const removeSpy = vi.spyOn(tr, 'removeMark');

    removeCommentsById({ commentId: 'comment-123', state, tr, dispatch });

    expect(removeSpy).toHaveBeenCalledWith(1, 6, schema.marks[CommentMarkName]);
    expect(dispatch).toHaveBeenCalledWith(tr);
  });

  it('prepares comments for export including child comments', () => {
    const schema = createCommentSchema();
    const state = createStateWithComment(schema, 'root');
    const tr = state.tr;

    const childComments = [
      { commentId: 'child-1', parentCommentId: 'root', createdTime: 2 },
      { commentId: 'child-0', parentCommentId: 'root', createdTime: 1 },
    ];

    prepareCommentsForExport(state.doc, tr, schema, childComments);

    const applied = state.apply(tr);
    const insertedStarts = [];
    const insertedEnds = [];

    applied.doc.descendants((node) => {
      if (node.type.name === 'commentRangeStart') insertedStarts.push(node.attrs['w:id']);
      if (node.type.name === 'commentRangeEnd') insertedEnds.push(node.attrs['w:id']);
    });

    expect(insertedStarts).toEqual(['root', 'child-0', 'child-1']);
    expect(insertedEnds).toEqual(['root', 'child-0', 'child-1']);
  });

  it('prepares comments for import by converting nodes into marks', () => {
    const schema = createCommentSchema();
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.nodes.commentRangeStart.create({ 'w:id': 'import-1', internal: false }),
        schema.text('Hello'),
        schema.nodes.commentRangeEnd.create({ 'w:id': 'import-1', internal: false }),
      ]),
    ]);

    const state = EditorState.create({ schema, doc });
    const tr = state.tr;

    prepareCommentsForImport(state.doc, tr, schema, {
      comments: [{ importedId: 'import-1', commentId: 'comment-1' }],
    });

    const applied = state.apply(tr);

    const marks = [];
    applied.doc.descendants((node) => {
      node.marks.forEach((mark) => {
        if (mark.type === schema.marks[CommentMarkName]) {
          marks.push(mark.attrs.commentId);
        }
      });
    });

    expect(marks).toEqual(['comment-1']);
    const remainingCommentNodes = [];
    applied.doc.descendants((node) => {
      if (['commentRangeStart', 'commentRangeEnd'].includes(node.type.name)) {
        remainingCommentNodes.push(node.type.name);
      }
    });
    expect(remainingCommentNodes).toHaveLength(0);
  });

  it('returns prepared comment attrs', () => {
    expect(getPreparedComment({ commentId: '123', internal: true })).toEqual({ 'w:id': '123', internal: true });
  });

  it('translates formatting changes into readable text', () => {
    const message = translateFormatChangesToEnglish({
      before: [{ type: 'bold' }, { type: 'textStyle', attrs: { fontSize: '12px', color: '#111' } }],
      after: [{ type: 'italic' }, { type: 'textStyle', attrs: { fontSize: '14px', color: '#222' } }],
    });

    expect(message).toContain('Removed formatting: bold');
    expect(message).toContain('Added formatting: italic');
    expect(message).toContain('Modified text style');
    expect(message).toContain('Changed font size from 12px to 14px');
    expect(message).toContain('Changed color');
  });

  it('returns default message when no formatting changes', () => {
    expect(translateFormatChangesToEnglish()).toBe('No formatting changes.');
  });

  it('computes highlight color from plugin state', () => {
    const editor = {
      options: { isInternal: false },
      state: {},
    };
    vi.spyOn(CommentsPluginKey, 'getState').mockReturnValue({
      internalColor: '#123456',
      externalColor: '#abcdef',
    });

    const color = getHighlightColor({ activeThreadId: 'thread-1', threadId: 'thread-1', isInternal: false, editor });
    expect(color).toBe('#abcdef44');

    const external = getHighlightColor({ activeThreadId: 'thread-2', threadId: 'thread-1', isInternal: false, editor });
    expect(external).toBe('#abcdef22');

    const hidden = getHighlightColor({ activeThreadId: null, threadId: 'thread-3', isInternal: true, editor });
    expect(hidden).toBe('transparent');
  });
});

describe('comments plugin commands', () => {
  const setup = () => {
    const schema = createCommentSchema();
    const state = createStateWithComment(schema, 'comment-1');
    const view = { state, dispatch: vi.fn(), focus: vi.fn() };
    const editor = {
      schema,
      view,
      options: { isHeadless: false, isInternal: false },
      storage: { image: { media: {} } },
      emit: vi.fn(),
    };

    const context = { editor, options: {} };
    const commands = CommentsPlugin.config.addCommands.call(context);

    return { schema, state, editor, commands };
  };

  it('inserts a comment mark across selection', () => {
    const { schema, state, commands } = setup();
    const tr = state.tr;
    const dispatch = vi.fn();

    const result = commands.insertComment({ commentId: 'c-10', isInternal: true })({ tr, dispatch });

    expect(result).toBe(true);
    expect(tr.getMeta(CommentsPluginKey)).toEqual({ event: 'add' });
    expect(dispatch).toHaveBeenCalledWith(tr);

    const applied = state.apply(tr);
    const mark = applied.doc.nodeAt(1).marks[0];
    expect(mark.attrs.commentId).toBe('c-10');
  });

  it('removes comments via helper function', () => {
    const { commands, state } = setup();
    const tr = state.tr;
    const dispatch = vi.fn();

    commands.removeComment({ commentId: 'comment-1' })({ tr, dispatch, state });

    expect(tr.getMeta(CommentsPluginKey)).toEqual({ event: 'deleted' });
    expect(dispatch).toHaveBeenCalledWith(tr);

    const applied = state.apply(tr);
    const marks = applied.doc.nodeAt(1).marks;
    expect(marks).toHaveLength(0);
  });

  it('sets active comment meta', () => {
    const { commands } = setup();
    const tr = { setMeta: vi.fn() };
    const result = commands.setActiveComment({ commentId: 'focus' })({ tr });
    expect(result).toBe(true);
    expect(tr.setMeta).toHaveBeenCalledWith(CommentsPluginKey, {
      type: 'setActiveComment',
      activeThreadId: 'focus',
      forceUpdate: true,
    });
  });

  it('updates comment internal flag across the range', () => {
    const { state, commands, schema } = setup();
    const tr = state.tr;
    const dispatch = vi.fn();

    const result = commands.setCommentInternal({ commentId: 'comment-1', isInternal: false })({ tr, dispatch, state });

    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(tr);
    const applied = state.apply(tr);
    const mark = applied.doc.nodeAt(1).marks.find((m) => m.type === schema.marks[CommentMarkName]);
    expect(mark.attrs.internal).toBe(false);
  });

  it('sets cursor by comment id when range exists', () => {
    const { commands, state, editor } = setup();
    const result = commands.setCursorById('comment-1')({ state, editor });

    expect(result).toBe(true);
    expect(editor.view.focus).toHaveBeenCalled();
    expect(state.tr.selection.from).toBe(1);
  });

  it('returns false when cursor range cannot be found', () => {
    const { commands, state, editor } = setup();
    const emptyDoc = EditorState.create({ schema: state.schema }).doc;
    const nextState = EditorState.create({ schema: state.schema, doc: emptyDoc });
    const result = commands.setCursorById('missing')({ state: nextState, editor });
    expect(result).toBe(false);
  });
});

describe('comments plugin pm plugin', () => {
  it('skips plugin creation when editor is headless', () => {
    const result = CommentsPlugin.config.addPmPlugins.call({ editor: { options: { isHeadless: true } } });
    expect(result).toEqual([]);
  });

  it('initialises state with default values', () => {
    const schema = createCommentSchema();
    const state = createStateWithComment(schema, 'comment-1');
    const context = {
      editor: {
        options: { isHeadless: false, isInternal: false },
        view: { state, dispatch: vi.fn() },
        emit: vi.fn(),
        storage: { image: { media: {} } },
      },
      options: {},
    };

    const [plugin] = CommentsPlugin.config.addPmPlugins.call(context);

    expect(plugin.key).toBe(CommentsPluginKey.key);

    const pluginState = plugin.spec.state.init();
    expect(pluginState.activeThreadId).toBeNull();
    expect(pluginState.decorations).toBeInstanceOf(DecorationSet);

    const meta = { type: 'setActiveComment', activeThreadId: 'comment-5' };
    const tr = {
      getMeta: (key) => (key === CommentsPluginKey ? meta : null),
      docChanged: false,
      selectionSet: false,
    };
    const nextState = plugin.spec.state.apply(tr, pluginState, state, state);
    expect(nextState.activeThreadId).toBe('comment-5');
    expect(nextState.changedActiveThread).toBe(true);
    const stateWithPlugin = EditorState.create({ schema, doc: state.doc, plugins: [plugin] });
    expect(plugin.props.decorations(stateWithPlugin)).toBeInstanceOf(DecorationSet);
  });
});
