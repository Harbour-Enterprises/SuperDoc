import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema as baseSchema } from 'prosemirror-test-builder';
import { insertTabNode } from '../insertTabNode.js';
import { schemaWithLists } from './schemaWithLists.js';

const createDoc = (schema) => schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello')])]);

const createState = (schema) => EditorState.create({ schema, doc: createDoc(schema) });

describe('insertTabNode', () => {
  it('inserts tab node when available in schema', () => {
    const state = createState(schemaWithLists);
    const tr = state.tr.setSelection(TextSelection.create(state.doc, 2));
    const command = insertTabNode();
    const dispatched = [];
    const dispatch = (cmdTr) => dispatched.push(cmdTr);

    const result = command({ tr, state, dispatch });

    expect(result).toBe(true);
    expect(dispatched).toHaveLength(1);
    const paragraph = dispatched[0].doc.firstChild;
    const children = paragraph.content.content;
    expect(children[0].type.name).toBe('text');
    expect(children[0].text).toBe('H');
    expect(children[1].type.name).toBe('tab');
    expect(children[2].text).toBe('ello');
  });

  it('falls back to character insertion when tab node missing', () => {
    const state = createState(baseSchema);
    const tr = state.tr.setSelection(TextSelection.create(state.doc, 2));
    const command = insertTabNode();
    const dispatched = [];
    const dispatch = (cmdTr) => dispatched.push(cmdTr);

    const result = command({ tr, state, dispatch });

    expect(result).toBe(true);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].doc.textContent).toBe('H\tello');
  });
});
