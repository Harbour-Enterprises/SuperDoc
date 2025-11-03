import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { initTestEditor } from '@tests/helpers/helpers.js';
import { styledListMarker } from './styledListMarkerPlugin.js';

describe('styledListMarker plugin', () => {
  let editor;
  let schema;

  beforeEach(() => {
    ({ editor } = initTestEditor({ mode: 'text', content: '<p></p>' }));
    schema = editor.schema;
  });

  afterEach(() => {
    editor.destroy();
  });

  const buildDoc = () => {
    const textStyle = schema.marks.textStyle.create({ fontSize: '11pt', fontFamily: 'Roboto' });
    const textNode = schema.text('Item 1', [textStyle]);
    const paragraph = schema.nodes.paragraph.create(null, [textNode]);
    const listItem = schema.nodes.listItem.create(
      {
        spacing: {
          lineSpaceBefore: 12,
          lineSpaceAfter: 6,
          line: { lineRule: 'auto', line: 300 },
        },
      },
      [paragraph],
    );
    const list = schema.nodes.bulletList.create(null, [listItem]);
    return schema.nodes.doc.create(null, [list]);
  };

  it('decorates list markers with font metadata and spacing', () => {
    const plugin = styledListMarker();
    const doc = buildDoc();
    const state = EditorState.create({ schema, doc, plugins: [plugin] });

    const decorations = plugin.getState(state);
    expect(decorations).toBeInstanceOf(DecorationSet);

    const allDecorations = decorations.find();
    expect(allDecorations).toHaveLength(1);

    const markerDecoration = allDecorations[0];
    expect(markerDecoration).toBeDefined();

    const style = markerDecoration.type?.attrs?.style ?? '';
    expect(style).toContain('--marker-font-size: 11pt');
    expect(style).toContain('--marker-font-family: Roboto');
    expect(style).toContain('margin-top: 12px');
    expect(style).toContain('margin-bottom: 6px');
  });

  it('returns previous decoration set when ordered list meta is present', () => {
    const plugin = styledListMarker();
    const doc = buildDoc();
    let state = EditorState.create({ schema, doc, plugins: [plugin] });
    const initialDecorations = plugin.getState(state);

    const tr = state.tr.insertText('!');
    tr.setMeta('orderedListMarker', true);
    const nextDecorations = plugin.spec.state.apply(tr, initialDecorations, state, state);

    expect(nextDecorations).toBe(initialDecorations);
  });
});
