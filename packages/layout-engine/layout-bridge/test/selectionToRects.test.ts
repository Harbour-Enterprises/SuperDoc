import { describe, it, expect } from 'vitest';
import { selectionToRects, getFragmentAtPosition } from '../src/index.ts';
import {
  simpleLayout,
  blocks,
  measures,
  multiLineLayout,
  multiBlocks,
  multiMeasures,
  columnsLayout,
  drawingLayout,
  drawingBlock,
  drawingMeasure,
} from './mock-data';

describe('selectionToRects', () => {
  it('returns rect for single-line range', () => {
    const rects = selectionToRects(simpleLayout, blocks, measures, 2, 10);
    expect(rects.length).toBe(1);
  });

  it('returns multiple rects for multi-line range', () => {
    const rects = selectionToRects(multiLineLayout, multiBlocks, multiMeasures, 2, 20);
    expect(rects.length).toBeGreaterThan(1);
  });

  it('returns rects in each column when selection spans columns', () => {
    const rects = selectionToRects(columnsLayout, blocks, measures, 2, 10);
    expect(rects.some((rect) => rect.x < 200)).toBe(true);
    expect(rects.some((rect) => rect.x > 200)).toBe(true);
  });

  it('returns rect for drawing fragments when selection covers node', () => {
    const rects = selectionToRects(drawingLayout, [drawingBlock], [drawingMeasure], 20, 21);
    expect(rects).toHaveLength(1);
    expect(rects[0].width).toBeCloseTo(60);
  });
});

describe('getFragmentAtPosition', () => {
  it('finds fragment covering position', () => {
    const hit = getFragmentAtPosition(simpleLayout, blocks, measures, 3);
    expect(hit?.fragment.blockId).toBe('0-paragraph');
  });

  it('returns drawing fragment for drawing positions', () => {
    const hit = getFragmentAtPosition(drawingLayout, [drawingBlock], [drawingMeasure], 20);
    expect(hit?.fragment.kind).toBe('drawing');
    expect(hit?.block.id).toBe('drawing-0');
  });
});
