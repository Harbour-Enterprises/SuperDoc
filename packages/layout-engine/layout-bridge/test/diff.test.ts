import { describe, it, expect } from 'vitest';
import type { VectorShapeDrawing } from '@superdoc/contracts';
import { computeDirtyRegions } from '../src/diff';

const block = (id: string, text: string) => ({
  kind: 'paragraph' as const,
  id,
  runs: [{ text, fontFamily: 'Arial', fontSize: 16 }],
});

const drawing = (overrides?: Partial<VectorShapeDrawing>): VectorShapeDrawing => ({
  kind: 'drawing',
  id: 'drawing-0',
  drawingKind: 'vectorShape',
  geometry: { width: 60, height: 40, rotation: 0, flipH: false, flipV: false },
  margin: undefined,
  padding: undefined,
  anchor: { isAnchored: true, hRelativeFrom: 'page', vRelativeFrom: 'page', offsetH: 10, offsetV: 20 },
  wrap: { type: 'Square', distTop: 4, distBottom: 4, distLeft: 4, distRight: 4 },
  zIndex: 1,
  drawingContentId: 'shape-1',
  attrs: { pmStart: 100, pmEnd: 101 },
  shapeKind: 'rect',
  fillColor: '#f00',
  strokeColor: '#000',
  strokeWidth: 2,
  ...overrides,
});

describe('computeDirtyRegions', () => {
  it('detects no changes', () => {
    const prev = [block('0-paragraph', 'Hello')];
    const next = [block('0-paragraph', 'Hello')];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(next.length);
    expect(result.deletedBlockIds).toHaveLength(0);
    expect(result.insertedBlockIds).toHaveLength(0);
  });

  it('detects changed block', () => {
    const prev = [block('0-paragraph', 'Hello'), block('10-paragraph', 'World')];
    const next = [block('0-paragraph', 'Hello'), block('10-paragraph', 'World!')];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(1);
    expect(result.lastStableIndex).toBe(0);
  });

  it('detects insertion', () => {
    const prev = [block('0-paragraph', 'Hello')];
    const next = [block('0-paragraph', 'Hello'), block('20-paragraph', 'New')];
    const result = computeDirtyRegions(prev, next);
    expect(result.insertedBlockIds).toContain('20-paragraph');
    expect(result.firstDirtyIndex).toBe(1);
  });

  it('detects deletion', () => {
    const prev = [block('0-paragraph', 'Hello'), block('20-paragraph', 'Remove me')];
    const next = [block('0-paragraph', 'Hello')];
    const result = computeDirtyRegions(prev, next);
    expect(result.deletedBlockIds).toContain('20-paragraph');
  });

  it('detects fontSize changes', () => {
    const prev = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontFamily: 'Arial', fontSize: 12 }],
      },
    ];
    const next = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontFamily: 'Arial', fontSize: 24 }],
      },
    ];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(0);
  });

  it('detects fontFamily changes', () => {
    const prev = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontFamily: 'Arial', fontSize: 12 }],
      },
    ];
    const next = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontFamily: 'Times New Roman', fontSize: 12 }],
      },
    ];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(0);
  });

  it('treats identical fontSize and fontFamily as stable', () => {
    const prev = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontFamily: 'Arial', fontSize: 14, bold: true }],
      },
    ];
    const next = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontFamily: 'Arial', fontSize: 14, bold: true }],
      },
    ];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(next.length);
  });

  it('detects fontSize change from undefined to defined', () => {
    const prev = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello' }],
      },
    ];
    const next = [
      {
        kind: 'paragraph' as const,
        id: '0-paragraph',
        runs: [{ text: 'Hello', fontSize: 16 }],
      },
    ];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(0);
  });

  it('treats unchanged drawing blocks as stable', () => {
    const prev = [drawing()];
    const next = [drawing()];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(next.length);
  });

  it('detects drawing geometry changes', () => {
    const prev = [drawing()];
    const next = [
      drawing({
        id: 'drawing-0',
        geometry: { width: 60, height: 40, rotation: 45, flipH: false, flipV: false },
      }),
    ];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(0);
  });

  it('detects drawing style changes', () => {
    const prev = [drawing()];
    const next = [
      drawing({
        id: 'drawing-0',
        fillColor: '#0f0',
      }),
    ];
    const result = computeDirtyRegions(prev, next);
    expect(result.firstDirtyIndex).toBe(0);
  });
});
