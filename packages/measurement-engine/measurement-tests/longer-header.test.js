// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMeasurementHarness } from './test-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPECTED_SNAPSHOT_PATH = path.resolve(__dirname, './longer-header.expected.json');

let harness;

beforeAll(async () => {
  harness = await createMeasurementHarness('longer-header.docx');
});

afterAll(() => {
  harness?.destroy();
});

describe('longer-header measurement regression', () => {
  it('records the trailing page break at the end of the document', () => {
    const { layout, docContentSize } = harness;
    expect(layout).toBeTruthy();
    const pages = Array.isArray(layout?.pages) ? layout.pages : [];
    expect(pages.length).toBeGreaterThanOrEqual(1);

    expect(docContentSize).toBeGreaterThan(0);

    const trailingPage = pages[pages.length - 1];
    expect(trailingPage.break?.pos).toBe(docContentSize);
    expect(trailingPage.break?.startOffsetPx).toBeGreaterThanOrEqual(0);
    expect(trailingPage.break?.fittedBottom).toBeGreaterThanOrEqual(trailingPage.break?.startOffsetPx ?? 0);
  });

  it('preserves the expected layout snapshot for the fixture', () => {
    const { layout } = harness;
    const expected = JSON.parse(readFileSync(EXPECTED_SNAPSHOT_PATH, 'utf8'));

    const actual = {
      units: layout.units,
      pages: layout.pages.map((page) => ({
        break: {
          startOffsetPx: page.break?.startOffsetPx ?? null,
          pos: page.break?.pos ?? null,
          top: page.break?.top ?? null,
          bottom: page.break?.bottom ?? null,
          fittedTop: page.break?.fittedTop ?? null,
          fittedBottom: page.break?.fittedBottom ?? null,
        },
        metrics: page.metrics ?? null,
        pageBottomSpacingPx: page.pageBottomSpacingPx ?? null,
        header: page.headerFooterAreas?.header
          ? {
              heightPx: page.headerFooterAreas.header.heightPx ?? null,
              metrics: page.headerFooterAreas.header.metrics ?? null,
            }
          : null,
        footer: page.headerFooterAreas?.footer
          ? {
              heightPx: page.headerFooterAreas.footer.heightPx ?? null,
              metrics: page.headerFooterAreas.footer.metrics ?? null,
            }
          : null,
      })),
    };

    expect(actual).toEqual(expected);
  });
});
