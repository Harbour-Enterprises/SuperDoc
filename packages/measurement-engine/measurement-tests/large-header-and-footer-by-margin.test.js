// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMeasurementHarness } from './test-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPECTED_SNAPSHOT_PATH = path.resolve(__dirname, './large-header-and-footer-by-margin.expected.json');

let harness;

beforeAll(async () => {
  harness = await createMeasurementHarness('large-header-and-footer-by-margin.docx');
});

afterAll(() => {
  harness?.destroy();
});

describe('large header/footer by margin regression', () => {
  it('respects header/footer offsets injected through margins', () => {
    const { layout, docContentSize } = harness;
    expect(Array.isArray(layout?.pages)).toBe(true);
    expect(layout.pages.length).toBeGreaterThan(0);
    expect(docContentSize).toBeGreaterThan(0);

    const firstPage = layout.pages[0];
    expect(firstPage.headerFooterAreas?.header?.metrics?.offsetPx).toBeGreaterThan(0);
    expect(firstPage.headerFooterAreas?.footer?.metrics?.offsetPx).toBeGreaterThan(0);
    expect(firstPage.break?.pos).toBe(docContentSize);
  });

  it('matches the expected pagination snapshot', () => {
    const { layout } = harness;
    const actual = {
      units: layout.units,
      pages: layout.pages.map((page) => ({
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
      fieldSegments: Array.isArray(layout.fieldSegments)
        ? layout.fieldSegments.map((field) => ({
            pos: field.pos ?? null,
            attrs: field.attrs ?? null,
            rect: field.rect ?? null,
            segments: Array.isArray(field.segments)
              ? field.segments.map((segment) => ({
                  pageIndex: segment.pageIndex ?? null,
                  topPx: segment.topPx ?? null,
                  heightPx: segment.heightPx ?? null,
                  offsetWithinFieldPx: segment.offsetWithinFieldPx ?? null,
                }))
              : [],
          }))
        : [],
    };

    if (!existsSync(EXPECTED_SNAPSHOT_PATH)) {
      // eslint-disable-next-line no-console
      console.log('[large-header-footer-regression] snapshot', JSON.stringify(actual, null, 2));
      throw new Error(
        `Missing expected snapshot for large-header-and-footer-by-margin at ${EXPECTED_SNAPSHOT_PATH}. Snapshot emitted to console.`,
      );
    }

    const expected = JSON.parse(readFileSync(EXPECTED_SNAPSHOT_PATH, 'utf8'));
    expect(actual).toEqual(expected);
  });
});
