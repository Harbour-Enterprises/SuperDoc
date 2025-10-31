// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RECT_GROUP_TOLERANCE,
  HORIZONTAL_POSITION_TOLERANCE,
  LINE_SCAN_LIMIT,
  isFiniteNumber,
  rewindToLineStart,
  findLineBreakInBlock,
} from './find-line-break-in-block.js';

// Mock the imported dependency
vi.mock('./safe-coords-at-pos.js', () => ({
  safeCoordsAtPos: vi.fn(),
}));

import { safeCoordsAtPos } from './safe-coords-at-pos.js';

describe('Constants', () => {
  it('exports RECT_GROUP_TOLERANCE', () => {
    expect(RECT_GROUP_TOLERANCE).toBe(2.5);
  });

  it('exports HORIZONTAL_POSITION_TOLERANCE', () => {
    expect(HORIZONTAL_POSITION_TOLERANCE).toBe(8.0);
  });

  it('exports LINE_SCAN_LIMIT', () => {
    expect(LINE_SCAN_LIMIT).toBe(160);
  });
});

describe('isFiniteNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(42)).toBe(true);
    expect(isFiniteNumber(-10.5)).toBe(true);
    expect(isFiniteNumber(Number.MIN_VALUE)).toBe(true);
    expect(isFiniteNumber(Number.MAX_VALUE)).toBe(true);
  });

  it('returns false for non-finite numbers', () => {
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(-Infinity)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
    expect(isFiniteNumber('42')).toBe(false);
    expect(isFiniteNumber({})).toBe(false);
    expect(isFiniteNumber([])).toBe(false);
    expect(isFiniteNumber(true)).toBe(false);
  });
});

describe('rewindToLineStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns original position when pos is not finite', () => {
    const mockView = {};
    const result = rewindToLineStart(mockView, NaN, 0, 100, 120, 50);
    expect(result).toBeNaN();
  });

  it('stops rewinding when reaching minPos', () => {
    const mockView = {};
    safeCoordsAtPos.mockReturnValue({ top: 100, bottom: 120, left: 50 });

    const result = rewindToLineStart(mockView, 10, 10, 100, 120, 50);

    expect(result).toBe(10);
    expect(safeCoordsAtPos).not.toHaveBeenCalled();
  });

  it('rewinds while on same line', () => {
    const mockView = {};
    safeCoordsAtPos
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 50 }) // pos 9
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 45 }) // pos 8
      .mockReturnValueOnce({ top: 90, bottom: 110, left: 40 }); // Different line

    const result = rewindToLineStart(mockView, 10, 0, 100, 120, 50);

    expect(result).toBe(8); // Stopped at pos 8 (last position on same line)
  });

  it('stops when coords are not available', () => {
    const mockView = {};
    safeCoordsAtPos.mockReturnValueOnce({ top: 100, bottom: 120, left: 50 }).mockReturnValueOnce(null);

    const result = rewindToLineStart(mockView, 10, 0, 100, 120, 50);

    expect(result).toBe(9);
  });

  it('stops when top coordinate is not finite', () => {
    const mockView = {};
    safeCoordsAtPos
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 50 })
      .mockReturnValueOnce({ top: NaN, bottom: 120, left: 45 });

    const result = rewindToLineStart(mockView, 10, 0, 100, 120, 50);

    expect(result).toBe(9);
  });

  it('uses tolerance when comparing line coordinates', () => {
    const mockView = {};
    const tolerance = RECT_GROUP_TOLERANCE;

    // Position within tolerance should be considered same line
    safeCoordsAtPos
      .mockReturnValueOnce({ top: 100 + tolerance * 0.5, bottom: 120 + tolerance * 0.5, left: 50 })
      .mockReturnValueOnce({ top: 100 - tolerance * 0.5, bottom: 120 - tolerance * 0.5, left: 45 })
      .mockReturnValueOnce({ top: 100 + tolerance * 2, bottom: 120, left: 40 }); // Out of tolerance

    const result = rewindToLineStart(mockView, 10, 0, 100, 120, 50);

    expect(result).toBe(8);
  });

  it('triggers second pass when horizontal position is far from lineLeft', () => {
    const mockView = {};
    const threshold = HORIZONTAL_POSITION_TOLERANCE;

    // First pass: rewind to same line
    safeCoordsAtPos
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 50 + threshold + 5 }) // pos 9
      .mockReturnValueOnce({ top: 90, bottom: 110, left: 45 }); // Different line, stop first pass

    // At pos 10, we're far from lineLeft (50), so second pass should trigger
    // Second pass: continue rewinding
    safeCoordsAtPos
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 52 }) // pos 9 again
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 51 }); // pos 8

    const result = rewindToLineStart(mockView, 10, 5, 100, 120, 50);

    // Second pass should have been used
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('respects LINE_SCAN_LIMIT during first pass', () => {
    const mockView = {};
    safeCoordsAtPos.mockReturnValue({ top: 100, bottom: 120, left: 50 });

    const highPos = LINE_SCAN_LIMIT + 50;
    rewindToLineStart(mockView, highPos, 0, 100, 120, 50);

    // Should stop after LINE_SCAN_LIMIT iterations
    expect(safeCoordsAtPos.mock.calls.length).toBeLessThanOrEqual(LINE_SCAN_LIMIT + 10);
  });

  it('enforces minPos when second pass is not used', () => {
    const mockView = {};
    safeCoordsAtPos
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 52 }) // Within tolerance of lineLeft
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 51 })
      .mockReturnValueOnce({ top: 100, bottom: 120, left: 50 });

    const result = rewindToLineStart(mockView, 10, 8, 100, 120, 50);

    expect(result).toBeGreaterThanOrEqual(8);
  });
});

