import { expect, it } from 'bun:test';
import type { ParagraphBlock, ParagraphMeasure, TableBlock, TableMeasure } from '@superdoc/contracts';
import { layoutTableBlock } from './layout-table.js';
import type { PageState } from './paginator.js';

function paragraph(id: string, height: number): [ParagraphBlock, ParagraphMeasure] {
  return [
    { kind: 'paragraph', id, runs: [{ text: id, fontFamily: 'Arial', fontSize: 12 }] },
    {
      kind: 'paragraph',
      totalHeight: height,
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: id.length,
          width: 50,
          maxWidth: 100,
          ascent: height - 4,
          descent: 4,
          lineHeight: height,
        },
      ],
    },
  ];
}

for (const tailHeight of [117, 200])
  it(`finishes a ${tailHeight}px merged tail using the existing oversized-segment progress policy`, () => {
    const [lead, leadMeasure] = paragraph('lead', 18);
    const [tail, tailMeasure] = paragraph('tail', tailHeight);
    const [neighbor, neighborMeasure] = paragraph('neighbor', 18);
    const block: TableBlock = {
      kind: 'table',
      id: 'oversized-merged',
      columnWidths: [100, 100],
      rows: Array.from({ length: 3 }, (_, row) => ({
        id: `row-${row}`,
        cells: [
          ...(row === 0
            ? [{ id: 'source', rowSpan: 3, attrs: { padding: { top: 8, bottom: 8 } }, blocks: [lead, tail] }]
            : []),
          { id: `neighbor-${row}`, blocks: [neighbor] },
        ],
      })),
    };
    const measure: TableMeasure = {
      kind: 'table',
      columnWidths: [100, 100],
      totalWidth: 200,
      totalHeight: 240,
      rows: block.rows.map((row, index) => ({
        height: 80,
        cells: row.cells.map((_, cellIndex) => ({
          width: 100,
          height: index === 0 && cellIndex === 0 ? 18 + tailHeight + 16 : 80,
          gridColumnStart: index === 0 ? cellIndex : 1,
          rowSpan: index === 0 && cellIndex === 0 ? 3 : 1,
          blocks: index === 0 && cellIndex === 0 ? [leadMeasure, tailMeasure] : [neighborMeasure],
        })),
      })),
    };
    const states: PageState[] = [];
    function freshPage(): PageState {
      const page: PageState = {
        page: { number: states.length + 1, fragments: [] },
        cursorY: 0,
        columnIndex: 0,
        topMargin: 0,
        contentBottom: 120,
        constraintBoundaries: [],
        activeConstraintIndex: -1,
        trailingSpacing: 0,
        lastParagraphContextualSpacing: false,
        maxCursorY: 0,
        pageFootnoteReserve: 0,
        footnoteDemandThisPage: 0,
        footnoteRefsThisPage: 0,
        footnoteAnchorsThisPage: [],
      };
      states.push(page);
      return page;
    }
    let current = freshPage();
    current.cursorY = 40;
    current.page.fragments.push({
      kind: 'para',
      blockId: 'filler',
      fromLine: 0,
      toLine: 1,
      x: 0,
      y: 0,
      width: 200,
      height: 40,
    });
    const run = () =>
      layoutTableBlock({
        block,
        measure,
        columnWidth: 200,
        columnX: () => 0,
        ensurePage: () => current,
        advanceColumn: () => {
          if (states.length >= 8) {
            throw new Error('merged tail made no progress across eight pages');
          }
          current = freshPage();
          return current;
        },
      });
    expect(run).not.toThrow();
    const slices = states
      .flatMap((state) => state.page.fragments)
      .flatMap((fragment) => (fragment.kind === 'table' ? (fragment.mergedCellContent ?? []) : []));
    expect(slices.at(-1)?.toLine).toBe(2);
  });
