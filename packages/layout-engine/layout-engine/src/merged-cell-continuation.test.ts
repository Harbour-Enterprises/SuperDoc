import { describe, expect, it } from 'bun:test';
import type {
  FlowBlock,
  Measure,
  ParagraphBlock,
  ParagraphMeasure,
  TableBlock,
  TableMeasure,
} from '@superdoc/contracts';
import { layoutDocument } from './index.js';

function paragraph(id: string, lines: number, height: number): [ParagraphBlock, ParagraphMeasure] {
  return [
    { kind: 'paragraph', id, runs: [{ text: id, fontFamily: 'Arial', fontSize: 12 }] },
    {
      kind: 'paragraph',
      totalHeight: lines * height,
      lines: Array.from({ length: lines }, () => ({
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: id.length,
        width: 50,
        maxWidth: 100,
        ascent: height - 4,
        descent: 4,
        lineHeight: height,
      })),
    },
  ];
}

describe('merged-cell content across page fragments', () => {
  it('carries whole lines and reserves the tail without mutating the original measure', () => {
    const [merged, mergedMeasure] = paragraph('merged', 9, 18);
    const [neighbor, neighborMeasure] = paragraph('neighbor', 1, 18);
    const block: TableBlock = {
      kind: 'table',
      id: 'table',
      columnWidths: [100, 100],
      rows: Array.from({ length: 3 }, (_, row) => ({
        id: `row-${row}`,
        attrs: { tableRowProperties: { cantSplit: true } },
        cells: [
          ...(row === 0
            ? [{ id: 'merged-cell', rowSpan: 3, attrs: { padding: { top: 8, bottom: 8 } }, blocks: [merged] }]
            : []),
          { id: `neighbor-${row}`, blocks: [neighbor] },
        ],
      })),
    };
    const measure: TableMeasure = {
      kind: 'table',
      columnWidths: [100, 100],
      totalWidth: 200,
      totalHeight: 180,
      rows: block.rows.map((row, index) => ({
        height: 60,
        cells: row.cells.map((_, cellIndex) => ({
          width: 100,
          height: index === 0 && cellIndex === 0 ? 180 : 60,
          gridColumnStart: index === 0 ? cellIndex : 1,
          rowSpan: index === 0 && cellIndex === 0 ? 3 : 1,
          blocks: [index === 0 && cellIndex === 0 ? mergedMeasure : neighborMeasure],
        })),
      })),
    };
    const [filler, fillerMeasure] = paragraph('filler', 1, 100);
    const blocks: FlowBlock[] = [filler, block];
    const measures: Measure[] = [fillerMeasure, measure];
    const layout = layoutDocument(blocks, measures, {
      pageSize: { w: 300, h: 200 },
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
    const fragments = layout.pages.flatMap((page) => page.fragments).filter((fragment) => fragment.kind === 'table');
    const slices = fragments.flatMap((fragment) => fragment.mergedCellContent ?? []);
    expect(slices.map((slice) => [slice.fromLine, slice.toLine])).toEqual([
      [0, 2],
      [2, 9],
    ]);
    expect(fragments[1].rowHeightOverrides?.[2]).toBe(82);
    expect(fragments[1].height).toBe(142);
    expect(measure.rows.map((row) => row.height)).toEqual([60, 60, 60]);
    const lastBoundary = fragments[1].metadata?.rowBoundaries?.at(-1);
    expect(lastBoundary!.y + lastBoundary!.height).toBe(142);
  });
  it('keeps a partial final row pending until the merged tail is exhausted', () => {
    const [merged, mergedMeasure] = paragraph('merged', 9, 18);
    const [neighbor, neighborMeasure] = paragraph('neighbor', 1, 18);
    const block: TableBlock = {
      kind: 'table',
      id: 'table',
      columnWidths: [100, 100],
      rows: Array.from({ length: 3 }, (_, row) => ({
        id: `row-${row}`,
        attrs: { tableRowProperties: { cantSplit: false } },
        cells: [
          ...(row === 0
            ? [{ id: 'merged-cell', rowSpan: 3, attrs: { padding: { top: 8, bottom: 8 } }, blocks: [merged] }]
            : []),
          { id: `neighbor-${row}`, blocks: [neighbor] },
        ],
      })),
    };
    const measure: TableMeasure = {
      kind: 'table',
      columnWidths: [100, 100],
      totalWidth: 200,
      totalHeight: 180,
      rows: block.rows.map((row, index) => ({
        height: 60,
        cells: row.cells.map((_, cellIndex) => ({
          width: 100,
          height: index === 0 && cellIndex === 0 ? 180 : 60,
          gridColumnStart: index === 0 ? cellIndex : 1,
          rowSpan: index === 0 && cellIndex === 0 ? 3 : 1,
          blocks: [index === 0 && cellIndex === 0 ? mergedMeasure : neighborMeasure],
        })),
      })),
    };
    const [filler, fillerMeasure] = paragraph('filler', 1, 60);
    const blocks: FlowBlock[] = [filler, block];
    const measures: Measure[] = [fillerMeasure, measure];
    const layout = layoutDocument(blocks, measures, {
      pageSize: { w: 300, h: 160 },
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
    const fragments = layout.pages.flatMap((page) => page.fragments).filter((fragment) => fragment.kind === 'table');
    const slices = fragments.flatMap((fragment) => fragment.mergedCellContent ?? []);
    expect(slices[0].fromLine).toBe(0);
    expect(slices.at(-1)?.toLine).toBe(9);
    expect(slices.slice(1).every((slice, index) => slice.fromLine === slices[index].toLine)).toBe(true);
    expect(fragments.every((fragment) => fragment.height <= 120)).toBe(true);
  });
});
