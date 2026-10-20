import { describe, expect, it } from 'vite-plus/test';
import type { BlockId, Layout, Measure, ParagraphBlock, TableBlock, TableMeasure } from '@superdoc/contracts';
import { resolveLayout } from '@superdoc/layout-resolved';
import { createDomPainter, type DomPainterOptions } from './index.js';
import { paintResolvedLayoutPersistent } from './_test-utils.js';

const PAGE = { w: 400, h: 500 };
const ROWS = 4;

function paragraph(id: string, text: string, pmStart: number): ParagraphBlock {
  return Object.freeze({
    kind: 'paragraph',
    id: id as BlockId,
    runs: Object.freeze([
      Object.freeze({ kind: 'text', text, fontFamily: 'Arial', fontSize: 12, pmStart, pmEnd: pmStart + text.length }),
    ]),
  }) as unknown as ParagraphBlock;
}

function paragraphMeasure(length: number): Measure {
  return {
    kind: 'paragraph',
    lines: [{ fromRun: 0, fromChar: 0, toRun: 0, toChar: length, width: 120, ascent: 8, descent: 2, lineHeight: 10 }],
    totalHeight: 10,
  } as unknown as Measure;
}

function table(texts: string[]): { block: TableBlock; measure: TableMeasure } {
  let pm = 0;
  const rows = texts.map((text, index) => {
    const pmStart = pm;
    pm += text.length + 1;
    return Object.freeze({
      id: `row-${index}` as BlockId,
      cells: Object.freeze([
        Object.freeze({
          id: `cell-${index}` as BlockId,
          blocks: Object.freeze([paragraph(`paragraph-${index}`, text, pmStart)]),
        }),
      ]),
    });
  });
  const block = Object.freeze({
    kind: 'table',
    id: 'table' as BlockId,
    rows: Object.freeze(rows),
    columnWidths: Object.freeze([320]),
  }) as unknown as TableBlock;
  const measure: TableMeasure = {
    kind: 'table',
    columnWidths: [320],
    totalWidth: 320,
    totalHeight: 20 * texts.length,
    rows: texts.map((text) => ({
      height: 20,
      cells: [{ width: 320, height: 20, gridColumnStart: 0, blocks: [paragraphMeasure(text.length)] }],
    })),
  };
  return { block, measure };
}

/** The table after editing one row: unchanged rows keep their cell objects, later rows carry fresh pm clones. */
function editedTable(previous: { block: TableBlock; measure: TableMeasure }, row: number, text: string) {
  const texts = previous.block.rows.map((candidate, index) =>
    index === row ? text : ((candidate.cells[0]!.blocks![0] as ParagraphBlock).runs[0] as { text: string }).text,
  );
  const fresh = table(texts);
  const rows = fresh.block.rows.map((freshRow, index) => (index < row ? previous.block.rows[index]! : freshRow));
  const block = Object.freeze({ ...fresh.block, rows: Object.freeze(rows) }) as unknown as TableBlock;
  const measure: TableMeasure = {
    ...fresh.measure,
    rows: fresh.measure.rows.map((freshRow, index) => (index === row ? freshRow : previous.measure.rows[index]!)),
  };
  // Source identity: every row except the edited one maps to the previous row's cell.
  const source = Object.freeze({
    ...fresh.block,
    rows: Object.freeze(
      fresh.block.rows.map((freshRow, index) => (index === row ? freshRow : previous.block.rows[index]!)),
    ),
  }) as unknown as TableBlock;
  return { block, measure, source };
}

function resolved(block: TableBlock, measure: TableMeasure, pmEnd: number) {
  const layout: Layout = {
    pageSize: PAGE,
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'table',
            blockId: block.id,
            fromRow: 0,
            toRow: ROWS,
            x: 20,
            y: 30,
            width: 320,
            height: 20 * ROWS,
            pmStart: 0,
            pmEnd,
          },
        ],
      },
    ],
  };
  return resolveLayout({ layout, flowMode: 'paginated', blocks: [block], measures: [measure] });
}

