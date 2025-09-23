import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { TrackInsertMarkName } from '../constants.js';
import { TrackChangesBasePlugin, TrackChangesBasePluginKey } from './trackChangesBasePlugin.js';
import { initTestEditor } from '@tests/helpers/helpers.js';

const highlightedClass = 'track-insert-dec highlighted';

describe('TrackChangesBasePlugin', () => {
  let editor;
  let schema;

  const createDocWithMark = () => {
    const mark = schema.marks[TrackInsertMarkName].create({ id: 'insert-1' });
    const paragraph = schema.nodes.paragraph.create(null, schema.text('Tracked', [mark]));
    return schema.nodes.doc.create(null, paragraph);
  };

  const createState = (doc) =>
    EditorState.create({
      schema,
      doc,
      plugins: [TrackChangesBasePlugin()],
    });

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('initialises with highlighted decorations for tracked insert marks', () => {
    const doc = createDocWithMark();
    const state = createState(doc);
    const pluginState = TrackChangesBasePluginKey.getState(state);

    expect(pluginState).toMatchObject({
      isTrackChangesActive: false,
      onlyOriginalShown: false,
      onlyModifiedShown: false,
    });

    const decorations = pluginState.decorations.find();
    expect(decorations).toHaveLength(1);
    expect(decorations[0].type.attrs.class).toBe(highlightedClass);
  });

  it('recomputes decorations when toggling visibility and activation flags', () => {
    let state = createState(createDocWithMark());

    // Show only original content hides insertions
    let tr = state.tr;
    tr.setMeta(TrackChangesBasePluginKey, { type: 'SHOW_ONLY_ORIGINAL', value: true });
    state = state.apply(tr);
    let pluginState = TrackChangesBasePluginKey.getState(state);
    expect(pluginState.onlyOriginalShown).toBe(true);
    expect(pluginState.onlyModifiedShown).toBe(false);
    expect(pluginState.decorations.find()[0].type.attrs.class).toBe('track-insert-dec hidden');

    // Switching to "final" view hides deletions but shows insertions
    tr = state.tr;
    tr.setMeta(TrackChangesBasePluginKey, { type: 'SHOW_ONLY_MODIFIED', value: true });
    state = state.apply(tr);
    pluginState = TrackChangesBasePluginKey.getState(state);
    expect(pluginState.onlyOriginalShown).toBe(false);
    expect(pluginState.onlyModifiedShown).toBe(true);
    expect(pluginState.decorations.find()[0].type.attrs.class).toBe('track-insert-dec normal');

    // Enabling tracking updates the activity flag without altering visibility
    tr = state.tr;
    tr.setMeta(TrackChangesBasePluginKey, { type: 'TRACK_CHANGES_ENABLE', value: true });
    state = state.apply(tr);
    pluginState = TrackChangesBasePluginKey.getState(state);
    expect(pluginState.isTrackChangesActive).toBe(true);
    expect(pluginState.decorations.find()[0].type.attrs.class).toBe('track-insert-dec normal');
  });

  it('returns an empty decoration set when no tracked marks exist', () => {
    const emptyParagraph = schema.nodes.paragraph.create();
    const doc = schema.nodes.doc.create(null, emptyParagraph);
    const state = createState(doc);
    const pluginState = TrackChangesBasePluginKey.getState(state);
    expect(pluginState.decorations).toBeDefined();
    expect(pluginState.decorations.find()).toHaveLength(0);
  });
});
