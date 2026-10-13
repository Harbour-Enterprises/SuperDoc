import { describe, expect, it } from 'vite-plus/test';
import type { TableBlock, TableFragment, TableMeasure } from '@superdoc/contracts';
import {
  derivePmInteriorVersion,
  deriveTableFragmentPaintVersion,
  deriveTableFragmentPmInteriorVersion,
} from './versionSignature.js';
import { planPmReuse } from '../../painters/dom/src/page-content.js';

function fixture(interiorShift: number, uniformShift = 0) {
  const block: TableBlock = {
    kind: 'table',
    id: 'merged-pm-table',
    columnWidths: [100, 100],
    rows: [
      {
        id: 'origin-row',
        cells: [
          {
            id: 'merged-source',
            rowSpan: 3,
            blocks: [
              {
                kind: 'paragraph',
                id: 'merged-paragraph',
                runs: [
                  {
                    text: 'A',
                    fontFamily: 'Arial',
                    fontSize: 12,
                    pmStart: 10 + uniformShift,
                    pmEnd: 11 + uniformShift,
                  },
                  {
                    text: 'B',
                    fontFamily: 'Arial',
                    fontSize: 12,
                    pmStart: 14 + interiorShift + uniformShift,
                    pmEnd: 15 + interiorShift + uniformShift,
                  },
                  {
                    text: 'C',
                    fontFamily: 'Arial',
                    fontSize: 12,
                    pmStart: 18 + uniformShift,
                    pmEnd: 19 + uniformShift,
                  },
                ],
              },
            ],
          },
        ],
      },
      ...[40, 60].map((pmStart, index) => ({
        id: `body-row-${index}`,
        cells: [
          {
            id: `body-cell-${index}`,
            blocks: [
              {
                kind: 'paragraph' as const,
                id: `body-paragraph-${index}`,
                runs: [
                  {
                    text: 'N',
                    fontFamily: 'Arial',
                    fontSize: 12,
                    pmStart: pmStart + uniformShift,
                    pmEnd: pmStart + 1 + uniformShift,
                  },
                ],
              },
            ],
          },
        ],
      })),
    ],
  };
  const fragment: TableFragment = {
    kind: 'table',
    blockId: block.id,
    fromRow: 1,
    toRow: 3,
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    continuesFromPrev: true,
    pmStart: 10 + uniformShift,
    pmEnd: 61 + uniformShift,
    mergedCellContent: [{ rowIndex: 0, cellIndex: 0, fromLine: 1, toLine: 3 }],
  };
  const measure: TableMeasure = {
    kind: 'table',
    columnWidths: [100, 100],
    totalWidth: 200,
    totalHeight: 180,
    rows: [
      { height: 60, cells: [{ width: 100, height: 180, gridColumnStart: 0, rowSpan: 3 }] },
      { height: 60, cells: [{ width: 100, height: 60, gridColumnStart: 1 }] },
      { height: 60, cells: [{ width: 100, height: 60, gridColumnStart: 1 }] },
    ],
  };
  return {
    fragment,
    paint: deriveTableFragmentPaintVersion(fragment, block, measure),
    interior: deriveTableFragmentPmInteriorVersion(block, fragment),
    sourceInterior: derivePmInteriorVersion(block),
  };
}

describe('merged continuation PM reuse', () => {
  it('preserves valid uniform PM shifts across the source and body', () => {
    const before = fixture(0);
    const after = fixture(0, 5);
    expect(after.paint).toBe(before.paint);
    expect(
      planPmReuse(
        { fragment: before.fragment, pmInteriorVersion: before.interior, hasPmDescendants: true },
        after.fragment,
        after.interior,
      ),
    ).toEqual({ kind: 'shift', deltaPm: 5 });
  });

  it('rebuilds when continued merged source positions redistribute inside an unchanged fragment span', () => {
    const before = fixture(0);
    const after = fixture(1);
    expect(after.paint).toBe(before.paint);
    expect(after.sourceInterior).not.toBe(before.sourceInterior);
    expect(after.fragment.pmStart).toBe(before.fragment.pmStart);
    expect(after.fragment.pmEnd).toBe(before.fragment.pmEnd);
    const decision = planPmReuse(
      { fragment: before.fragment, pmInteriorVersion: before.interior, hasPmDescendants: true },
      after.fragment,
      after.interior,
    );
    console.info(
      JSON.stringify({
        beforeInterior: before.interior,
        afterInterior: after.interior,
        sourceBefore: before.sourceInterior,
        sourceAfter: after.sourceInterior,
        decision,
      }),
    );
    expect(decision).toEqual({ kind: 'rebuild' });
    expect(after.interior).not.toBe(before.interior);
  });
});
