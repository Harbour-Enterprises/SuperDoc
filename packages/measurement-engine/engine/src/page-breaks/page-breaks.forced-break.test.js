import { describe, it, expect, afterEach, vi } from 'vitest';
import { measureBreakAtPageIndex } from './page-breaks.js';
import * as helpers from './helpers/index.js';

const baseView = () => {
  const coordsMap = new Map([
    [0, { top: 0, bottom: 0 }],
    [5, { top: 150, bottom: 155 }],
    [6, { top: 156, bottom: 160 }],
    [10, { top: 200, bottom: 210 }],
  ]);

  return {
    dom: { getBoundingClientRect: () => ({ top: 0 }) },
    coordsAtPos: (pos) => coordsMap.get(pos),
    state: {
      doc: {
        content: {
          size: 50,
        },
        descendants: (callback) => {
          const docNode = { type: { name: 'doc' }, nodeSize: 50, isBlock: true };
          callback(docNode, 0);
        },
      },
    },
  };
};

describe('measureBreakAtPageIndex - forced break handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers a forced break to a later overflow break', () => {
    const view = baseView();

    vi.spyOn(helpers, 'findForcedBreak').mockReturnValue({
      breakPoint: { pos: 6, top: 156, bottom: 160 },
      overflowBlock: {
        node: { type: { name: 'hardBreak' } },
        pos: 5,
        rect: { top: 150, bottom: 160, left: 0, right: 0, height: 10, width: 0 },
      },
    });

    vi.spyOn(helpers, 'findFirstOverflowBlock').mockReturnValue({
      node: { type: { name: 'paragraph' } },
      pos: 2,
      rect: { top: 210, bottom: 350 },
    });

    vi.spyOn(helpers, 'isTableNode').mockReturnValue(false);
    vi.spyOn(helpers, 'isTableRowNode').mockReturnValue(false);
    vi.spyOn(helpers, 'findBreakPosInBlock').mockReturnValue({ pos: 12, top: 260, bottom: 270 });

    const result = measureBreakAtPageIndex(view, 0, { startPos: 0 });

    expect(result?.break?.pos).toBe(6);
    expect(result?.overflowBlock?.node?.type?.name).toBe('hardBreak');
  });

  it('returns a forced break even when no overflow block is found', () => {
    const view = baseView();

    vi.spyOn(helpers, 'findForcedBreak').mockReturnValue({
      breakPoint: { pos: 6, top: 156, bottom: 160 },
      overflowBlock: {
        node: { type: { name: 'hardBreak' } },
        pos: 5,
        rect: null,
      },
    });

    vi.spyOn(helpers, 'findFirstOverflowBlock').mockReturnValue(null);

    const result = measureBreakAtPageIndex(view, 0, { startPos: 0 });

    expect(result?.break?.pos).toBe(6);
    expect(result?.overflowBlock?.node?.type?.name).toBe('hardBreak');
  });
});