function normalized(root: HTMLElement): string {
  return root.innerHTML.replace(/ data-layout-epoch="\d+"/g, '').replace(/ data-v2-scaffold-epoch="\d+"/g, '');
}

describe('DomPainter in-place table patching', () => {
  it('keeps the table fragment and unchanged cells across a one-cell edit and matches a cold paint', () => {
    const first = table(['Alpha', 'Beta', 'Gamma', 'Delta']);
    const second = editedTable(first, 1, 'Beta edited');
    const sources = new WeakMap<TableBlock, TableBlock>([
      [first.block, first.block],
      [second.block, second.source],
    ]);
    const options: DomPainterOptions = {
      paintWorkAttribution: true,
      tableCellSourceIdentity: (candidate, row, column) =>
        (sources.get(candidate) ?? candidate).rows[row]?.cells[column] ?? null,
    };
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const painter = createDomPainter(options);
    try {
      paintResolvedLayoutPersistent(painter, resolved(first.block, first.measure, 23), mount);
      const fragmentBefore = mount.querySelector<HTMLElement>('[data-block-id="table"]')!;
      const cellsBefore = Array.from(fragmentBefore.children);
      expect(cellsBefore).toHaveLength(ROWS);
      painter.consumePaintWorkSummary();

      paintResolvedLayoutPersistent(painter, resolved(second.block, second.measure, 30), mount);
      const work = painter.consumePaintWorkSummary();
      expect(work.fragmentsPatchedInPlace).toBe(1);
      expect(work.tableCellsRendered).toBe(1);
      expect(work.tableCellsReused).toBe(ROWS - 1);
      expect(work.fragmentsRendered).toBe(0);
      const fragmentAfter = mount.querySelector<HTMLElement>('[data-block-id="table"]')!;
      expect(fragmentAfter).toBe(fragmentBefore);
      const cellsAfter = Array.from(fragmentAfter.children);
      cellsAfter.forEach((cell, index) => {
        if (index === 1) expect(cell).not.toBe(cellsBefore[index]);
        else expect(cell).toBe(cellsBefore[index]);
      });
      expect(fragmentAfter.textContent).toContain('Beta edited');

      const oracleMount = document.createElement('div');
      document.body.appendChild(oracleMount);
      const oracle = createDomPainter(options);
      try {
        paintResolvedLayoutPersistent(oracle, resolved(second.block, second.measure, 30), oracleMount);
        expect(normalized(mount)).toBe(normalized(oracleMount));
      } finally {
        oracle.dispose();
        oracleMount.remove();
      }
    } finally {
      painter.dispose();
      mount.remove();
    }
  });

  it('rebuilds the fragment when a row height changes', () => {
    const first = table(['Alpha', 'Beta', 'Gamma', 'Delta']);
    const second = editedTable(first, 1, 'Beta grows');
    second.measure.rows[1] = { ...second.measure.rows[1]!, height: 40 };
    second.measure.totalHeight += 20;
    const sources = new WeakMap<TableBlock, TableBlock>([
      [first.block, first.block],
      [second.block, second.source],
    ]);
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const painter = createDomPainter({
      paintWorkAttribution: true,
      tableCellSourceIdentity: (candidate, row, column) =>
        (sources.get(candidate) ?? candidate).rows[row]?.cells[column] ?? null,
    });
    try {
      paintResolvedLayoutPersistent(painter, resolved(first.block, first.measure, 23), mount);
      const fragmentBefore = mount.querySelector<HTMLElement>('[data-block-id="table"]')!;
      painter.consumePaintWorkSummary();
      paintResolvedLayoutPersistent(painter, resolved(second.block, second.measure, 29), mount);
      const work = painter.consumePaintWorkSummary();
      expect(work.fragmentsPatchedInPlace).toBe(0);
      expect(work.fragmentsRendered).toBe(1);
      expect(mount.querySelector<HTMLElement>('[data-block-id="table"]')).not.toBe(fragmentBefore);
    } finally {
      painter.dispose();
      mount.remove();
    }
  });
});
