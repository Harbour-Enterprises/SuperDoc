import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema, doc, blockquote, p } from 'prosemirror-test-builder';
import { clearNodes } from '../clearNodes.js';

const runCommand = (state) => {
  const tr = state.tr;
  const dispatched = { called: false };
  const result = clearNodes()({ state, tr, dispatch: () => (dispatched.called = true) });
  return { result, tr, dispatched };
};

describe('clearNodes', () => {
  it('normalizes heading nodes back to paragraph', () => {
    const heading = schema.nodes.heading.create({ level: 1 }, schema.text('Title'));
    const docNode = schema.node('doc', null, [heading]);
    const baseState = EditorState.create({ schema, doc: docNode });
    const selection = TextSelection.create(baseState.doc, 1);
    const state = baseState.apply(baseState.tr.setSelection(selection));

    const { result, tr } = runCommand(state);

    expect(result).toBe(true);
    expect(tr.doc.childCount).toBe(1);
    expect(tr.doc.firstChild.type.name).toBe('paragraph');
    expect(tr.doc.firstChild.textContent).toBe('Title');
  });

  it('lifts blockquote content to top level', () => {
    const docNode = doc(blockquote(p('Quoted text')));
    const baseState = EditorState.create({ schema, doc: docNode });
    const selection = TextSelection.create(baseState.doc, 2, 6);
    const state = baseState.apply(baseState.tr.setSelection(selection));

    const { tr } = runCommand(state);

    expect(tr.doc.childCount).toBe(1);
    expect(tr.doc.firstChild.type.name).toBe('paragraph');
    expect(tr.doc.firstChild.textContent).toBe('Quoted text');
  });
});
