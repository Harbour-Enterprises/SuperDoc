import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { AddMarkStep, RemoveMarkStep } from 'prosemirror-transform';
import { TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName } from '../constants.js';
import {
  markInsertion,
  markDeletion,
  addMarkStep,
  removeMarkStep,
  trackedTransaction,
  parseFormatList,
  getTrackChanges,
  findTrackedMarkBetween,
  markWrapping,
  replaceAroundStep,
  documentHelpers,
} from './index.js';
import { TrackChangesBasePluginKey } from '../plugins/trackChangesBasePlugin.js';
import { CommentsPluginKey } from '../../comment/comments-plugin.js';
import { initTestEditor } from '@tests/helpers/helpers.js';

describe('trackChangesHelpers', () => {
  let editor;
  let schema;
  let basePlugins;

  const user = { name: 'Track Tester', email: 'track@example.com' };
  const date = '2024-01-01T00:00:00.000Z';

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
    basePlugins = editor.state.plugins;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    editor?.destroy();
    editor = null;
  });

  const createDocWithText = (text, marks = []) => {
    const paragraph = schema.nodes.paragraph.create({}, schema.text(text, marks));
    return schema.nodes.doc.create({}, paragraph);
  };

  const createState = (doc) =>
    EditorState.create({
      schema,
      doc,
      plugins: basePlugins,
    });

  it('findMarkPosition returns full mark span', () => {
    const mark = schema.marks[TrackInsertMarkName].create({
      id: 'ins-1',
      author: user.name,
      authorEmail: user.email,
      date,
    });
    const doc = createDocWithText('abc', [mark]);

    const result = documentHelpers.findMarkPosition(doc, 1, TrackInsertMarkName);
    expect(result).toEqual(
      expect.objectContaining({
        from: 1,
        to: 4,
        attrs: expect.objectContaining({ id: 'ins-1' }),
      }),
    );
  });

  it('document helper utilities validate input and traversal', () => {
    const doc = createDocWithText('abc');
    expect(() => documentHelpers.flatten(null)).toThrow('Invalid "node" parameter');
    expect(() => documentHelpers.findChildren(doc, null)).toThrow('Invalid "predicate" parameter');

    const flattened = documentHelpers.flatten(doc, false);
    expect(flattened.length).toBeGreaterThan(0);

    const inlineNodes = documentHelpers.findInlineNodes(doc, true);
    expect(inlineNodes.every(({ node }) => node.isInline)).toBe(true);
  });

  it('parseFormatList gracefully handles malformed input', () => {
    expect(parseFormatList('')).toEqual([]);
    expect(parseFormatList('{ not json')).toEqual([]);
    expect(parseFormatList('"string"')).toEqual([]);

    const payload = [
      { type: 'bold', attrs: {} },
      { type: 'italic', attrs: {} },
    ];
    expect(parseFormatList(JSON.stringify(payload))).toEqual(payload);
  });

  it('findTrackedMarkBetween locates marks using attributes', () => {
    const mark = schema.marks[TrackInsertMarkName].create({
      id: 'match-me',
      author: user.name,
      authorEmail: user.email,
      date,
    });
    const doc = createDocWithText('abc', [mark]);
    const state = createState(doc);
    const tr = state.tr;

    const found = findTrackedMarkBetween({
      tr,
      from: 1,
      to: 3,
      markName: TrackInsertMarkName,
      attrs: { authorEmail: user.email },
    });

    expect(found).toEqual(
      expect.objectContaining({
        from: 1,
        to: 4,
        mark: expect.objectContaining({ attrs: expect.objectContaining({ id: 'match-me' }) }),
      }),
    );
  });

  it('markInsertion reuses or creates tracked marks', () => {
    const state = createState(createDocWithText('Hello'));
    const tr = state.tr.insertText('X', 1);

    const mark = markInsertion({ tr, from: 1, to: 2, user, date });
    expect(mark.attrs).toEqual(
      expect.objectContaining({
        author: user.name,
        authorEmail: user.email,
        date,
      }),
    );

    const nextState = state.apply(tr);
    const inlineNodes = documentHelpers.findInlineNodes(nextState.doc);
    const tracked = inlineNodes.find(({ node }) => node.marks.some((m) => m.type.name === TrackInsertMarkName));
    expect(tracked).toBeTruthy();
  });

  it('markDeletion applies trackDelete marks and collects nodes', () => {
    const state = createState(createDocWithText('World'));
    const tr = state.tr;

    const result = markDeletion({ tr, from: 1, to: 6, user, date });
    expect(result.deletionMark.attrs.authorEmail).toBe(user.email);
    expect(result.nodes.length).toBeGreaterThan(0);

    const applied = state.apply(tr);
    const inlineNodes = documentHelpers.findInlineNodes(applied.doc);
    const hasDelete = inlineNodes.some(({ node }) => node.marks.some((m) => m.type.name === TrackDeleteMarkName));
    expect(hasDelete).toBe(true);
  });

  it('addMarkStep adds format mark metadata for styling changes', () => {
    const state = createState(createDocWithText('Format me'));
    const boldMark = schema.marks.bold.create();
    const step = new AddMarkStep(1, 9, boldMark);
    const newTr = state.tr;

    addMarkStep({
      state,
      step,
      newTr,
      doc: state.doc,
      user,
      date,
    });

    expect(newTr.steps.length).toBeGreaterThan(0);
    const meta = newTr.getMeta(TrackChangesBasePluginKey);
    expect(meta).toBeTruthy();
    expect(meta.step).toBe(step);
    expect(meta.formatMark?.type.name).toBe(TrackFormatMarkName);
    expect(newTr.getMeta(CommentsPluginKey)).toEqual({ type: 'force' });
  });

  it('removeMarkStep records previous formatting when mark removed', () => {
    const bold = schema.marks.bold.create();
    const doc = createDocWithText('Styled', [bold]);
    const state = createState(doc);
    const step = new RemoveMarkStep(1, 7, bold);
    const newTr = state.tr;

    removeMarkStep({
      state,
      step,
      newTr,
      doc: state.doc,
      user,
      date,
    });

    expect(newTr.steps.length).toBeGreaterThan(0);
    const meta = newTr.getMeta(TrackChangesBasePluginKey);
    expect(meta?.formatMark?.type.name).toBe(TrackFormatMarkName);
  });

  it('getTrackChanges enumerates marks with optional filtering', () => {
    const insertMark = schema.marks[TrackInsertMarkName].create({
      id: 'track-1',
      author: user.name,
      authorEmail: user.email,
      date,
    });
    const doc = createDocWithText('abc', [insertMark]);
    const state = createState(doc);

    const allChanges = getTrackChanges(state);
    expect(allChanges.length).toBeGreaterThan(0);

    const filtered = getTrackChanges(state, 'track-1');
    expect(filtered.length).toBe(allChanges.length);
  });

  it('trackedTransaction annotates insertions and deletions', () => {
    const initialState = createState(createDocWithText('abc'));

    // insertion
    let tr = initialState.tr.insertText('Z', 1);
    tr.setMeta('inputType', 'insertText');
    const trackedInsert = trackedTransaction({ tr, state: initialState, user });
    const insertState = initialState.apply(trackedInsert);
    const insertMeta = trackedInsert.getMeta(TrackChangesBasePluginKey);
    expect(insertMeta?.insertedMark?.type.name).toBe(TrackInsertMarkName);
    const hasInsertMark = documentHelpers
      .findInlineNodes(insertState.doc)
      .some(({ node }) => node.marks.some((mark) => mark.type.name === TrackInsertMarkName));
    expect(hasInsertMark).toBe(true);

    // deletion
    const deleteState = createState(createDocWithText('abc'));
    let deleteTr = deleteState.tr.delete(1, 2);
    deleteTr.setMeta('inputType', 'deleteContentBackward');
    const trackedDelete = trackedTransaction({ tr: deleteTr, state: deleteState, user });
    const finalState = deleteState.apply(trackedDelete);
    const deleteMeta = trackedDelete.getMeta(TrackChangesBasePluginKey);
    expect(deleteMeta?.deletionMark?.type.name).toBe(TrackDeleteMarkName);
    const hasDeleteMark = documentHelpers
      .findInlineNodes(finalState.doc)
      .some(({ node }) => node.marks.some((mark) => mark.type.name === TrackDeleteMarkName));
    expect(hasDeleteMark).toBe(true);
  });

  it('trackedTransaction returns original transaction when metadata disallows tracking', () => {
    const state = createState(createDocWithText('abc'));
    const tr = state.tr.insertText('!', 1);
    tr.setMeta('custom', true);
    const result = trackedTransaction({ tr, state, user });
    expect(result).toBe(tr);
  });

  it('no-op helpers exist for future implementations', () => {
    expect(markWrapping()).toBeUndefined();
    expect(replaceAroundStep()).toBeUndefined();
  });

  it('trackedTransaction keeps selection in sync', () => {
    const state = createState(createDocWithText('abc'));
    const tr = state.tr.setSelection(TextSelection.create(state.doc, 2));
    tr.insertText('Q');
    tr.setMeta('inputType', 'insertText');

    const tracked = trackedTransaction({ tr, state, user });
    const updatedState = state.apply(tracked);
    expect(updatedState.selection.from).toBeGreaterThan(1);
  });
});
