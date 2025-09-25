import { describe, it, expect, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schemaWithLists } from './schemaWithLists.js';

const joinForwardMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('prosemirror-commands', () => ({
  joinForward: joinForwardMock,
}));
import { joinForward } from '../joinForward.js';

describe('joinForward', () => {
  beforeEach(() => {
    joinForwardMock.mockClear();
  });

  it('delegates to original command when selection is at textblock end', () => {
    const doc = schemaWithLists.node('doc', null, [
      schemaWithLists.node('paragraph', null, [schemaWithLists.text('Hello')]),
      schemaWithLists.node('paragraph', null, [schemaWithLists.text('World')]),
    ]);
    const baseState = EditorState.create({ schema: schemaWithLists, doc });
    const selectionTr = baseState.tr.setSelection(TextSelection.create(baseState.doc, 6));
    const state = baseState.apply(selectionTr);
    const dispatch = vi.fn();
    const result = joinForward()({ state, dispatch, tr: state.tr });

    expect(result).toBe(true);
    expect(joinForwardMock).toHaveBeenCalledWith(state, dispatch);
  });

  it('returns false when current node is a list', () => {
    const state = {
      selection: {
        $from: {
          parent: { isTextblock: true },
          parentOffset: 0,
          before: () => 0,
        },
      },
      doc: {
        resolve: () => ({
          nodeBefore: { type: { name: 'orderedList' } },
          nodeAfter: null,
        }),
      },
    };

    const result = joinForward()({ state, dispatch: vi.fn() });

    expect(result).toBe(false);
    expect(joinForwardMock).not.toHaveBeenCalled();
  });
});
