import { describe, it, expect, vi } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

import { unsetAllMarks } from '../unsetAllMarks.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    text: { group: 'inline' },
  },
  marks: {
    bold: {
      toDOM: () => ['strong', 0],
      parseDOM: [{ tag: 'strong' }],
    },
  },
});

describe('unsetAllMarks', () => {
  it('removes marks across all ranges in selection', () => {
    const mark = schema.marks.bold.create();
    const paragraph = schema.nodes.paragraph.create(null, [schema.text('Hello', [mark]), schema.text('World')]);
    const doc = schema.node('doc', null, [paragraph]);
    const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 6) });

    const tr = state.tr;
    const result = unsetAllMarks()({ tr, dispatch: () => {}, editor: { options: {} } });

    expect(result).toBe(true);
    const newState = state.apply(tr);
    newState.doc.descendants((node) => {
      if (node.isText) {
        expect(node.marks).toHaveLength(0);
      }
    });
  });

  it('returns true immediately for empty selections', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph')]);
    const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 1) });

    const result = unsetAllMarks()({ tr: state.tr, dispatch: vi.fn(), editor: { options: {} } });
    expect(result).toBe(true);
  });
});
