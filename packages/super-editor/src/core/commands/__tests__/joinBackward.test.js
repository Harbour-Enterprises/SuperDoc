import { describe, it, expect, vi } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schemaWithLists } from './schemaWithLists.js';

const joinBackwardMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('prosemirror-commands', () => ({
  joinBackward: joinBackwardMock,
}));
import { joinBackward } from '../joinBackward.js';

describe('joinBackward', () => {
  beforeEach(() => {
    joinBackwardMock.mockClear();
  });

  it('delegates to original command in normal cases', () => {
    const doc = schemaWithLists.node('doc', null, [
      schemaWithLists.node('paragraph', null, [schemaWithLists.text('Hello')]),
      schemaWithLists.node('paragraph', null, [schemaWithLists.text('World')]),
    ]);
    const baseState = EditorState.create({ schema: schemaWithLists, doc });
    const selectionTr = baseState.tr.setSelection(TextSelection.create(baseState.doc, 6));
    const state = baseState.apply(selectionTr);
    const dispatch = vi.fn();
    const result = joinBackward()({ state, dispatch, tr: state.tr });

    expect(result).toBe(true);
    expect(joinBackwardMock).toHaveBeenCalledWith(state, dispatch);
  });

  it('prevents joining when adjacent nodes are lists', () => {
    const list = schemaWithLists.node('orderedList', null, [
      schemaWithLists.node('listItem', null, [
        schemaWithLists.node('paragraph', null, [schemaWithLists.text('Item 1')]),
      ]),
    ]);
    const paragraph = schemaWithLists.node('paragraph', null, [schemaWithLists.text('Paragraph')]);
    const doc = schemaWithLists.node('doc', null, [list, paragraph]);
    const baseState = EditorState.create({ schema: schemaWithLists, doc });
    const paragraphStart = list.nodeSize + 1;
    const selectionTr = baseState.tr.setSelection(TextSelection.create(baseState.doc, paragraphStart));
    const state = baseState.apply(selectionTr);
    const result = joinBackward()({ state, dispatch: vi.fn(), tr: state.tr });

    expect(result).toBe(false);
    expect(joinBackwardMock).not.toHaveBeenCalled();
  });
});
