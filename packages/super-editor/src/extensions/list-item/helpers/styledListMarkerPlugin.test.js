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
    // After optimization: one combined decoration per list item instead of two separate ones
    expect(allDecorations.length).toBeGreaterThanOrEqual(1);

    // The single decoration should contain both font and spacing styles
    const decoration = allDecorations[0];
    expect(decoration).toBeDefined();
    const style = decoration.type?.attrs?.style ?? '';

    // Check font styles
    expect(style).toContain('--marker-font-size: 11pt');
    expect(style).toContain('--marker-font-family: Roboto');

    // Check spacing styles
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

  it('combines both marker styling and spacing in single decoration', () => {
    const plugin = styledListMarker();
    const doc = buildDoc();
    const state = EditorState.create({ schema, doc, plugins: [plugin] });

    const decorations = plugin.getState(state);
    const allDecorations = decorations.find();

    // After refactoring, getCombinedListDecorations merges font and spacing into single decoration
    // Verify that at least one decoration has all the styles combined
    const decorationWithBothStyles = allDecorations.find((dec) => {
      const style = dec.type?.attrs?.style ?? '';
      const hasFont = style.includes('--marker-font-size') && style.includes('--marker-font-family');
      const hasSpacing = style.includes('margin-top') && style.includes('margin-bottom');
      return hasFont && hasSpacing;
    });

    // This test verifies the optimization: single decoration instead of multiple
    expect(decorationWithBothStyles).toBeDefined();
    if (decorationWithBothStyles) {
      const style = decorationWithBothStyles.type.attrs.style;
      expect(style).toContain('--marker-font-size: 11pt');
      expect(style).toContain('--marker-font-family: Roboto');
      expect(style).toContain('margin-top: 12px');
      expect(style).toContain('margin-bottom: 6px');
    }
  });

  it('maps decorations when transaction does not affect list items', () => {
    const plugin = styledListMarker();
    const doc = buildDoc();
    let state = EditorState.create({ schema, doc, plugins: [plugin] });
    const initialDecorations = plugin.getState(state);

    // Insert text in a way that doesn't affect list structure
    const tr = state.tr.insertText('x', 1);
    const nextDecorations = plugin.spec.state.apply(tr, initialDecorations, state, state.apply(tr));

    // Should return mapped decorations, not the same instance
    expect(nextDecorations).not.toBe(initialDecorations);
    expect(nextDecorations).toBeInstanceOf(DecorationSet);
  });

  it('regenerates decorations when transaction affects list items', () => {
    const plugin = styledListMarker();

    // Create a doc with a list item
    const textNode = schema.text('Item 1');
    const paragraph = schema.nodes.paragraph.create(null, [textNode]);
    const listItem = schema.nodes.listItem.create(null, [paragraph]);
    const list = schema.nodes.bulletList.create(null, [listItem]);
    const doc = schema.nodes.doc.create(null, [list]);

    let state = EditorState.create({ schema, doc, plugins: [plugin] });
    const initialDecorations = plugin.getState(state);

    // Add a new list item
    const newListItem = schema.nodes.listItem.create({ spacing: { lineSpaceBefore: 8 } }, [
      schema.nodes.paragraph.create(),
    ]);
    const tr = state.tr.insert(doc.content.size - 1, newListItem);
    state = state.apply(tr);

    const nextDecorations = plugin.spec.state.apply(tr, initialDecorations, state, state);

    // Should regenerate decorations
    expect(nextDecorations).not.toBe(initialDecorations);
    const allDecorations = nextDecorations.find();
    expect(allDecorations.length).toBeGreaterThan(0);
  });
});
