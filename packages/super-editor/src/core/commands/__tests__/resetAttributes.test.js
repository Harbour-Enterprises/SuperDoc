import { describe, it, expect } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

import { resetAttributes } from '../resetAttributes.js';

const createSchema = () =>
  new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        attrs: { textAlign: { default: 'left' }, dataId: { default: null } },
        toDOM: (node) => ['p', node.attrs, 0],
      },
      text: { group: 'inline' },
    },
    marks: {
      highlight: {
        attrs: { color: { default: 'yellow' }, note: { default: null } },
        toDOM: (mark) => ['span', { style: `background:${mark.attrs.color}` }, 0],
      },
    },
  });

describe('resetAttributes', () => {
  it('clears specified node attributes within selection', () => {
    const schema = createSchema();
    const paragraph = schema.nodes.paragraph.create({ textAlign: 'center', dataId: 'node-1' }, [schema.text('Hello')]);
    const doc = schema.node('doc', null, [paragraph]);
    const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 5) });
    const tr = state.tr;

    resetAttributes('paragraph', ['dataId'])({ tr, state, dispatch: () => {} });

    const updated = state.apply(tr);
    expect(updated.doc.firstChild.attrs).toEqual({ textAlign: 'center', dataId: null });
  });

  it('merges mark attributes after reset', () => {
    const schema = createSchema();
    const highlight = schema.marks.highlight.create({ color: 'red', note: 'keep' });
    const paragraph = schema.nodes.paragraph.create(null, [schema.text('Marked', [highlight])]);
    const doc = schema.node('doc', null, [paragraph]);
    const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 7) });
    const tr = state.tr;

    resetAttributes('highlight', ['note'])({ tr, state, dispatch: () => {} });

    const updated = state.apply(tr);
    const mark = updated.doc.firstChild.firstChild.marks.find((m) => m.type === schema.marks.highlight);
    expect(mark?.attrs).toEqual({ color: 'red', note: null });
  });
});
