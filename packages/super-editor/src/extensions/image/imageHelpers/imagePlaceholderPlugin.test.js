import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { ImagePlaceholderPlugin, ImagePlaceholderPluginKey, findPlaceholder } from './imagePlaceholderPlugin.js';

describe('ImagePlaceholderPlugin', () => {
  let schema;
  let plugin;
  let state;

  beforeEach(() => {
    const { editor } = initTestEditor({ mode: 'text', content: '<p></p>' });
    schema = editor.schema;
    editor.destroy();
    plugin = ImagePlaceholderPlugin();
    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]);
    state = EditorState.create({ schema, doc, plugins: [plugin] });
  });

  it('adds and removes placeholder decorations via meta transactions', () => {
    const addMeta = { type: 'add', id: 'placeholder-1', pos: 1 };
    const trAdd = state.tr.setMeta(ImagePlaceholderPluginKey, addMeta);
    const addState = state.apply(trAdd);

    const decorationSet = ImagePlaceholderPluginKey.getState(addState);
    const added = decorationSet.find();
    expect(added).toHaveLength(1);
    expect(findPlaceholder(addState, 'placeholder-1')).toBe(1);

    const removeMeta = { type: 'remove', id: 'placeholder-1' };
    const trRemove = addState.tr.setMeta(ImagePlaceholderPluginKey, removeMeta);
    const removedState = addState.apply(trRemove);
    const removed = ImagePlaceholderPluginKey.getState(removedState);
    expect(removed.find()).toHaveLength(0);
  });
});
