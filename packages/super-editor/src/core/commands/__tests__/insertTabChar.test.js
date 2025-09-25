import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema, doc, p } from 'prosemirror-test-builder';
import { insertTabChar } from '../insertTabChar.js';

describe('insertTabChar', () => {
  it('inserts a tab character at the current selection', () => {
    const testDoc = doc(p('Hello'));
    const state = EditorState.create({ schema, doc: testDoc });
    const tr = state.tr.setSelection(TextSelection.create(testDoc, 3));
    const command = insertTabChar();
    const result = command({ tr, state });

    expect(result).toBe(true);
    expect(tr.doc.textContent).toBe('He\tllo');
  });
});
