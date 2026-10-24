import { describe, expect, it } from 'vite-plus/test';
import type { Line, ParagraphBlock, Run, TextRun } from '@superdoc/contracts';
import { getJustifyAdjustment } from '../src/line-justify-adjustment.js';

const marker = (text = '\u200b'): TextRun => ({
  kind: 'text',
  text,
  fontFamily: 'Arial',
  fontSize: 16,
  dataAttrs: { 'data-bookmark-marker': 'end' },
});
const text = (value: string): TextRun => ({ kind: 'text', text: value, fontFamily: 'Arial', fontSize: 16 });
const line = (overrides: Partial<Line> = {}): Line => ({
  fromRun: 0,
  fromChar: 0,
  toRun: 0,
  toChar: 5,
  width: 50,
  maxWidth: 100,
  ascent: 12,
  descent: 4,
  lineHeight: 20,
  spaceCount: 1,
  ...overrides,
});
const paragraph = (runs: Run[]): ParagraphBlock => ({
  kind: 'paragraph',
  id: 'bookmark-justify',
  attrs: { alignment: 'justify' },
  runs,
});

describe('bookmark markers and final-line justification', () => {
  it.each([
    { name: 'one projected marker', tail: [marker()] },
    { name: 'multiple projected markers', tail: [marker(), marker()] },
    { name: 'a normalized marker', tail: [marker('')] },
  ])('keeps the final painted line natural before $name', ({ tail }) => {
    expect(getJustifyAdjustment({ block: paragraph([text('aa bb'), ...tail]), line: line() }).extraPerSpace).toBe(0);
  });

  it('still stretches an earlier line in a bookmarked paragraph', () => {
    const block = paragraph([text('aa bb cc dd'), marker()]);
    expect(getJustifyAdjustment({ block, line: line() }).extraPerSpace).toBe(50);
  });

  it('retains genuine text after a bookmark as paragraph content', () => {
    const block = paragraph([text('aa bb'), marker(), text('cc dd')]);
    expect(getJustifyAdjustment({ block, line: line() }).extraPerSpace).toBe(50);
  });

  it('retains terminal soft-break justification before bookmark markers', () => {
    const block = paragraph([text('aa bb'), { kind: 'lineBreak' }, marker()]);
    expect(getJustifyAdjustment({ block, line: line({ toRun: 1, toChar: 0 }) }).extraPerSpace).toBe(50);
  });
});
