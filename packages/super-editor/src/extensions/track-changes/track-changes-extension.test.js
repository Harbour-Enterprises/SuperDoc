import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { TrackChanges } from './track-changes.js';
import { TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName } from './constants.js';
import { TrackChangesBasePlugin, TrackChangesBasePluginKey } from './plugins/trackChangesBasePlugin.js';
import { initTestEditor } from '@tests/helpers/helpers.js';

const commands = TrackChanges.config.addCommands();

describe('TrackChanges extension commands', () => {
  let editor;
  let schema;

  const createDoc = (text, marks = []) => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text(text, marks));
    return schema.nodes.doc.create(null, paragraph);
  };

  const createState = (doc) =>
    EditorState.create({
      schema,
      doc,
      plugins: [TrackChangesBasePlugin()],
    });

  const markPresent = (doc, markName) => doc.nodeAt(1)?.marks.some((mark) => mark.type.name === markName);

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('acceptTrackedChangesBetween removes tracked insert marks and preserves content', () => {
    const insertMark = schema.marks[TrackInsertMarkName].create({ id: 'ins-1' });
    const doc = createDoc('Inserted', [insertMark]);
    const state = createState(doc);

    let nextState;
    const result = commands.acceptTrackedChangesBetween(
      1,
      doc.content.size,
    )({
      state,
      dispatch: (tr) => {
        nextState = state.apply(tr);
      },
    });

    expect(result).toBe(true);
    expect(nextState).toBeDefined();
    expect(nextState.doc.textContent).toBe('Inserted');
    expect(markPresent(nextState.doc, TrackInsertMarkName)).toBe(false);
  });

  it('acceptTrackedChangesBetween removes tracked delete content', () => {
    const deleteMark = schema.marks[TrackDeleteMarkName].create({ id: 'del-1' });
    const doc = createDoc('Old', [deleteMark]);
    const state = createState(doc);

    let nextState;
    commands.acceptTrackedChangesBetween(
      1,
      doc.content.size,
    )({
      state,
      dispatch: (tr) => {
        nextState = state.apply(tr);
      },
    });

    expect(nextState).toBeDefined();
    expect(nextState.doc.textContent).toBe('');
  });

  it('blocks accepting tracked changes when permissionResolver denies access', () => {
    const insertMark = schema.marks[TrackInsertMarkName].create({ id: 'ins-guard', authorEmail: 'author@example.com' });
    const doc = createDoc('Pending', [insertMark]);
    const state = createState(doc);

    editor.options.user = { email: 'reviewer@example.com' };
    editor.options.role = 'editor';
    editor.options.permissionResolver = vi.fn(() => false);

    const dispatch = vi.fn();
    const result = commands.acceptTrackedChangesBetween(1, doc.content.size)({ state, dispatch, editor });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.options.permissionResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'RESOLVE_OTHER',
        trackedChange: expect.objectContaining({ id: 'ins-guard' }),
      }),
    );
  });

  it('rejectTrackedChangesBetween deletes inserted content and keeps deletions', () => {
    const insertMark = schema.marks[TrackInsertMarkName].create({ id: 'ins-2' });
    const insertDoc = createDoc('New', [insertMark]);
    const insertState = createState(insertDoc);

    let rejectedState;
    commands.rejectTrackedChangesBetween(
      1,
      insertDoc.content.size,
    )({
      state: insertState,
      dispatch: (tr) => {
        rejectedState = insertState.apply(tr);
      },
    });

    expect(rejectedState).toBeDefined();
    expect(rejectedState.doc.textContent).toBe('');

    const deleteMark = schema.marks[TrackDeleteMarkName].create({ id: 'del-2' });
    const deleteDoc = createDoc('Legacy', [deleteMark]);
    const deleteState = createState(deleteDoc);

    let restoredState;
    commands.rejectTrackedChangesBetween(
      1,
      deleteDoc.content.size,
    )({
      state: deleteState,
      dispatch: (tr) => {
        restoredState = deleteState.apply(tr);
      },
    });

    expect(restoredState).toBeDefined();
    expect(restoredState.doc.textContent).toBe('Legacy');
    expect(markPresent(restoredState.doc, TrackDeleteMarkName)).toBe(false);
  });

  it('blocks rejecting tracked changes when permissionResolver denies access', () => {
    const deleteMark = schema.marks[TrackDeleteMarkName].create({ id: 'del-guard', authorEmail: 'author@example.com' });
    const doc = createDoc('Legacy', [deleteMark]);
    const state = createState(doc);

    editor.options.user = { email: 'author@example.com' };
    editor.options.role = 'editor';
    editor.options.permissionResolver = vi.fn(({ permission }) => permission !== 'REJECT_OWN');

    const dispatch = vi.fn();
    const result = commands.rejectTrackedChangesBetween(1, doc.content.size)({ state, dispatch, editor });

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.options.permissionResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'REJECT_OWN',
        trackedChange: expect.objectContaining({ id: 'del-guard' }),
      }),
    );
  });

  it('accept/reject operations handle format changes', () => {
    const formatMark = schema.marks[TrackFormatMarkName].create({
      id: 'fmt-1',
      before: [{ type: 'bold', attrs: {} }],
      after: [{ type: 'italic', attrs: {} }],
    });
    const italic = schema.marks.italic.create();
    const doc = createDoc('Styled', [italic, formatMark]);

    const acceptState = createState(doc);
    let afterAccept;
    commands.acceptTrackedChangesBetween(
      1,
      doc.content.size,
    )({
      state: acceptState,
      dispatch: (tr) => {
        afterAccept = acceptState.apply(tr);
      },
    });

    expect(afterAccept).toBeDefined();
    expect(markPresent(afterAccept.doc, TrackFormatMarkName)).toBe(false);
    expect(markPresent(afterAccept.doc, 'italic')).toBe(true);

    const rejectState = createState(doc);
    let afterReject;
    commands.rejectTrackedChangesBetween(
      1,
      doc.content.size,
    )({
      state: rejectState,
      dispatch: (tr) => {
        afterReject = rejectState.apply(tr);
      },
    });

    expect(afterReject).toBeDefined();
    expect(markPresent(afterReject.doc, TrackFormatMarkName)).toBe(false);
    expect(markPresent(afterReject.doc, 'bold')).toBe(true);
    expect(markPresent(afterReject.doc, 'italic')).toBe(false);
  });

  it('acceptTrackedChangeById and rejectTrackedChangeById should NOT link two insertions', () => {
    const prevMark = schema.marks[TrackInsertMarkName].create({ id: 'prev' });
    const targetMark = schema.marks[TrackInsertMarkName].create({ id: 'ins-id' });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('A', [prevMark]),
      schema.text('B', [targetMark]),
    ]);
    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById('ins-id')({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    // Call one time not multiple
    expect(acceptSpy).toHaveBeenCalledTimes(1);
    expect(acceptSpy).toHaveBeenCalledWith(2, 3);

    const rejectSpy = vi.fn().mockReturnValue(true);
    const rejectResult = commands.rejectTrackedChangeById('ins-id')({
      state,
      tr,
      commands: { rejectTrackedChangesBetween: rejectSpy },
    });
    expect(rejectResult).toBe(true);
    // Call one time not multiple
    expect(rejectSpy).toHaveBeenCalledTimes(1);
    expect(rejectSpy).toHaveBeenCalledWith(2, 3);
  });

  it('acceptTrackedChangeById links contiguous insertion segments sharing an id across formatting', () => {
    const italicMark = schema.marks.italic.create();
    const insertionId = 'ins-multi';
    const firstSegmentMark = schema.marks[TrackInsertMarkName].create({ id: insertionId });
    const secondSegmentMark = schema.marks[TrackInsertMarkName].create({ id: insertionId });
    const thirdSegmentMark = schema.marks[TrackInsertMarkName].create({ id: insertionId });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('A', [firstSegmentMark]),
      schema.text('B', [italicMark, secondSegmentMark]),
      schema.text('C', [thirdSegmentMark]),
    ]);
    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById(insertionId)({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    expect(acceptSpy).toHaveBeenCalledTimes(3);
    expect(acceptSpy).toHaveBeenNthCalledWith(1, 1, 2);
    expect(acceptSpy).toHaveBeenNthCalledWith(2, 2, 3);
    expect(acceptSpy).toHaveBeenNthCalledWith(3, 3, 4);

    const rejectSpy = vi.fn().mockReturnValue(true);
    const rejectResult = commands.rejectTrackedChangeById(insertionId)({
      state,
      tr,
      commands: { rejectTrackedChangesBetween: rejectSpy },
    });

    expect(rejectResult).toBe(true);
    expect(rejectSpy).toHaveBeenCalledTimes(3);
    expect(rejectSpy).toHaveBeenNthCalledWith(1, 1, 2);
    expect(rejectSpy).toHaveBeenNthCalledWith(2, 2, 3);
    expect(rejectSpy).toHaveBeenNthCalledWith(3, 3, 4);
  });

  it('acceptTrackedChangeById chains contiguous same-id insertions before linking complementary deletions', () => {
    const italicMark = schema.marks.italic.create();
    const deletionMark = schema.marks[TrackDeleteMarkName].create({ id: 'del-id' });
    const insertionId = 'shared-id';
    const firstSegmentMark = schema.marks[TrackInsertMarkName].create({ id: insertionId });
    const secondSegmentMark = schema.marks[TrackInsertMarkName].create({ id: insertionId });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('old', [deletionMark]),
      schema.text('A', [firstSegmentMark]),
      schema.text('B', [italicMark, secondSegmentMark]),
    ]);
    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById(insertionId)({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    expect(acceptSpy).toHaveBeenCalledTimes(3);
    expect(acceptSpy).toHaveBeenNthCalledWith(1, 4, 5);
    expect(acceptSpy).toHaveBeenNthCalledWith(2, 5, 6);
    expect(acceptSpy).toHaveBeenNthCalledWith(3, 1, 4);

    const rejectSpy = vi.fn().mockReturnValue(true);
    const rejectResult = commands.rejectTrackedChangeById(insertionId)({
      state,
      tr,
      commands: { rejectTrackedChangesBetween: rejectSpy },
    });

    expect(rejectResult).toBe(true);
    expect(rejectSpy).toHaveBeenCalledTimes(3);
    expect(rejectSpy).toHaveBeenNthCalledWith(1, 4, 5);
    expect(rejectSpy).toHaveBeenNthCalledWith(2, 5, 6);
    expect(rejectSpy).toHaveBeenNthCalledWith(3, 1, 4);
  });

  it('acceptTrackedChangeById and rejectTrackedChangeById SHOULD link deletion-insertion pairs', () => {
    const deletionMark = schema.marks[TrackDeleteMarkName].create({ id: 'del-id' });
    const insertionMark = schema.marks[TrackInsertMarkName].create({ id: 'ins-id' });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('old', [deletionMark]),
      schema.text('new', [insertionMark]),
    ]);
    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById('ins-id')({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    // Should resolve both the insertion and the linked deletion
    expect(acceptSpy).toHaveBeenCalledTimes(2);
    expect(acceptSpy).toHaveBeenNthCalledWith(1, 4, 7);
    expect(acceptSpy).toHaveBeenNthCalledWith(2, 1, 4);

    const rejectSpy = vi.fn().mockReturnValue(true);
    const rejectResult = commands.rejectTrackedChangeById('ins-id')({
      state,
      tr,
      commands: { rejectTrackedChangesBetween: rejectSpy },
    });
    expect(rejectResult).toBe(true);
    // Should resolve both the insertion and the linked deletion
    expect(rejectSpy).toHaveBeenCalledTimes(2);
    expect(rejectSpy).toHaveBeenNthCalledWith(1, 4, 7); // insertion "new"
    expect(rejectSpy).toHaveBeenNthCalledWith(2, 1, 4); // deletion "old"
  });

  it('should NOT link changes separated by untracked content', () => {
    const deletionMark = schema.marks[TrackDeleteMarkName].create({ id: 'del-id' });
    const insertionMark = schema.marks[TrackInsertMarkName].create({ id: 'ins-id' });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('deleted', [deletionMark]),
      schema.text(' '), // Untracked space between
      schema.text('inserted', [insertionMark]),
    ]);
    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById('ins-id')({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    // Should only resolve the insertion, not the deletion
    expect(acceptSpy).toHaveBeenCalledTimes(1);
    expect(acceptSpy).toHaveBeenCalledWith(9, 17);
  });

  it('acceptTrackedChangesById should link changes sharing the same id even if they are not directly connected', () => {
    const id = 'shared-id';
    const deletionMark = schema.marks[TrackDeleteMarkName].create({ id });
    const insertionMark = schema.marks[TrackInsertMarkName].create({ id });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('deleted', [deletionMark]),
      schema.text(' '), // Untracked space between
      schema.text('inserted', [insertionMark]),
    ]);

    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById(id)({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    expect(acceptSpy).toHaveBeenCalledTimes(2);
    expect(acceptSpy).toHaveBeenNthCalledWith(1, 1, 8);
    expect(acceptSpy).toHaveBeenNthCalledWith(2, 9, 17);
  });

  it('should NOT link two deletions', () => {
    const deletionMark1 = schema.marks[TrackDeleteMarkName].create({ id: 'del-1' });
    const deletionMark2 = schema.marks[TrackDeleteMarkName].create({ id: 'del-2' });
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('first', [deletionMark1]),
      schema.text('second', [deletionMark2]),
    ]);
    const doc = schema.nodes.doc.create(null, paragraph);
    const state = createState(doc);

    const acceptSpy = vi.fn().mockReturnValue(true);
    const tr = state.tr;
    const result = commands.acceptTrackedChangeById('del-2')({
      state,
      tr,
      commands: { acceptTrackedChangesBetween: acceptSpy },
    });

    expect(result).toBe(true);
    // Should only resolve the target deletion, not the previous deletion
    expect(acceptSpy).toHaveBeenCalledTimes(1);
    expect(acceptSpy).toHaveBeenCalledWith(6, 12);
  });

  it('toggle and enable commands set plugin metadata', () => {
    const doc = createDoc('Toggle test');
    const state = createState(doc);
    const pluginState = TrackChangesBasePluginKey.getState(state);
    expect(pluginState.isTrackChangesActive).toBe(false);

    const tr = state.tr;
    const commandState = Object.create(state, {
      tr: { value: tr },
    });

    const toggled = commands.toggleTrackChanges()({ state: commandState });
    expect(toggled).toBe(true);
    expect(tr.getMeta(TrackChangesBasePluginKey)).toEqual({
      type: 'TRACK_CHANGES_ENABLE',
      value: true,
    });

    const enableTr = state.tr;
    const enableState = Object.create(state, {
      tr: { value: enableTr },
    });
    commands.enableTrackChanges()({ state: enableState });
    expect(enableTr.getMeta(TrackChangesBasePluginKey)).toEqual({
      type: 'TRACK_CHANGES_ENABLE',
      value: true,
    });

    const disableTr = state.tr;
    const disableState = Object.create(state, {
      tr: { value: disableTr },
    });
    commands.disableTrackChanges()({ state: disableState });
    expect(disableTr.getMeta(TrackChangesBasePluginKey)).toEqual({
      type: 'TRACK_CHANGES_ENABLE',
      value: false,
    });

    const showOriginalTr = state.tr;
    const showOriginalState = Object.create(state, {
      tr: { value: showOriginalTr },
    });
    const toggleOriginal = commands.toggleTrackChangesShowOriginal()({ state: showOriginalState });
    expect(toggleOriginal).toBe(true);
    expect(showOriginalTr.getMeta(TrackChangesBasePluginKey)).toEqual({
      type: 'SHOW_ONLY_ORIGINAL',
      value: !pluginState.onlyOriginalShown,
    });

    const enableFinalTr = state.tr;
    const enableFinalState = Object.create(state, {
      tr: { value: enableFinalTr },
    });
    const enabledFinal = commands.enableTrackChangesShowFinal()({ state: enableFinalState });
    expect(enabledFinal).toBe(true);
    expect(enableFinalTr.getMeta(TrackChangesBasePluginKey)).toEqual({
      type: 'SHOW_ONLY_MODIFIED',
      value: true,
    });

    const disableOriginalTr = state.tr;
    const disableOriginalState = Object.create(state, {
      tr: { value: disableOriginalTr },
    });
    const disabledOriginal = commands.disableTrackChangesShowOriginal()({ state: disableOriginalState });
    expect(disabledOriginal).toBe(true);
    expect(disableOriginalTr.getMeta(TrackChangesBasePluginKey)).toEqual({
      type: 'SHOW_ONLY_ORIGINAL',
      value: false,
    });
  });

  it('wrapper commands delegate to range-based handlers', () => {
    const rangeCommand = vi.fn().mockReturnValue(true);
    const trackedChange = { start: 5, end: 9 };

    expect(
      commands.acceptTrackedChange({ trackedChange })({
        commands: { acceptTrackedChangesBetween: rangeCommand },
      }),
    ).toBe(true);
    expect(rangeCommand).toHaveBeenCalledWith(5, 9);

    rangeCommand.mockClear();
    expect(
      commands.rejectTrackedChange({ trackedChange })({
        commands: { rejectTrackedChangesBetween: rangeCommand },
      }),
    ).toBe(true);
    expect(rangeCommand).toHaveBeenCalledWith(5, 9);

    const selectionRange = { from: 1, to: 4 };
    const acceptSelection = vi.fn().mockReturnValue(true);
    const rejectSelection = vi.fn().mockReturnValue(true);

    expect(
      commands.acceptTrackedChangeBySelection()({
        state: { selection: selectionRange },
        commands: { acceptTrackedChangesBetween: acceptSelection },
      }),
    ).toBe(true);
    expect(acceptSelection).toHaveBeenCalledWith(1, 4);

    expect(
      commands.rejectTrackedChangeOnSelection()({
        state: { selection: selectionRange },
        commands: { rejectTrackedChangesBetween: rejectSelection },
      }),
    ).toBe(true);
    expect(rejectSelection).toHaveBeenCalledWith(1, 4);

    const doc = createDoc('All the things');
    const state = createState(doc);
    const acceptAll = vi.fn().mockReturnValue(true);
    const rejectAll = vi.fn().mockReturnValue(true);

    expect(
      commands.acceptAllTrackedChanges()({
        state,
        commands: { acceptTrackedChangesBetween: acceptAll },
      }),
    ).toBe(true);
    expect(acceptAll).toHaveBeenCalledWith(0, doc.content.size);

    expect(
      commands.rejectAllTrackedChanges()({
        state,
        commands: { rejectTrackedChangesBetween: rejectAll },
      }),
    ).toBe(true);
    expect(rejectAll).toHaveBeenCalledWith(0, doc.content.size);
  });
});
