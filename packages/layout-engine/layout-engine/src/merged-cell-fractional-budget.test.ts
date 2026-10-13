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

describe('fractional merged-cell continuation budgets', () => {
  it('keeps the final line when twip padding rounds the reserved row budget down', () => {
    const [merged, mergedMeasure] = paragraph('merged', 9, 14);
    const [neighbor, neighborMeasure] = paragraph('neighbor', 1, 14);
    const block: TableBlock = {
      kind: 'table',
      id: 'table',
      columnWidths: [100, 100],
      rows: Array.from({ length: 2 }, (_, row) => ({
        id: `row-${row}`,
        attrs: { tableRowProperties: { cantSplit: true } },
        cells: [
          ...(row === 0
            ? [
                {
                  id: 'merged-cell',
                  rowSpan: 2,
                  attrs: { padding: { top: 58 / 15, bottom: 58 / 15 } },
                  blocks: [merged],
                },
              ]
            : []),
          { id: `neighbor-${row}`, blocks: [neighbor] },
        ],
      })),
    };
    const measure: TableMeasure = {
      kind: 'table',
      columnWidths: [100, 100],
      totalWidth: 200,
      totalHeight: 198.4,
      rows: block.rows.map((row, index) => ({
        height: index === 0 ? 67.26666666666667 : 64.53333333333333,
        cells: row.cells.map((_, cellIndex) => ({
          width: 100,
          height: index === 0 && cellIndex === 0 ? 133.86666666666667 : 64.53333333333333,
          gridColumnStart: index === 0 ? cellIndex : 1,
          rowSpan: index === 0 && cellIndex === 0 ? 2 : 1,
          blocks: [index === 0 && cellIndex === 0 ? mergedMeasure : neighborMeasure],
        })),
      })),
    };
    const [filler, fillerMeasure] = paragraph('filler', 1, 92.7);
    const blocks: FlowBlock[] = [filler, block];
    const measures: Measure[] = [fillerMeasure, measure];
    const layout = layoutDocument(blocks, measures, {
      pageSize: { w: 300, h: 200 },
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
    const fragments = layout.pages.flatMap((page) => page.fragments).filter((fragment) => fragment.kind === 'table');
    const slices = fragments.flatMap((fragment) => fragment.mergedCellContent ?? []);
    expect(slices[0].fromLine).toBe(0);
    expect(slices.at(-1)?.toLine).toBe(9);
    expect(slices.slice(1).every((slice, index) => slice.fromLine === slices[index].toLine)).toBe(true);
  });
});
