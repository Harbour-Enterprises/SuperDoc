import { beforeAll, describe, expect, it } from 'vitest';
import type { FlowBlock, Line, Run } from '@superdoc/contracts';
import { findCharacterAtX, measureCharacterX, charOffsetToPm } from '../src/text-measurement.ts';

// Helper to count spaces (tests functionality indirectly through justify calculations)
const countSpaces = (text: string): number => {
  let spaces = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === ' ' || text[i] === '\u00A0') {
      spaces += 1;
    }
  }
  return spaces;
};

// Helper to test justify adjustment by measuring with different available widths
const testJustifyAdjustment = (
  block: FlowBlock,
  line: Line,
  availableWidth: number,
): { extraPerSpace: number; totalSpaces: number } => {
  // Measure a position with normal width
  const normalWidth = measureCharacterX(block, line, 1, line.width);
  // Measure with increased available width (which should add justify spacing)
  const wideWidth = measureCharacterX(block, line, 1, availableWidth);

  // If justified, the difference reveals the extra spacing
  const diff = wideWidth - normalWidth;
  const spaceCount = countSpaces(
    line.segments ? '' : block.kind === 'paragraph' ? block.runs.map((r) => ('text' in r ? r.text : '')).join('') : '',
  );

  return {
    extraPerSpace: spaceCount > 0 ? diff / spaceCount : 0,
    totalSpaces: spaceCount,
  };
};

const CHAR_WIDTH = 10;

const ensureDocumentStub = (): void => {
  if (typeof document !== 'undefined') return;
  const ctx = {
    font: '',
    measureText(text: string) {
      return { width: text.length * CHAR_WIDTH } as TextMetrics;
    },
  };
  (globalThis as any).document = {
    createElement() {
      return {
        getContext() {
          return ctx;
        },
      };
    },
  } as Document;
};

beforeAll(() => {
  ensureDocumentStub();
});

const createBlock = (runs: Run[]): FlowBlock => ({
  kind: 'paragraph',
  id: 'test-block',
  runs,
});

const baseLine = (overrides?: Partial<Line>): Line => ({
  fromRun: 0,
  fromChar: 0,
  toRun: 0,
  toChar: 0,
  width: 200,
  ascent: 12,
  descent: 4,
  lineHeight: 20,
  ...overrides,
});

