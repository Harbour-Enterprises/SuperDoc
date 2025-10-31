import { describe, it, expect } from 'vitest';
import { findForcedBreak } from './find-forced-break.js';
import { createMockDoc, createMockView } from './test-utils.js';

const hardBreak = {
  type: { name: 'hardBreak' },
  nodeSize: 1,
  attrs: {},
};

const paragraph = {
  type: { name: 'paragraph' },
  isBlock: true,
  nodeSize: 10,
};

describe('findForcedBreak', () => {
  it('returns null when no forced break nodes exist', () => {
    const doc = createMockDoc([{ node: paragraph, pos: 0 }], { size: 20 });
    const view = createMockView({ state: { doc } });

    expect(findForcedBreak(view, { startPos: 0 })).toBeNull();
  });

  it('locates a hardBreak node after the given start position', () => {
    const hardBreakPos = 5;
    const doc = createMockDoc(
      [
        { node: paragraph, pos: 0 },
        { node: hardBreak, pos: hardBreakPos },
      ],
      { size: 20 },
    );

    const rect = { top: 120, bottom: 140, left: 0, right: 40, height: 20, width: 40 };
    const view = createMockView({
      state: { doc },
      coordsMap: new Map([
        [hardBreakPos, { top: 120, bottom: 130 }],
        [hardBreakPos + 1, { top: 130, bottom: 140 }],
      ]),
      nodeRects: new Map([[hardBreakPos, rect]]),
    });

    const result = findForcedBreak(view, { startPos: 0 });

    expect(result?.breakPoint).toMatchObject({ pos: hardBreakPos + 1 });
    expect(result?.overflowBlock).toMatchObject({ node: hardBreak, pos: hardBreakPos, rect });
  });

  it('ignores forced breaks that occur at or before the start position', () => {
    const doc = createMockDoc(
      [
        { node: paragraph, pos: 0 },
        { node: hardBreak, pos: 2 },
      ],
      { size: 20 },
    );
    const view = createMockView({ state: { doc } });

    expect(findForcedBreak(view, { startPos: 3 })).toBeNull();
  });
});
