import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state';

import { splitBlock } from '../splitBlock.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      attrs: {
        listRendering: { default: null },
        paragraphProperties: { default: null },
      },
      toDOM: () => ['p', 0],
      parseDOM: [{ tag: 'p' }],
    },
    text: { group: 'inline' },
  },
  marks: {
    bold: {
      toDOM: () => ['strong', 0],
      parseDOM: [{ tag: 'strong' }],
    },
  },
});

const createEditorProps = (doc, selection, extensionAttrs = []) => {
  const state = EditorState.create({ schema, doc, selection });
  const tr = state.tr;

  const editor = {
    extensionService: {
      attributes: extensionAttrs,
      splittableMarks: ['bold'],
    },
    view: {
      dispatch: vi.fn(),
    },
  };

  return { state, tr, editor, selection: state.selection };
};

describe('splitBlock', () => {
  it('splits a text block preserving marks when keepMarks=true', () => {
    const mark = schema.marks.bold.create();
    const paragraph = schema.nodes.paragraph.create(null, [schema.text('Hello', [mark]), schema.text('World')]);
    const doc = schema.node('doc', null, [paragraph]);
    const selection = TextSelection.create(doc, 3);
    const props = createEditorProps(doc, selection);

    const command = splitBlock({ keepMarks: true });
    const dispatched = command({ ...props, dispatch: () => {} });

    expect(dispatched).toBe(true);
    const updated = props.state.apply(props.tr);
    expect(updated.doc.childCount).toBe(2);
    expect(updated.doc.child(0).textContent).toBe('He');
    expect(updated.doc.child(1).textContent).toBe('lloWorld');
    expect(updated.doc.child(0).firstChild.marks.map((m) => m.type.name)).toContain('bold');
    expect(updated.doc.child(1).firstChild.marks.map((m) => m.type.name)).toContain('bold');
  });

  it('returns false when splitting a node selection at start without split opportunity', () => {
    const paragraph = schema.nodes.paragraph.create(null, [schema.text('Block')]);
    const doc = schema.node('doc', null, [paragraph]);
    const selection = NodeSelection.create(doc, 0);
    const props = createEditorProps(doc, selection);

    const result = splitBlock()({ ...props, dispatch: vi.fn() });

    expect(result).toBe(false);
  });

  it('removes overridden attributes before splitting', () => {
    const listRendering = { markerText: 'bullet' };
    const paragraphProperties = { numberingProperties: { numId: 1 } };
    const paragraph = schema.nodes.paragraph.create({ listRendering, paragraphProperties }, [
      schema.text('HelloWorld'),
    ]);
    const doc = schema.node('doc', null, [paragraph]);
    const selection = TextSelection.create(doc, paragraph.nodeSize - 1);
    const extensionAttrs = [
      {
        type: 'paragraph',
        name: 'listRendering',
        attribute: { keepOnSplit: true },
      },
      {
        type: 'paragraph',
        name: 'paragraphProperties',
        attribute: { keepOnSplit: true },
      },
    ];
    const props = createEditorProps(doc, selection, extensionAttrs);

    const command = splitBlock({
      attrsToRemoveOverride: ['listRendering', 'paragraphProperties.numberingProperties'],
    });
    const dispatched = command({ ...props, dispatch: () => {} });

    expect(dispatched).toBe(true);
    const updated = props.state.apply(props.tr);
    expect(updated.doc.childCount).toBe(2);
    const splitNode = updated.doc.child(1);
    expect(splitNode.attrs.listRendering).toBeNull();
    expect(splitNode.attrs.paragraphProperties?.numberingProperties).toBeUndefined();
  });
});
