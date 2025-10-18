import { describe, it, expect } from 'vitest';
import { getNodeRect } from './get-node-rect.js';
import { createMockView } from './test-utils.js';

describe('getNodeRect', () => {
  it('returns DOM rect when available', () => {
    const desired = { top: 10, bottom: 20, left: 3, right: 7, height: 10, width: 4 };
    const view = createMockView({ nodeRects: new Map([[5, desired]]) });
    expect(getNodeRect(view, 5, { nodeSize: 4 })).toEqual(desired);
  });

  it('falls back to coordinates when DOM lookup fails', () => {
    const coordsMap = new Map([
      [5, { top: 10, bottom: 20, left: 3, right: 5 }],
      [9, { top: 30, bottom: 40, left: 2, right: 8 }],
    ]);
    const view = createMockView({
      coordsMap,
      nodeDomResolver: () => {
        throw new Error('no dom');
      },
    });
    expect(getNodeRect(view, 5, { nodeSize: 4 })).toEqual({
      top: 10,
      bottom: 40,
      left: 2,
      right: 8,
      height: 30,
      width: 6,
    });
  });

  it('returns null when fallbacks unavailable', () => {
    const view = createMockView({
      coordsMap: new Map(),
      nodeDomResolver: () => {
        throw new Error('no dom');
      },
    });
    expect(getNodeRect(view, 1, { nodeSize: 2 })).toBeNull();
  });
});
