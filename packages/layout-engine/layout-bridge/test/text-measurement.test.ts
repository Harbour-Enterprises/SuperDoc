import { beforeAll, describe, expect, it } from 'vitest';
import type { FlowBlock, Line, Run } from '@superdoc/contracts';
import { findCharacterAtX, measureCharacterX } from '../src/text-measurement.ts';

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
});
