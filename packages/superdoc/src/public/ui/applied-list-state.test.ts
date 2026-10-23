import { describe, expect, it, vi } from 'vite-plus/test';

import { createSuperDocUI } from './create-super-doc-ui.js';

const body = { kind: 'story', storyType: 'body' };

function selectionInfo(blockId = 'P1', offset = 1) {
  return {
    empty: true,
    target: { kind: 'text', segments: [{ blockId, range: { start: offset, end: offset } }] },
    activeMarks: [],
    activeCommentIds: [],
    activeChangeIds: [],
  };
}

function presentationInfo() {
  const state = { success: true, isListItem: true, seed: 'bullet', ilvl: 0 };
  return {
    selection: selectionInfo(),
    inlineStyle: {},
    paragraphAlignments: [],
    listState: { blockId: 'P1', story: body, value: state },
  };
}

type AppliedPresentation = ReturnType<typeof presentationInfo>;

function mount(transform: (presentation: AppliedPresentation) => unknown = (value) => value) {
  const presentation = presentationInfo();
  const state = presentation.listState.value;
  const getStateInStory = vi.fn(() => state);
  const getAppliedListState = vi.fn(() => state);
  const readAppliedSelectionPresentation = vi.fn(() => transform(presentation));
  const superdoc = {
    activeEditor: {
      editorVersion: 2,
      host: { readAppliedSelectionPresentation, getAppliedListState },
      doc: {
        selection: {
          current: () => presentation.selection,
        },
        lists: { getStateInStory, apply: vi.fn() },
      },
    },
  };
  const ui = createSuperDocUI({ superdoc: superdoc as never });
  return { ui, getStateInStory, getAppliedListState, readAppliedSelectionPresentation };
}

describe('toolbar list facts from the current applied frame', () => {
  it('uses selection-bound applied list facts without issuing a document read', () => {
    const h = mount();
    try {
      expect(h.ui.commands.get('bullet-list').getState().active).toBe(true);
      expect(h.readAppliedSelectionPresentation).toHaveBeenCalled();
      expect(h.getAppliedListState).not.toHaveBeenCalled();
      expect(h.getStateInStory).not.toHaveBeenCalled();
    } finally {
      h.ui.destroy();
    }
  });

  it.each([
    ['unavailable presentation', () => null],
    ['missing list facts', (value) => ({ ...value, listState: null })],
    [
      'older presentation without list facts',
      (value) => ({ selection: value.selection, inlineStyle: value.inlineStyle }),
    ],
    ['missing bound story', (value) => ({ ...value, listState: { ...value.listState, story: null } })],
    ['invalid bound story', (value) => ({ ...value, listState: { ...value.listState, story: 'body' } })],
    ['different block', (value) => ({ ...value, listState: { ...value.listState, blockId: 'P2' } })],
    [
      'different story',
      (value) => ({
        ...value,
        listState: { ...value.listState, story: { kind: 'story', storyType: 'footnote', noteId: '1' } },
      }),
    ],
    ['different selection block', (value) => ({ ...value, selection: selectionInfo('P2') })],
    ['different selection offset', (value) => ({ ...value, selection: selectionInfo('P1', 2) })],
    [
      'unsuccessful list facts',
      (value) => ({ ...value, listState: { ...value.listState, value: { success: false } } }),
    ],
    [
      'array-shaped list facts',
      (value) => ({
        ...value,
        listState: { ...value.listState, value: Object.assign([], { success: true }) },
      }),
    ],
  ] satisfies Array<[string, (value: AppliedPresentation) => unknown]>)(
    'retains the canonical document read for %s',
    (_label, transform) => {
      const h = mount(transform);
      try {
        expect(h.ui.commands.get('bullet-list').getState().active).toBe(true);
        expect(h.getStateInStory).toHaveBeenCalledWith({
          target: { kind: 'block', nodeType: 'paragraph', nodeId: 'P1' },
          story: body,
        });
        expect(h.getAppliedListState).not.toHaveBeenCalled();
      } finally {
        h.ui.destroy();
      }
    },
  );
});
