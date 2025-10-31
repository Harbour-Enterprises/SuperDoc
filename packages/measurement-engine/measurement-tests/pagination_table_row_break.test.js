// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMeasurementHarness, tableRowMeasurementDomPatch } from './test-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPECTED_SNAPSHOT_PATH = path.resolve(__dirname, './pagination_table_row_break.expected.json');

let harness;
let layout;

beforeAll(async () => {
  harness = await createMeasurementHarness('pagination_table_row_break.docx', {
    patchDom: tableRowMeasurementDomPatch,
  });

  layout = harness.layout;
});

afterAll(() => {
  harness?.destroy();
});

describe('pagination_table_row_break fixture', () => {
  it('places the page break after the sixth table row', () => {
    expect(Array.isArray(layout.pages)).toBe(true);
    expect(layout.pages.length).toBeGreaterThan(0);

    const firstPage = layout.pages[0];
    expect(firstPage.break?.pos).toBe(2791); // Updated to match new precise break position
    expect(firstPage.break?.pos).toBeLessThan(harness.editor.state.doc.content.size);
  });

  it('matches the expected layout snapshot for the fixture', () => {
    const expected = JSON.parse(readFileSync(EXPECTED_SNAPSHOT_PATH, 'utf8'));
    const pages = Array.isArray(layout?.pages) ? layout.pages : [];

    const actual = {
      units: layout?.units ?? null,
      pages: pages.map((page) => ({
        pageIndex: page.pageIndex ?? null,
        pageTopOffsetPx: page.pageTopOffsetPx ?? null,
        pageGapPx: page.pageGapPx ?? null,
        pageBottomSpacingPx: page.pageBottomSpacingPx ?? null,
        break: {
          startOffsetPx: page.break?.startOffsetPx ?? null,
          pos: page.break?.pos ?? null,
          top: page.break?.top ?? null,
          bottom: page.break?.bottom ?? null,
          fittedTop: page.break?.fittedTop ?? null,
          fittedBottom: page.break?.fittedBottom ?? null,
        },
        metrics: page.metrics ?? null,
        headerFooterAreas: page.headerFooterAreas
          ? {
              header: page.headerFooterAreas.header
                ? {
                    heightPx: page.headerFooterAreas.header.heightPx ?? null,
                    metrics: page.headerFooterAreas.header.metrics ?? null,
                  }
                : null,
              footer: page.headerFooterAreas.footer
                ? {
                    heightPx: page.headerFooterAreas.footer.heightPx ?? null,
                    metrics: page.headerFooterAreas.footer.metrics ?? null,
                  }
                : null,
            }
          : null,
      })),
    };

    expect(actual).toEqual(expected);
  });
});
