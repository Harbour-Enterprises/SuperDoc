import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { schema, doc, p, blockquote } from 'prosemirror-test-builder';
import { selectionHasNodeOrMark, moveCursorToMouseEvent, onMarginClickCursorChange } from './cursor-helpers.js';

const createStateWithSelection = (docNode, selection) => {
  const baseState = EditorState.create({ schema, doc: docNode });
  const tr = baseState.tr.setSelection(selection);
  return baseState.apply(tr);
};

describe('cursor-helpers', () => {
  describe('selectionHasNodeOrMark', () => {
    it('detects mark at cursor when requireEnds is true', () => {
      const linkMark = schema.marks.link.create({ href: 'https://example.com' });
      const para = schema.node('paragraph', null, [schema.text('Link', [linkMark])]);
      const docNode = schema.node('doc', null, [para]);
      const state = createStateWithSelection(docNode, TextSelection.create(docNode, 2));

      const result = selectionHasNodeOrMark(state, 'link', { requireEnds: true });

      expect(result).toBe(true);
    });

    it('detects mark inside selection when requireEnds is false', () => {
      const linkMark = schema.marks.link.create({ href: '#' });
      const nodes = [schema.text('A'), schema.text('B', [linkMark]), schema.text('C')];
      const para = schema.node('paragraph', null, nodes);
      const docNode = schema.node('doc', null, [para]);
      const state = createStateWithSelection(docNode, TextSelection.create(docNode, 1, 4));

      expect(selectionHasNodeOrMark(state, 'link')).toBe(true);
      expect(selectionHasNodeOrMark(state, 'link', { requireEnds: true })).toBe(false);
    });

    it('detects ancestor node when requireEnds is true', () => {
      const docNode = doc(blockquote(p('Quote me')));
      const state = createStateWithSelection(docNode, TextSelection.create(docNode, 2));

      const result = selectionHasNodeOrMark(state, 'blockquote', { requireEnds: true });

      expect(result).toBe(true);
    });
  });

  describe('moveCursorToMouseEvent', () => {
    let view;

    beforeEach(() => {
      const docNode = doc(p('Hello world'));
      const state = EditorState.create({ schema, doc: docNode });
      view = {
        state,
        dispatch: vi.fn((tr) => {
          view.state = view.state.apply(tr);
        }),
        focus: vi.fn(),
        posAtCoords: vi.fn(() => ({ pos: 3 })),
      };
    });

    it('moves cursor to coordinates resolved position', () => {
      const editor = { view };
      const event = { clientX: 10, clientY: 20 };

      moveCursorToMouseEvent(event, editor);

      expect(view.posAtCoords).toHaveBeenCalledWith({ left: 10, top: 20 });
      expect(view.dispatch).toHaveBeenCalledTimes(1);
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.selection.from).toBe(3);
      expect(view.focus).toHaveBeenCalled();
    });
  });

  describe('onMarginClickCursorChange', () => {
    it('adjusts cursor when clicking in the right margin next to text', () => {
      const docNode = doc(p('Hello'));
      const state = EditorState.create({ schema, doc: docNode });
      const view = {
        state,
        dispatch: vi.fn(),
        focus: vi.fn(),
        posAtCoords: vi.fn(() => ({ pos: 5 })),
        dom: {
          getBoundingClientRect: () => ({ left: 0, right: 100, width: 100 }),
        },
      };
      const editor = { view };
      const event = { clientX: 150, clientY: 25 };

      onMarginClickCursorChange(event, editor);

      expect(view.posAtCoords).toHaveBeenCalled();
      expect(view.dispatch).toHaveBeenCalledTimes(1);
      const dispatchedTr = view.dispatch.mock.calls[0][0];
      expect(dispatchedTr.selection.from).toBe(4);
      expect(view.focus).toHaveBeenCalled();
    });
  });
});