describe('text measurement utility', () => {
  it('measures across multiple runs', () => {
    const block = createBlock([
      { text: 'Hello', fontFamily: 'Arial', fontSize: 16 },
      { text: 'World', fontFamily: 'Arial', fontSize: 16 },
    ]);
    const line = baseLine({
      fromRun: 0,
      toRun: 1,
      toChar: 5,
    });

    expect(measureCharacterX(block, line, 5)).toBe(5 * CHAR_WIDTH);
    expect(measureCharacterX(block, line, 8)).toBe(8 * CHAR_WIDTH);
  });

  it('accounts for letter spacing when measuring', () => {
    const block = createBlock([{ text: 'AB', fontFamily: 'Arial', fontSize: 16, letterSpacing: 2 }]);
    const line = baseLine({
      fromRun: 0,
      toRun: 0,
      toChar: 2,
      width: CHAR_WIDTH * 2 + 2,
    });

    expect(measureCharacterX(block, line, 1)).toBe(CHAR_WIDTH + 2);
    expect(measureCharacterX(block, line, 2)).toBe(CHAR_WIDTH * 2 + 2);
  });

  it('maps X coordinates back to character offsets within runs', () => {
    const block = createBlock([
      { text: 'Hello', fontFamily: 'Arial', fontSize: 16 },
      { text: 'World', fontFamily: 'Arial', fontSize: 16 },
    ]);
    const line = baseLine({
      fromRun: 0,
      toRun: 1,
      toChar: 5,
    });

    const result = findCharacterAtX(block, line, 73, 0);
    expect(result.charOffset).toBe(7);
    expect(result.pmPosition).toBe(7);
  });

  it('preserves PM gaps between runs when mapping X to positions', () => {
    const block = createBlock([
      { text: 'Hello', fontFamily: 'Arial', fontSize: 16, pmStart: 2, pmEnd: 7 },
      { text: 'World', fontFamily: 'Arial', fontSize: 16, pmStart: 9, pmEnd: 14 },
    ]);
    const line = baseLine({
      fromRun: 0,
      toRun: 1,
      toChar: 5,
      width: 10 * CHAR_WIDTH,
    });

    const result = findCharacterAtX(block, line, 7 * CHAR_WIDTH, 2);
    expect(result.charOffset).toBe(7);
    expect(result.pmPosition).toBe(11);
  });

  it('respects letter spacing when mapping X to characters', () => {
    const block = createBlock([{ text: 'AB', fontFamily: 'Arial', fontSize: 16, letterSpacing: 2 }]);
    const line = baseLine({
      fromRun: 0,
      toRun: 0,
      toChar: 2,
      width: CHAR_WIDTH * 2 + 2,
    });

    const midGap = findCharacterAtX(block, line, CHAR_WIDTH + 1, 100);
    expect(midGap.charOffset).toBe(1);
    expect(midGap.pmPosition).toBe(101);

    const beyondEnd = findCharacterAtX(block, line, 1000, 100);
    expect(beyondEnd.charOffset).toBe(2);
    expect(beyondEnd.pmPosition).toBe(102);
  });

  it('handles tab runs with fixed width', () => {
    const block = createBlock([
      { text: 'Before', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 6 },
      { kind: 'tab', text: '\t', width: 48, pmStart: 6, pmEnd: 7 },
      { text: 'After', fontFamily: 'Arial', fontSize: 16, pmStart: 7, pmEnd: 12 },
    ]);
    const line = baseLine({
      fromRun: 0,
      toRun: 2,
      toChar: 5,
      width: 6 * CHAR_WIDTH + 48 + 5 * CHAR_WIDTH,
    });

    // Measure character positions
    // Before tab: positions 0-6
    expect(measureCharacterX(block, line, 6)).toBe(6 * CHAR_WIDTH);
    // At tab start (position 6 -> 7 in PM)
    expect(measureCharacterX(block, line, 7)).toBe(6 * CHAR_WIDTH + 48);
    // After tab
    expect(measureCharacterX(block, line, 8)).toBe(6 * CHAR_WIDTH + 48 + CHAR_WIDTH);
  });

  it('maps clicks on tabs to correct PM positions', () => {
    const block = createBlock([
      { text: 'A', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 1 },
      { kind: 'tab', text: '\t', width: 48, pmStart: 1, pmEnd: 2 },
      { text: 'B', fontFamily: 'Arial', fontSize: 16, pmStart: 2, pmEnd: 3 },
    ]);
    const line = baseLine({
      fromRun: 0,
      toRun: 2,
      toChar: 1,
      width: CHAR_WIDTH + 48 + CHAR_WIDTH,
    });

    // Click on left half of tab -> should return pmStart (before tab)
    const leftHalf = findCharacterAtX(block, line, CHAR_WIDTH + 20, 0);
    expect(leftHalf.pmPosition).toBe(1);

    // Click on right half of tab -> should return pmEnd (after tab)
    const rightHalf = findCharacterAtX(block, line, CHAR_WIDTH + 30, 0);
    expect(rightHalf.pmPosition).toBe(2);

    // Click after tab (in the 'B' character)
    const afterTab = findCharacterAtX(block, line, CHAR_WIDTH + 48 + 5, 0);
    expect(afterTab.pmPosition).toBeGreaterThanOrEqual(2);
    expect(afterTab.pmPosition).toBeLessThanOrEqual(3);
  });

  it('handles multiple consecutive tabs', () => {
    const block = createBlock([
      { text: 'A', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 1 },
      { kind: 'tab', text: '\t', width: 48, pmStart: 1, pmEnd: 2 },
      { kind: 'tab', text: '\t', width: 48, pmStart: 2, pmEnd: 3 },
      { text: 'B', fontFamily: 'Arial', fontSize: 16, pmStart: 3, pmEnd: 4 },
    ]);
    const line = baseLine({
      fromRun: 0,
      toRun: 3,
      toChar: 1,
      width: CHAR_WIDTH + 48 + 48 + CHAR_WIDTH,
    });

    // Position after first tab
    expect(measureCharacterX(block, line, 2)).toBe(CHAR_WIDTH + 48);
    // Position after second tab
    expect(measureCharacterX(block, line, 3)).toBe(CHAR_WIDTH + 48 + 48);

    // Click on first tab
    const firstTab = findCharacterAtX(block, line, CHAR_WIDTH + 24, 0);
    expect(firstTab.pmPosition).toBeGreaterThanOrEqual(1);
    expect(firstTab.pmPosition).toBeLessThanOrEqual(2);

    // Click on second tab
    const secondTab = findCharacterAtX(block, line, CHAR_WIDTH + 48 + 24, 0);
    expect(secondTab.pmPosition).toBeGreaterThanOrEqual(2);
    expect(secondTab.pmPosition).toBeLessThanOrEqual(3);
  });

  describe('charOffsetToPm edge cases', () => {
    it('clamps character offset beyond line bounds to end position', () => {
      const block = createBlock([{ text: 'Hello', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 5 }]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 5,
      });

      // Character offset beyond line length should clamp to last valid PM position
      const result = charOffsetToPm(block, line, 100, 0);
      expect(result).toBe(5); // Should return pmEnd
    });

    it('clamps negative character offset to start position', () => {
      const block = createBlock([{ text: 'Hello', fontFamily: 'Arial', fontSize: 16, pmStart: 10, pmEnd: 15 }]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 5,
      });

      // Negative offset should clamp to 0, which maps to pmStart
      const result = charOffsetToPm(block, line, -5, 10);
      expect(result).toBe(10); // Should return fallback/pmStart
    });

    it('handles runs with missing pmEnd gracefully', () => {
      const block = createBlock([
        { text: 'Test', fontFamily: 'Arial', fontSize: 16, pmStart: 5 } as any, // Missing pmEnd
      ]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 4,
      });

      // Should infer pmEnd from pmStart + text length
      const result = charOffsetToPm(block, line, 2, 5);
      expect(result).toBe(7); // pmStart (5) + offset (2)
    });

    it('handles runs with missing pmStart gracefully', () => {
      const block = createBlock([
        { text: 'Test', fontFamily: 'Arial', fontSize: 16, pmEnd: 10 } as any, // Missing pmStart
      ]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 4,
      });

      // When pmStart is missing, the function infers it from pmEnd - textLength
      // pmEnd = 10, textLength = 4, so inferred pmStart = 6
      // charOffset 2 maps to position 6 + 2 = 8
      const result = charOffsetToPm(block, line, 2, 100);
      expect(result).toBe(8); // inferred pmStart (6) + offset (2)
    });

    it('returns fallback position for non-paragraph blocks', () => {
      const block = {
        kind: 'table',
        id: 'test-block',
        rows: [],
      } as any;
      const line = baseLine();

      // Non-paragraph blocks should use fallback calculation
      const result = charOffsetToPm(block, line, 5, 50);
      expect(result).toBe(55); // fallback (50) + offset (5)
    });

    it('handles character offset at exact line boundary', () => {
      const block = createBlock([{ text: 'Exact', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 5 }]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 5,
      });

      // Offset exactly at line end
      const result = charOffsetToPm(block, line, 5, 0);
      expect(result).toBe(5);
    });

    it('handles line with only tab runs', () => {
      const block = createBlock([
        { kind: 'tab', text: '\t', width: 48, pmStart: 0, pmEnd: 1 },
        { kind: 'tab', text: '\t', width: 48, pmStart: 1, pmEnd: 2 },
      ]);
      const line = baseLine({
        fromRun: 0,
        toRun: 1,
        toChar: 1, // Each tab counts as 1 character
        width: 96,
      });

      // First tab
      const result1 = charOffsetToPm(block, line, 0, 0);
      expect(result1).toBe(0);

      // Second tab
      const result2 = charOffsetToPm(block, line, 1, 0);
      expect(result2).toBe(1);

      // After both tabs
      const result3 = charOffsetToPm(block, line, 2, 0);
      expect(result3).toBe(2);
    });

    it('handles empty runs in the middle of a line', () => {
      const block = createBlock([
        { text: 'Before', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 6 },
        { text: '', fontFamily: 'Arial', fontSize: 16, pmStart: 6, pmEnd: 6 }, // Empty run
        { text: 'After', fontFamily: 'Arial', fontSize: 16, pmStart: 6, pmEnd: 11 },
      ]);
      const line = baseLine({
        fromRun: 0,
        toRun: 2,
        toChar: 5,
      });

      // Character in first run
      const result1 = charOffsetToPm(block, line, 3, 0);
      expect(result1).toBe(3);

      // Character in last run (empty run shouldn't affect count)
      const result2 = charOffsetToPm(block, line, 8, 0);
      expect(result2).toBe(8);
    });

    it('handles runs with zero-length text correctly', () => {
      const block = createBlock([{ text: '', fontFamily: 'Arial', fontSize: 16, pmStart: 5, pmEnd: 5 }]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 0,
      });

      const result = charOffsetToPm(block, line, 0, 5);
      expect(result).toBe(5);
    });
  });

  describe('countSpaces helper', () => {
    // These tests verify the countSpaces helper used above
    it('counts regular spaces correctly', () => {
      expect(countSpaces('Hello World')).toBe(1);
      expect(countSpaces('A B C D')).toBe(3);
      expect(countSpaces('   ')).toBe(3);
    });

    it('counts non-breaking spaces correctly', () => {
      expect(countSpaces('Hello\u00A0World')).toBe(1);
      expect(countSpaces('\u00A0\u00A0\u00A0')).toBe(3);
    });

    it('counts both regular and non-breaking spaces', () => {
      expect(countSpaces('A \u00A0B')).toBe(2);
      expect(countSpaces(' \u00A0 \u00A0 ')).toBe(5);
    });

    it('returns zero for text with no spaces', () => {
      expect(countSpaces('HelloWorld')).toBe(0);
      expect(countSpaces('no-spaces')).toBe(0);
      expect(countSpaces('')).toBe(0);
    });

    it('does not count other whitespace characters', () => {
      // Tab, newline, etc. are not counted
      expect(countSpaces('Hello\tWorld')).toBe(0);
      expect(countSpaces('Hello\nWorld')).toBe(0);
    });
  });

  describe('justify alignment integration', () => {
    // These tests verify that justify alignment works correctly through the public API
    it('applies justify spacing for justified text', () => {
      const block = createBlock([{ text: 'A B', fontFamily: 'Arial', fontSize: 16 }]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 3,
        width: 30,
        maxWidth: 100,
      });
      (block as any).attrs = { alignment: 'justify' };

      // Measure position 2 (after the space 'A B') - this should show justify adjustment
      const x2Normal = measureCharacterX(block, line, 2, 30); // No slack
      const x2Justified = measureCharacterX(block, line, 2, 100); // With slack

      // Justified should be wider (extra space distributed after first space)
      expect(x2Justified).toBeGreaterThan(x2Normal);
    });

    it('does not apply justify spacing for non-justified text', () => {
      const block = createBlock([{ text: 'A B', fontFamily: 'Arial', fontSize: 16 }]);
      const line = baseLine({
        fromRun: 0,
        toRun: 0,
        toChar: 3,
        width: 30,
        maxWidth: 100,
      });
      (block as any).attrs = { alignment: 'left' };

      // With left alignment, no extra spacing should be applied
      const x2 = measureCharacterX(block, line, 2, 100);
      const x2Base = measureCharacterX(block, line, 2, 30);

      // Should be the same since no justify
      expect(x2).toBe(x2Base);
    });
  });
});
