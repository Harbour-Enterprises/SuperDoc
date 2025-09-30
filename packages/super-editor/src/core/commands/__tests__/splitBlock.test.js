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

const createEditorProps = (doc, selection) => {
  const state = EditorState.create({ schema, doc, selection });
  const tr = state.tr;

  const editor = {
    extensionService: {
      attributes: [],
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
});
