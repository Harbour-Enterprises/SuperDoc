import { describe, it, expect } from 'vitest';
import { clickToPosition } from '../src/index.ts';
import {
  simpleLayout,
  blocks,
  measures,
  multiLineLayout,
  multiBlocks,
  multiMeasures,
  drawingLayout,
  drawingBlock,
  drawingMeasure,
} from './mock-data';

describe('clickToPosition', () => {
  it('maps point to PM position near start', () => {
    const result = clickToPosition(simpleLayout, blocks, measures, { x: 40, y: 60 });
    expect(result?.pos).toBeGreaterThanOrEqual(1);
    expect(result?.pos).toBeLessThan(5);
  });

  it('maps point to end of line when clicking near right edge', () => {
    const result = clickToPosition(simpleLayout, blocks, measures, { x: 320, y: 60 });
    expect(result?.pos).toBeGreaterThan(7);
  });

  it('handles multi-line layout', () => {
    const result = clickToPosition(multiLineLayout, multiBlocks, multiMeasures, { x: 50, y: 75 });
    expect(result?.pos).toBeGreaterThan(1);
    expect(result?.pos).toBeGreaterThan(9);
  });

  it('returns drawing position when clicking on drawing fragment', () => {
    const result = clickToPosition(drawingLayout, [drawingBlock], [drawingMeasure], { x: 70, y: 90 });
    expect(result?.blockId).toBe('drawing-0');
    expect(result?.pos).toBe(20);
  });
});