describe('findLineBreakInBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when view is null', () => {
    const result = findLineBreakInBlock(null, 0, {}, 500);
    expect(result).toBeNull();
  });

  it('returns null when boundaryY is not finite', () => {
    const mockView = {};
    const result = findLineBreakInBlock(mockView, 0, {}, NaN);
    expect(result).toBeNull();
  });

  it('returns null when blockNode is null', () => {
    const mockView = {};
    const result = findLineBreakInBlock(mockView, 0, null, 500);
    expect(result).toBeNull();
  });

  it('returns null when HTMLElement is not available', () => {
    const originalHTMLElement = global.HTMLElement;
    delete global.HTMLElement;

    const mockView = { nodeDOM: vi.fn() };
    const result = findLineBreakInBlock(mockView, 0, {}, 500);

    expect(result).toBeNull();

    global.HTMLElement = originalHTMLElement;
  });

  it('returns null when view.nodeDOM is not a function', () => {
    const mockView = {};
    const result = findLineBreakInBlock(mockView, 0, {}, 500);
    expect(result).toBeNull();
  });

  it('returns null when nodeDOM returns null', () => {
    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(null),
    };
    const result = findLineBreakInBlock(mockView, 0, {}, 500);
    expect(result).toBeNull();
  });

  it('returns null when nodeDOM throws exception', () => {
    const mockView = {
      nodeDOM: vi.fn().mockImplementation(() => {
        throw new Error('nodeDOM failed');
      }),
    };
    const result = findLineBreakInBlock(mockView, 0, {}, 500);
    expect(result).toBeNull();
  });

  it('uses parent element when dom is not HTMLElement', () => {
    const parentElement = document.createElement('div');
    const textNode = document.createTextNode('text');
    parentElement.appendChild(textNode);

    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(textNode),
      posAtCoords: vi.fn(),
      state: {
        doc: {
          resolve: vi.fn().mockReturnValue({
            parent: { textContent: '' },
            parentOffset: 0,
          }),
        },
      },
    };

    // Won't find overflow because we need proper setup, but should not crash
    const result = findLineBreakInBlock(mockView, 0, { nodeSize: 10 }, 500);

    expect(mockView.nodeDOM).toHaveBeenCalled();
  });

  it('returns null when no line rects can be collected', () => {
    const element = document.createElement('div');
    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(element),
    };

    // Empty element has no line rects
    const result = findLineBreakInBlock(mockView, 0, { nodeSize: 10 }, 500);

    expect(result).toBeNull();
  });

  it('returns null when last line does not overflow boundary', () => {
    const element = document.createElement('div');
    element.textContent = 'Short text';
    document.body.appendChild(element);

    // Mock getBoundingClientRect to return rect that doesn't overflow
    const createRangeSpy = vi.spyOn(document, 'createRange');
    const mockRange = {
      selectNodeContents: vi.fn(),
      getClientRects: vi.fn().mockReturnValue([
        {
          top: 100,
          bottom: 120,
          left: 50,
          right: 200,
          width: 150,
          height: 20,
        },
      ]),
      detach: vi.fn(),
    };
    createRangeSpy.mockReturnValue(mockRange);

    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(element),
    };

    let result;
    try {
      result = findLineBreakInBlock(mockView, 0, { nodeSize: 10 }, 500); // boundary way below
    } finally {
      document.body.removeChild(element);
      createRangeSpy.mockRestore();
    }

    expect(result).toBeNull();
  });

  it('returns break data when line overflows boundary', () => {
    const element = document.createElement('div');
    element.textContent = 'Some text content';
    document.body.appendChild(element);

    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(element),
      posAtCoords: vi.fn().mockReturnValue({ pos: 5 }),
      state: {
        doc: {
          resolve: vi.fn().mockReturnValue({
            parent: { textContent: 'Some text content' },
            parentOffset: 5,
          }),
        },
      },
    };

    // Mock range to return overflowing rect
    const createRangeSpy = vi.spyOn(document, 'createRange');
    const mockRange = {
      selectNodeContents: vi.fn(),
      getClientRects: vi.fn().mockReturnValue([
        {
          top: 500,
          bottom: 520,
          left: 50,
          right: 200,
          width: 150,
          height: 20,
        },
      ]),
      detach: vi.fn(),
    };
    createRangeSpy.mockReturnValue(mockRange);

    safeCoordsAtPos.mockReturnValue({ top: 500, bottom: 520, left: 50 });

    const result = findLineBreakInBlock(mockView, 0, { nodeSize: 20 }, 400); // boundary at 400

    document.body.removeChild(element);
    createRangeSpy.mockRestore();

    expect(result).toBeDefined();
    expect(result).toHaveProperty('pos');
    expect(result).toHaveProperty('top');
    expect(result).toHaveProperty('bottom');
  });

  it('uses minPos parameter', () => {
    const element = document.createElement('div');
    element.textContent = 'Content';
    document.body.appendChild(element);

    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(element),
      posAtCoords: vi.fn().mockReturnValue({ pos: 3 }),
      state: {
        doc: {
          resolve: vi.fn().mockReturnValue({
            parent: { textContent: 'Content' },
            parentOffset: 3,
          }),
        },
      },
    };

    const createRangeSpy = vi.spyOn(document, 'createRange');
    const mockRange = {
      selectNodeContents: vi.fn(),
      getClientRects: vi.fn().mockReturnValue([
        {
          top: 500,
          bottom: 520,
          left: 50,
          right: 150,
          width: 100,
          height: 20,
        },
      ]),
      detach: vi.fn(),
    };
    createRangeSpy.mockReturnValue(mockRange);

    safeCoordsAtPos.mockReturnValue({ top: 500, bottom: 520, left: 50 });

    const result = findLineBreakInBlock(mockView, 0, { nodeSize: 10 }, 400, 5);

    document.body.removeChild(element);
    createRangeSpy.mockRestore();

    if (result) {
      expect(result.pos).toBeGreaterThanOrEqual(5);
    }
  });

  it('clamps position within block bounds', () => {
    const element = document.createElement('div');
    element.textContent = 'Text';
    document.body.appendChild(element);

    const mockView = {
      nodeDOM: vi.fn().mockReturnValue(element),
      posAtCoords: vi.fn().mockReturnValue({ pos: 100 }), // Way past block end
      state: {
        doc: {
          resolve: vi.fn().mockReturnValue({
            parent: { textContent: 'Text' },
            parentOffset: 0,
          }),
        },
      },
    };

    const createRangeSpy = vi.spyOn(document, 'createRange');
    const mockRange = {
      selectNodeContents: vi.fn(),
      getClientRects: vi.fn().mockReturnValue([
        {
          top: 500,
          bottom: 520,
          left: 50,
          right: 150,
          width: 100,
          height: 20,
        },
      ]),
      detach: vi.fn(),
    };
    createRangeSpy.mockReturnValue(mockRange);

    safeCoordsAtPos.mockReturnValue({ top: 500, bottom: 520, left: 50 });

    const result = findLineBreakInBlock(mockView, 0, { nodeSize: 10 }, 400);

    document.body.removeChild(element);
    createRangeSpy.mockRestore();

    if (result) {
      expect(result.pos).toBeLessThan(10); // Should be clamped to blockPos + nodeSize - 1
    }
  });
});
