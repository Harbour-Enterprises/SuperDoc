// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMeasurementHarness } from './test-harness.js';

let harness;
let paragraphMeta;
let hardBreakMeta;

beforeAll(async () => {
  harness = await createMeasurementHarness('pagination_section_break.docx');

  paragraphMeta = [];
  hardBreakMeta = [];

  harness.editor.state.doc.descendants((node, pos) => {
    if (node.type?.name === 'paragraph') {
      paragraphMeta.push({
        index: paragraphMeta.length,
        pos,
        end: pos + node.nodeSize,
        nodeSize: node.nodeSize,
        pageBreakSource: node.attrs?.pageBreakSource ?? null,
        text: node.textContent,
      });
    }
    if (node.type?.name === 'hardBreak') {
      hardBreakMeta.push({
        pos,
        nodeSize: node.nodeSize,
        parentIndex: paragraphMeta.length - 1,
        lineBreakType: node.attrs?.lineBreakType ?? node.attrs?.pageBreakType ?? null,
      });
    }
  });
});

afterAll(() => {
  harness?.destroy();
});

describe('pagination_section_break fixture', () => {
  it('imports the section break marker alongside the manual page break paragraph', () => {
    expect(paragraphMeta.map(({ text }) => text)).toEqual([
      'Page one content.',
      '',
      '',
      'This is a new section with changed formatting.',
    ]);
    expect(paragraphMeta.map(({ pageBreakSource }) => pageBreakSource)).toEqual([null, null, 'sectPr', null]);

    expect(hardBreakMeta).toHaveLength(1);
    expect(hardBreakMeta[0]).toEqual(
      expect.objectContaining({
        parentIndex: 1,
        lineBreakType: 'page',
      }),
    );
  });

  it('keeps the section break paragraph on page 1 so page 2 starts with body content', () => {
    const { layout } = harness;
    expect(Array.isArray(layout.pages)).toBe(true);
    expect(layout.pages).toHaveLength(2);

    const [firstPage, secondPage] = layout.pages;
    const sectionBreakEnd = paragraphMeta[2].end;
    const documentEnd = paragraphMeta[3].end;

    expect(firstPage.break?.pos).toBe(sectionBreakEnd);
    expect(firstPage.break?.pos).toBeGreaterThan(paragraphMeta[1].end);

    expect(secondPage.break?.pos).toBe(documentEnd);
    expect(secondPage.break?.pos).toBeGreaterThan(sectionBreakEnd);
  });
});
