import { describe, it, expect } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { doc, p, schema } from 'prosemirror-test-builder';
import { setMeta } from '../setMeta.js';

describe('setMeta', () => {
  it('sets transaction metadata and returns true', () => {
    const state = EditorState.create({ schema, doc: doc(p('meta')) });
    const tr = state.tr;

    const result = setMeta('test-key', { value: 123 })({ tr });

    expect(result).toBe(true);
    expect(tr.getMeta('test-key')).toEqual({ value: 123 });
  });
});
