import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createDomPainter, sanitizeUrl, linkMetrics, applyRunDataAttributes } from './index.js';
import type { FlowBlock, Measure, Layout, ParagraphMeasure, FlowRunLink, Fragment } from '@superdoc/contracts';

const block: FlowBlock = {
  kind: 'paragraph',
  id: 'block-1',
  runs: [
    { text: 'Hello ', fontFamily: 'Arial', fontSize: 16, pmStart: 1, pmEnd: 7 },
    { text: 'world', fontFamily: 'Arial', fontSize: 16, bold: true, pmStart: 7, pmEnd: 12 },
  ],
};

const measure: Measure = {
  kind: 'paragraph',
  lines: [
    {
      fromRun: 0,
      fromChar: 0,
      toRun: 1,
      toChar: 5,
      width: 120,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
    },
  ],
  totalHeight: 20,
};

const layout: Layout = {
  pageSize: { w: 400, h: 500 },
  pages: [
    {
      number: 1,
      fragments: [
        {
          kind: 'para',
          blockId: 'block-1',
          fromLine: 0,
          toLine: 1,
          x: 30,
          y: 40,
          width: 300,
          pmStart: 1,
          pmEnd: 12,
        },
      ],
    },
  ],
};

const buildSingleParagraphData = (blockId: string, runLength: number) => {
  const paragraphMeasure: ParagraphMeasure = {
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: runLength,
        width: 160,
        ascent: 12,
        descent: 4,
        lineHeight: 20,
      },
    ],
    totalHeight: 20,
  };

  const paragraphLayout: Layout = {
    pageSize: layout.pageSize,
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId,
            fromLine: 0,
            toLine: 1,
            x: 24,
            y: 24,
            width: 260,
          },
        ],
      },
    ],
  };

  return { paragraphMeasure, paragraphLayout };
};

const sdtBlock: FlowBlock = {
  kind: 'paragraph',
  id: 'sdt-block',
  runs: [
    { text: 'Field: ', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 7 },
    {
      text: 'Client Name',
      fontFamily: 'Arial',
      fontSize: 16,
      pmStart: 7,
      pmEnd: 19,
      sdt: {
        type: 'fieldAnnotation',
        fieldId: 'FIELD-1',
        fieldType: 'text',
        variant: 'text',
        visibility: 'visible',
      },
    },
  ],
  attrs: {
    sdt: {
      type: 'structuredContent',
      scope: 'inline',
      id: 'SC-1',
      tag: 'client_inline',
      alias: 'Client Data',
    },
  },
};

const sdtMeasure: Measure = {
  kind: 'paragraph',
  lines: [
    {
      fromRun: 0,
      fromChar: 0,
      toRun: 1,
      toChar: 11,
      width: 160,
      ascent: 12,
      descent: 4,
      lineHeight: 20,
    },
  ],
  totalHeight: 20,
};

const sdtLayout: Layout = {
  pageSize: { w: 400, h: 500 },
  pages: [
    {
      number: 1,
      fragments: [
        {
          kind: 'para',
          blockId: 'sdt-block',
          fromLine: 0,
          toLine: 1,
          x: 20,
          y: 30,
          width: 320,
          pmStart: 0,
          pmEnd: 19,
        },
      ],
    },
  ],
};

describe('DomPainter', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('renders pages and fragments into the mount', () => {
    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    expect(mount.classList.contains('superdoc-layout')).toBe(true);
    expect(mount.children).toHaveLength(1);

    const page = mount.children[0] as HTMLElement;
    expect(page.classList.contains('superdoc-page')).toBe(true);
    expect(page.dataset.pageNumber).toBe('1');
    expect(page.style.width).toBe('400px');
    expect(page.style.height).toBe('500px');
    expect(page.children).toHaveLength(1);

    const fragment = page.children[0] as HTMLElement;
    expect(fragment.classList.contains('superdoc-fragment')).toBe(true);
    expect(fragment.dataset.blockId).toBe('block-1');
    expect(fragment.style.left).toBe('30px');
    expect(fragment.style.top).toBe('40px');
    expect(fragment.textContent).toContain('Hello');
    expect(fragment.textContent).toContain('world');
  });

  it('emits pm metadata attributes', () => {
    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const fragment = mount.querySelector('.superdoc-fragment') as HTMLElement;
    expect(fragment.dataset.pmStart).toBe('1');
    expect(fragment.dataset.pmEnd).toBe('12');
    const line = mount.querySelector('.superdoc-line') as HTMLElement;
    expect(line.dataset.pmStart).toBe('1');
    expect(line.dataset.pmEnd).toBe('12');
    const runSpans = mount.querySelectorAll('.superdoc-line span');
    expect(runSpans[0].dataset.pmStart).toBe('1');
    expect(runSpans[0].dataset.pmEnd).toBe('7');
    expect(runSpans[1].dataset.pmStart).toBe('7');
    expect(runSpans[1].dataset.pmEnd).toBe('12');
  });

  it('throws if blocks and measures length mismatch', () => {
    expect(() => createDomPainter({ blocks: [block], measures: [] })).toThrow(/same number of blocks/);
  });

  it('renders placeholder content for empty lines', () => {
    const blockWithEmptyRun: FlowBlock = {
      kind: 'paragraph',
      id: 'empty-block',
      runs: [{ text: '', fontFamily: 'Arial', fontSize: 16 }],
    };
    const measureWithEmptyLine: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 0,
          width: 0,
          ascent: 0,
          descent: 0,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };
    const emptyLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'empty-block',
              fromLine: 0,
              toLine: 1,
              x: 10,
              y: 10,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({
      blocks: [blockWithEmptyRun],
      measures: [measureWithEmptyLine],
    });
    painter.paint(emptyLayout, mount);

    const line = mount.querySelector('.superdoc-line');
    expect(line?.textContent).toBe('\u00A0');
  });

  it('renders image fragments', () => {
    const imageBlock: FlowBlock = {
      kind: 'image',
      id: 'img-block',
      src: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
      width: 150,
      height: 100,
    };
    const imageMeasure: Measure = {
      kind: 'image',
      width: 150,
      height: 100,
    };
    const imageLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'image',
              blockId: 'img-block',
              x: 20,
              y: 30,
              width: 150,
              height: 100,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
    painter.paint(imageLayout, mount);

    const img = mount.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src).toContain('data:image/jpeg');
    expect((img?.parentElement as HTMLElement).style.left).toBe('20px');
  });

  it('annotates fragments and runs with SDT metadata', () => {
    const painter = createDomPainter({ blocks: [sdtBlock], measures: [sdtMeasure] });
    painter.paint(sdtLayout, mount);

    const fragment = mount.querySelector('.superdoc-fragment') as HTMLElement;
    expect(fragment.dataset.sdtType).toBe('structuredContent');
    expect(fragment.dataset.sdtId).toBe('SC-1');
    expect(fragment.dataset.sdtTag).toBe('client_inline');
    expect(fragment.dataset.sdtAlias).toBe('Client Data');

    const runSpans = mount.querySelectorAll('.superdoc-line span');
    const fieldSpan = runSpans[runSpans.length - 1] as HTMLElement;
    expect(fieldSpan.dataset.sdtType).toBe('fieldAnnotation');
    expect(fieldSpan.dataset.sdtFieldId).toBe('FIELD-1');
    expect(fieldSpan.dataset.sdtFieldVariant).toBe('text');
  });

  it('annotates documentSection fragments with section metadata', () => {
    const sectionBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'section-para',
      runs: [{ text: 'Confidential terms', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 18 }],
      attrs: {
        sdt: {
          type: 'documentSection',
          id: 'section-1',
          title: 'Locked Section',
          description: 'Confidential clause',
          sectionType: 'locked',
          isLocked: true,
        },
      },
    };

    const sectionMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 18,
          width: 120,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const sectionLayout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'section-para',
              fromLine: 0,
              toLine: 1,
              x: 20,
              y: 30,
              width: 320,
              pmStart: 0,
              pmEnd: 18,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [sectionBlock], measures: [sectionMeasure] });
    painter.paint(sectionLayout, mount);

    const fragment = mount.querySelector('.superdoc-fragment') as HTMLElement;
    expect(fragment.dataset.sdtType).toBe('documentSection');
    expect(fragment.dataset.sdtId).toBe('section-1');
    expect(fragment.dataset.sdtSectionTitle).toBe('Locked Section');
    expect(fragment.dataset.sdtSectionType).toBe('locked');
    expect(fragment.dataset.sdtSectionLocked).toBe('true');
  });

  it('annotates fragments with both primary SDT and container SDT metadata', () => {
    // Test case: TOC paragraph inside a documentSection
    // Should have docPart metadata as primary (data-sdt-*) and section as container (data-sdt-container-*)
    const tocBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'toc-in-section',
      runs: [{ text: 'TOC Entry', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 9 }],
      attrs: {
        isTocEntry: true,
        sdt: {
          type: 'docPartObject',
          gallery: 'Table of Contents',
          uniqueId: 'toc-1',
          instruction: 'TOC \\o "1-3"',
          alias: null,
        },
        containerSdt: {
          type: 'documentSection',
          id: 'locked-section',
          title: 'Locked TOC Section',
          description: null,
          sectionType: 'locked',
          isLocked: true,
          sdBlockId: null,
        },
      },
    };

    const tocMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 9,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };

    const tocLayout: Layout = {
      pageSize: { w: 612, h: 792 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'toc-in-section',
              fromLine: 0,
              toLine: 1,
              x: 30,
              y: 40,
              width: 552,
              pmStart: 0,
              pmEnd: 9,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [tocBlock], measures: [tocMeasure] });
    painter.paint(tocLayout, mount);

    const fragment = mount.querySelector('.superdoc-fragment') as HTMLElement;

    // Primary SDT metadata (docPart)
    expect(fragment.dataset.sdtType).toBe('docPartObject');
    expect(fragment.dataset.sdtDocpartGallery).toBe('Table of Contents');
    expect(fragment.dataset.sdtDocpartId).toBe('toc-1');
    expect(fragment.dataset.sdtDocpartInstruction).toBe('TOC \\o "1-3"');

    // Container SDT metadata (documentSection)
    expect(fragment.dataset.sdtContainerType).toBe('documentSection');
    expect(fragment.dataset.sdtContainerId).toBe('locked-section');
    expect(fragment.dataset.sdtContainerSectionTitle).toBe('Locked TOC Section');
    expect(fragment.dataset.sdtContainerSectionType).toBe('locked');
    expect(fragment.dataset.sdtContainerSectionLocked).toBe('true');
  });

  it('positions word-layout markers relative to the text start', () => {
    const markerBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'word-layout-block',
      runs: [{ text: 'List text', fontFamily: 'Arial', fontSize: 16 }],
      attrs: {
        indent: { left: 48, hanging: 24 },
        numberingProperties: { numId: 5, ilvl: 0 },
        wordLayout: {
          indentLeftPx: 48,
          marker: {
            markerText: '-',
            glyphWidthPx: 12,
            markerBoxWidthPx: 20,
            markerX: 4,
            textStartX: 24,
            baselineOffsetPx: 0,
            justification: 'left',
            suffix: 'tab',
            run: { fontFamily: 'Arial', fontSize: 18 },
          },
        },
      },
    };

    const markerMeasure: ParagraphMeasure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 8,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
      marker: {
        markerWidth: 20,
        markerTextWidth: 12,
        indentLeft: 48,
      },
    };

    const markerLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'word-layout-block',
              fromLine: 0,
              toLine: 1,
              x: 96,
              y: 96,
              width: 300,
              markerWidth: 20,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({
      blocks: [markerBlock],
      measures: [markerMeasure],
    });
    painter.paint(markerLayout, mount);

    const fragment = mount.querySelector('[data-block-id="word-layout-block"]') as HTMLElement;
    expect(fragment).toBeTruthy();
    const markerEl = fragment.querySelector('.superdoc-paragraph-marker') as HTMLElement;
    expect(markerEl).toBeTruthy();
    expect(markerEl.textContent).toBe('-');

    // textStart = left + firstLine - hanging = 48 - 24 = 24 → markerLeft = 24 - 20 = 4
    expect(markerEl.style.left).toBe('4px');
    expect(markerEl.style.fontSize).toBe('18px');
  });

  it('reuses fragment DOM nodes when layout geometry changes', () => {
    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const fragmentBefore = mount.querySelector('.superdoc-fragment') as HTMLElement;
    const movedLayout: Layout = {
      ...layout,
      pages: [
        {
          ...layout.pages[0],
          fragments: [
            {
              ...layout.pages[0].fragments[0],
              x: 60,
            },
          ],
        },
      ],
    };

    painter.paint(movedLayout, mount);
    const fragmentAfter = mount.querySelector('.superdoc-fragment') as HTMLElement;

    expect(fragmentAfter).toBe(fragmentBefore);
    expect(fragmentAfter.style.left).toBe('60px');
  });

  it('rebuilds fragment DOM when block content changes via setData', () => {
    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const fragmentBefore = mount.querySelector('.superdoc-fragment') as HTMLElement;

    const updatedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'block-1',
      runs: [block.runs[0], { text: 'world!!!', fontFamily: 'Arial', fontSize: 16, bold: true, pmStart: 7, pmEnd: 15 }],
    };
    const updatedMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 1,
          toChar: 8,
          width: 140,
          ascent: 12,
          descent: 4,
          lineHeight: 20,
        },
      ],
      totalHeight: 20,
    };
    painter.setData?.([updatedBlock], [updatedMeasure]);

    const updatedLayout: Layout = {
      ...layout,
      pages: [
        {
          ...layout.pages[0],
          fragments: [
            {
              ...(layout.pages[0].fragments[0] as (typeof layout.pages)[0]['fragments'][0]),
              pmEnd: 15,
            },
          ],
        },
      ],
    };

    painter.paint(updatedLayout, mount);
    const fragmentAfter = mount.querySelector('.superdoc-fragment') as HTMLElement;

    expect(fragmentAfter).not.toBe(fragmentBefore);
    expect(fragmentAfter?.textContent).toContain('world!!!');
  });

  it('updates fragment positions in virtualized mode when layout changes without block diffs', () => {
    const painter = createDomPainter({
      blocks: [block],
      measures: [measure],
      virtualization: { enabled: true, window: 2 },
    });
    const virtualMount = document.createElement('div');
    // jsdom returns zeros by default but provide an explicit rect for clarity
    virtualMount.getBoundingClientRect = () =>
      ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    painter.setData?.([block], [measure]);
    painter.paint(layout, virtualMount);
    const fragmentBefore = virtualMount.querySelector('.superdoc-fragment') as HTMLElement;
    expect(fragmentBefore.style.left).toBe('30px');

    const shiftedLayout: Layout = {
      ...layout,
      pages: [
        {
          ...layout.pages[0],
          fragments: layout.pages[0].fragments.map((fragment) => ({
            ...fragment,
            x: fragment.x + 40,
          })),
        },
      ],
    };

    painter.setData?.([block], [measure]);
    painter.paint(shiftedLayout, virtualMount);
    const fragmentAfter = virtualMount.querySelector('.superdoc-fragment') as HTMLElement;

    expect(fragmentAfter.style.left).toBe('70px');
  });

  it('renders header decorations with tokens resolved', () => {
    const headerBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'header-block',
      runs: [
        { text: 'Page ', fontFamily: 'Arial', fontSize: 14 },
        { text: '0', fontFamily: 'Arial', fontSize: 14, token: 'pageNumber' },
        { text: ' of ', fontFamily: 'Arial', fontSize: 14 },
        { text: '0', fontFamily: 'Arial', fontSize: 14, token: 'totalPageCount' },
      ],
    };
    const headerMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 3,
          toChar: 1,
          width: 120,
          ascent: 10,
          descent: 4,
          lineHeight: 16,
        },
      ],
      totalHeight: 16,
    };
    const headerFragment = {
      kind: 'para' as const,
      blockId: 'header-block',
      fromLine: 0,
      toLine: 1,
      x: 0,
      y: 0,
      width: 200,
    };

    const painter = createDomPainter({
      blocks: [block, headerBlock],
      measures: [measure, headerMeasure],
      headerProvider: () => ({ fragments: [headerFragment], height: 16 }),
    });

    painter.paint({ ...layout, pages: [{ ...layout.pages[0], number: 1 }] }, mount);

    const headerEl = mount.querySelector('.superdoc-page-header');
    expect(headerEl).toBeTruthy();
    expect(headerEl?.textContent).toBe('Page 1 of 1');
  });

  it('applies track-change classes and metadata when rendering review mode', () => {
    const trackedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'tracked-block',
      runs: [
        {
          text: 'Inserted content',
          fontFamily: 'Arial',
          fontSize: 16,
          trackedChange: {
            kind: 'insert',
            id: 'change-1',
            author: 'Reviewer 1',
            authorEmail: 'reviewer@example.com',
          },
        },
      ],
      attrs: {
        trackedChangesMode: 'review',
        trackedChangesEnabled: true,
      },
    };

    const { paragraphMeasure, paragraphLayout } = buildSingleParagraphData(
      trackedBlock.id,
      trackedBlock.runs[0].text.length,
    );

    const painter = createDomPainter({ blocks: [trackedBlock], measures: [paragraphMeasure] });
    painter.paint(paragraphLayout, mount);

    const span = mount.querySelector('.superdoc-line span') as HTMLElement;
    expect(span.classList.contains('track-insert-dec')).toBe(true);
    expect(span.classList.contains('highlighted')).toBe(true);
    expect(span.dataset.trackChangeId).toBe('change-1');
    expect(span.dataset.trackChangeKind).toBe('insert');
    expect(span.dataset.trackChangeAuthor).toBe('Reviewer 1');
    expect(span.dataset.trackChangeAuthorEmail).toBe('reviewer@example.com');
  });

  it('respects trackedChangesMode modifiers for insertions', () => {
    const finalBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'final-block',
      runs: [
        {
          text: 'Kept content',
          fontFamily: 'Arial',
          fontSize: 16,
          trackedChange: {
            kind: 'insert',
            id: 'change-final',
          },
        },
      ],
      attrs: {
        trackedChangesMode: 'final',
        trackedChangesEnabled: true,
      },
    };

    const { paragraphMeasure, paragraphLayout } = buildSingleParagraphData(
      finalBlock.id,
      finalBlock.runs[0].text.length,
    );

    const painter = createDomPainter({ blocks: [finalBlock], measures: [paragraphMeasure] });
    painter.paint(paragraphLayout, mount);

    const span = mount.querySelector('[data-track-change-id="change-final"]') as HTMLElement;
    expect(span.classList.contains('track-insert-dec')).toBe(true);
    expect(span.classList.contains('normal')).toBe(true);
    expect(span.classList.contains('highlighted')).toBe(false);
  });

  it('omits track-change styling when disabled', () => {
    const disabledBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'disabled-block',
      runs: [
        {
          text: 'Hidden metadata',
          fontFamily: 'Arial',
          fontSize: 16,
          trackedChange: {
            kind: 'insert',
            id: 'disabled-change',
          },
        },
      ],
      attrs: {
        trackedChangesMode: 'review',
        trackedChangesEnabled: false,
      },
    };

    const { paragraphMeasure, paragraphLayout } = buildSingleParagraphData(
      disabledBlock.id,
      disabledBlock.runs[0].text.length,
    );

    const painter = createDomPainter({ blocks: [disabledBlock], measures: [paragraphMeasure] });
    painter.paint(paragraphLayout, mount);

    const span = mount.querySelector('.superdoc-line span') as HTMLElement;
    expect(span.classList.contains('track-insert-dec')).toBe(false);
    expect(span.dataset.trackChangeId).toBeUndefined();
    expect(span.dataset.trackChangeKind).toBeUndefined();
  });

  describe('token resolution tests', () => {
    it('renders footer with page numbers resolved', () => {
      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-block',
        runs: [
          { text: 'Footer: ', fontFamily: 'Arial', fontSize: 12 },
          { text: '0', fontFamily: 'Arial', fontSize: 12, token: 'pageNumber' },
        ],
      };
      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 80,
            ascent: 10,
            descent: 2,
            lineHeight: 14,
          },
        ],
        totalHeight: 14,
      };
      const footerFragment = {
        kind: 'para' as const,
        blockId: 'footer-block',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
      };

      const painter = createDomPainter({
        blocks: [block, footerBlock],
        measures: [measure, footerMeasure],
        footerProvider: () => ({ fragments: [footerFragment], height: 14 }),
      });

      painter.paint({ ...layout, pages: [{ ...layout.pages[0], number: 3 }] }, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer');
      expect(footerEl).toBeTruthy();
      expect(footerEl?.textContent).toBe('Footer: 3');
    });

    it('bottom-aligns footer content within the footer box', () => {
      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-align',
        runs: [{ text: 'Footer', fontFamily: 'Arial', fontSize: 12 }],
      };
      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 60,
            ascent: 8,
            descent: 2,
            lineHeight: 10,
          },
        ],
        totalHeight: 10,
      };
      const footerFragment = {
        kind: 'para' as const,
        blockId: 'footer-align',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
      };
      const footerHeight = 60;
      const contentHeight = 20;
      const footerOffset = 400;

      const painter = createDomPainter({
        blocks: [block, footerBlock],
        measures: [measure, footerMeasure],
        footerProvider: () => ({
          fragments: [footerFragment],
          height: footerHeight,
          contentHeight,
          offset: footerOffset,
        }),
      });

      painter.paint({ ...layout, pages: [{ ...layout.pages[0], number: 1 }] }, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer') as HTMLElement;
      const fragEl = mount.querySelector('.superdoc-page-footer .superdoc-fragment') as HTMLElement;
      expect(fragEl).toBeTruthy();
      expect(footerEl.style.top).toBe(`${footerOffset}px`);
      expect(fragEl.style.top).toBe(`${footerHeight - contentHeight + footerFragment.y}px`);
    });

    it('preserves bold styling on page number tokens in DOM', () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-bold',
        runs: [
          { text: 'Page ', fontFamily: 'Arial', fontSize: 14 },
          { text: '0', fontFamily: 'Arial', fontSize: 14, bold: true, token: 'pageNumber' },
        ],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 60,
            ascent: 10,
            descent: 4,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-bold',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
      };

      const painter = createDomPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 16 }),
      });

      painter.paint({ ...layout, pages: [{ ...layout.pages[0], number: 5 }] }, mount);

      const headerEl = mount.querySelector('.superdoc-page-header');
      expect(headerEl).toBeTruthy();
      expect(headerEl?.textContent).toBe('Page 5');

      // Verify bold styling is applied (browser normalizes to 'bold' in style.fontWeight)
      const boldSpan = headerEl?.querySelector('span:nth-child(2)') as HTMLElement;
      expect(boldSpan?.style.fontWeight).toBe('bold');
      expect(boldSpan?.textContent).toBe('5');
    });

    it('resolves different page numbers across multi-page document', () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-multi',
        runs: [{ text: '0', fontFamily: 'Arial', fontSize: 14, token: 'pageNumber' }],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 1,
            width: 20,
            ascent: 10,
            descent: 4,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-multi',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
      };

      const painter = createDomPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 16 }),
      });

      const multiPageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          { number: 1, fragments: [] },
          { number: 2, fragments: [] },
          { number: 3, fragments: [] },
        ],
      };

      painter.paint(multiPageLayout, mount);

      const pages = mount.querySelectorAll('.superdoc-page');
      expect(pages).toHaveLength(3);

      const header1 = pages[0].querySelector('.superdoc-page-header');
      const header2 = pages[1].querySelector('.superdoc-page-header');
      const header3 = pages[2].querySelector('.superdoc-page-header');

      expect(header1?.textContent).toBe('1');
      expect(header2?.textContent).toBe('2');
      expect(header3?.textContent).toBe('3');
    });

    it('renders header with only totalPageCount token', () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-total',
        runs: [
          { text: 'Total pages: ', fontFamily: 'Arial', fontSize: 14 },
          { text: '0', fontFamily: 'Arial', fontSize: 14, token: 'totalPageCount' },
        ],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 1,
            width: 100,
            ascent: 10,
            descent: 4,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-total',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
      };

      const painter = createDomPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 16 }),
      });

      const threePageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          { number: 1, fragments: [] },
          { number: 2, fragments: [] },
          { number: 3, fragments: [] },
        ],
      };

      painter.paint(threePageLayout, mount);

      const headerEl = mount.querySelector('.superdoc-page-header');
      expect(headerEl).toBeTruthy();
      expect(headerEl?.textContent).toBe('Total pages: 3');
    });

    it('uses placeholder text when totalPages cannot be determined', () => {
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'header-fallback',
        runs: [
          { text: 'Count: ', fontFamily: 'Arial', fontSize: 14 },
          { text: '99', fontFamily: 'Arial', fontSize: 14, token: 'totalPageCount' },
        ],
      };
      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 1,
            toChar: 2,
            width: 80,
            ascent: 10,
            descent: 4,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };
      const headerFragment = {
        kind: 'para' as const,
        blockId: 'header-fallback',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
      };

      const painter = createDomPainter({
        blocks: [block, headerBlock],
        measures: [measure, headerMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 16 }),
      });

      // Single page layout - totalPageCount resolves to 1 from layout.pages.length
      painter.paint({ ...layout, pages: [{ number: 1, fragments: [] }] }, mount);

      const headerEl = mount.querySelector('.superdoc-page-header');
      expect(headerEl).toBeTruthy();
      // totalPageCount is resolved from layout.pages.length = 1
      expect(headerEl?.textContent).toBe('Count: 1');
    });
  });

  it('renders list fragments with markers', () => {
    const listBlock: FlowBlock = {
      kind: 'list',
      id: 'list-1',
      listType: 'number',
      items: [
        {
          id: 'item-1',
          marker: { kind: 'number', text: '1.', level: 0, order: 1 },
          paragraph: block,
        },
      ],
    };

    const listMeasure: Measure = {
      kind: 'list',
      items: [
        {
          itemId: 'item-1',
          markerWidth: 30,
          markerTextWidth: 18,
          indentLeft: 0,
          paragraph: measure as ParagraphMeasure,
        },
      ],
      totalHeight: measure.totalHeight,
    };

    const listLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'list-item',
              blockId: 'list-1',
              itemId: 'item-1',
              fromLine: 0,
              toLine: 1,
              x: 100,
              y: 40,
              width: 260,
              markerWidth: 30,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [listBlock], measures: [listMeasure] });
    painter.paint(listLayout, mount);

    const marker = mount.querySelector('.superdoc-list-marker');
    expect(marker?.textContent).toBe('1.');
  });

  it('applies run-level decorations and hyperlinks', () => {
    const decoratedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'decorated',
      runs: [
        {
          text: 'Visit',
          fontFamily: 'Arial',
          fontSize: 16,
          underline: { style: 'dashed', color: '#00ff00' },
          highlight: '#ffff00',
          link: { href: 'https://example.com', title: 'Example' },
        },
      ],
      attrs: {
        alignment: 'center',
        indent: { left: 10, firstLine: 20 },
      },
    };
    const decoratedMeasure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 5,
          width: 80,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
          segments: [{ runIndex: 0, fromChar: 0, toChar: 5, width: 80 }],
        },
      ],
      totalHeight: 18,
    };
    const decoratedLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'decorated',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [decoratedBlock], measures: [decoratedMeasure] });
    painter.paint(decoratedLayout, mount);

    const anchor = mount.querySelector('a') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('https://example.com');
    expect(anchor.style.textDecorationLine).toContain('underline');
    expect(anchor.style.backgroundColor).toBe('rgb(255, 255, 0)');

    const fragment = mount.querySelector('.superdoc-fragment') as HTMLElement;
    expect(fragment.style.textAlign).toBe('center');
    expect(fragment.style.paddingLeft).toBe('10px');
    expect(fragment.style.textIndent).toBe('20px');
  });

  it('honors FlowRunLink v2 metadata when rendering anchors', () => {
    const block: FlowBlock = {
      kind: 'paragraph',
      id: 'rich-link',
      runs: [
        {
          text: 'Docs',
          fontFamily: 'Arial',
          fontSize: 16,
          link: {
            version: 2,
            href: 'https://example.com/docs',
            target: '_self',
            rel: 'nofollow',
            tooltip: '"Documentation"',
            docLocation: 'section-1',
            rId: 'rId42',
            history: false,
          },
        },
      ],
    };
    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 4,
          width: 80,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
          segments: [{ runIndex: 0, fromChar: 0, toChar: 4, width: 80 }],
        },
      ],
      totalHeight: 18,
    };
    const richLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'rich-link',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(richLayout, mount);

    const anchor = mount.querySelector('a') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('https://example.com/docs#section-1');
    expect(anchor.getAttribute('target')).toBe('_self');
    expect(anchor.getAttribute('rel')).toBe('nofollow');
    // REGRESSION FIX: Should use raw text, not HTML-encoded entities
    expect(anchor.getAttribute('title')).toBe('"Documentation"');
    expect(anchor.dataset.linkRid).toBe('rId42');
    expect(anchor.dataset.linkDocLocation).toBe('section-1');
    expect(anchor.dataset.linkHistory).toBe('false');
  });

  it('renders blocked links as spans with data-link-blocked metadata', () => {
    const block: FlowBlock = {
      kind: 'paragraph',
      id: 'blocked-link',
      runs: [
        {
          text: 'Malicious',
          fontFamily: 'Arial',
          fontSize: 16,
          link: {
            version: 2,
            href: 'javascript:alert(1)',
            rId: 'rId99',
          },
        },
      ],
    };
    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 9,
          width: 160,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
          segments: [{ runIndex: 0, fromChar: 0, toChar: 9, width: 160 }],
        },
      ],
      totalHeight: 18,
    };
    const blockedLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'blocked-link',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(blockedLayout, mount);

    const span = mount.querySelector('.superdoc-fragment span') as HTMLSpanElement;
    expect(span).toBeTruthy();
    expect(span.dataset.linkBlocked).toBe('true');
    expect(span.dataset.linkRid).toBe('rId99');
  });

  it('should block URLs exceeding maximum length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2100);
    const block: FlowBlock = {
      kind: 'paragraph',
      id: 'long-url-block',
      runs: [
        {
          text: 'Long URL',
          fontFamily: 'Arial',
          fontSize: 16,
          link: {
            version: 2,
            href: longUrl,
          },
        },
      ],
    };
    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 8,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };
    const longUrlLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'long-url-block',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(longUrlLayout, mount);

    // Should render as blocked span, not anchor
    const span = mount.querySelector('span[data-link-blocked="true"]');
    expect(span).toBeTruthy();
    expect(mount.querySelector('a')).toBeNull();
  });

  it('should allow URLs at exactly max length', () => {
    const maxUrl = 'https://example.com/' + 'a'.repeat(2048 - 'https://example.com/'.length);
    const block: FlowBlock = {
      kind: 'paragraph',
      id: 'max-url-block',
      runs: [
        {
          text: 'Max URL',
          fontFamily: 'Arial',
          fontSize: 16,
          link: {
            version: 2,
            href: maxUrl,
          },
        },
      ],
    };
    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 7,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };
    const maxUrlLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'max-url-block',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(maxUrlLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe(maxUrl);
  });

  it('renders tab leaders and bar decorations', () => {
    const blockWithTabs: FlowBlock = {
      kind: 'paragraph',
      id: 'tabs-block',
      runs: [{ text: 'Tab leaders', fontFamily: 'Arial', fontSize: 16 }],
    };
    const measureWithLeaders: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 11,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
          segments: [{ runIndex: 0, fromChar: 0, toChar: 11, width: 100 }],
          leaders: [
            { from: 10, to: 60, style: 'dot' },
            { from: 65, to: 90, style: 'middleDot' },
          ],
          bars: [{ x: 80 }],
        },
      ],
      totalHeight: 18,
    };

    const painter = createDomPainter({ blocks: [blockWithTabs], measures: [measureWithLeaders] });
    const tabLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'tabs-block',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    painter.paint(tabLayout, mount);

    const leaders = mount.querySelectorAll('.superdoc-leader');
    const bar = mount.querySelector('.superdoc-tab-bar') as HTMLElement;
    expect(leaders.length).toBe(2);
    const leaderDot = leaders[0] as HTMLElement;
    const leaderMiddle = leaders[1] as HTMLElement;
    expect(leaderDot.getAttribute('data-style')).toBe('dot');
    expect(leaderDot.style.left).toBe('10px');
    expect(leaderDot.style.width).toBe('50px');
    expect(leaderMiddle.getAttribute('data-style')).toBe('middleDot');
    expect(leaderMiddle.style.left).toBe('65px');
    expect(leaderMiddle.style.width).toBe('25px');
    expect(bar).toBeTruthy();
    expect(bar.style.left).toBe('80px');
  });

  it('renders paragraph borders on fragments', () => {
    const blockWithBorders: FlowBlock = {
      kind: 'paragraph',
      id: 'border-block',
      attrs: {
        borders: {
          top: { style: 'solid', width: 2, color: '#ff0000' },
          left: { style: 'dashed', width: 1, color: '#00ff00' },
        },
      },
      runs: [{ text: 'Border test', fontFamily: 'Arial', fontSize: 16 }],
    };

    const painter = createDomPainter({
      blocks: [blockWithBorders],
      measures: [measure],
    });

    const borderLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'border-block',
              fromLine: 0,
              toLine: 1,
              x: 50,
              y: 60,
              width: 260,
            },
          ],
        },
      ],
    };

    painter.paint(borderLayout, mount);

    const fragment = mount.querySelector('[data-block-id="border-block"]') as HTMLElement;
    expect(fragment.style.borderTopStyle).toBe('solid');
    expect(fragment.style.borderTopWidth).toBe('2px');
    expect(fragment.style.borderTopColor).toBe('rgb(255, 0, 0)');
    expect(fragment.style.borderLeftStyle).toBe('dashed');
    expect(fragment.style.borderLeftWidth).toBe('1px');
    expect(fragment.style.borderLeftColor).toBe('rgb(0, 255, 0)');
  });

  it('applies paragraph shading fill to fragment backgrounds', () => {
    const shadedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'shaded-block',
      attrs: {
        shading: {
          fill: '#ffeeaa',
        },
      },
      runs: [{ text: 'Shaded paragraph', fontFamily: 'Arial', fontSize: 16 }],
    };

    const painter = createDomPainter({
      blocks: [shadedBlock],
      measures: [measure],
    });

    const shadedLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'shaded-block',
              fromLine: 0,
              toLine: 1,
              x: 20,
              y: 30,
              width: 200,
            },
          ],
        },
      ],
    };

    painter.paint(shadedLayout, mount);

    const fragment = mount.querySelector('[data-block-id="shaded-block"]') as HTMLElement;
    expect(fragment.style.backgroundColor).toBe('rgb(255, 238, 170)');
  });

  it('strips indent padding when rendering list content', () => {
    const listBlock: FlowBlock = {
      kind: 'list',
      id: 'list-indent',
      listType: 'number',
      items: [
        {
          id: 'item-1',
          marker: { kind: 'number', text: '1.', level: 1, order: 1 },
          paragraph: {
            kind: 'paragraph',
            id: 'paragraph-list',
            runs: [{ text: 'Indented body', fontFamily: 'Arial', fontSize: 16 }],
            attrs: { indent: { left: 36, hanging: 18 } },
          },
        },
      ],
    };

    const paragraphMeasure: ParagraphMeasure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 13,
          width: 140,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };

    const listMeasure: Measure = {
      kind: 'list',
      items: [
        {
          itemId: 'item-1',
          markerWidth: 30,
          markerTextWidth: 14,
          indentLeft: 36,
          paragraph: paragraphMeasure,
        },
      ],
      totalHeight: 18,
    };

    const listLayout: Layout = {
      pageSize: layout.pageSize,
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'list-item',
              blockId: 'list-indent',
              itemId: 'item-1',
              fromLine: 0,
              toLine: 1,
              x: 80,
              y: 40,
              width: 180,
              markerWidth: 30,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [listBlock], measures: [listMeasure] });
    painter.paint(listLayout, mount);

    const content = mount.querySelector('.superdoc-list-content') as HTMLElement;
    expect(content.style.paddingLeft).toBe('');
  });

  describe('renderImageRun (inline image runs)', () => {
    it('renders img element with valid data URL', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 100,
            height: 100,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.src).toContain('data:image/png;base64');
      expect(img?.width).toBe(100);
      expect(img?.height).toBe(100);
    });

    it('renders img element with external https URL', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'https://example.com/image.png',
            width: 200,
            height: 150,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 200,
            ascent: 150,
            descent: 0,
            lineHeight: 150,
          },
        ],
        totalHeight: 150,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 200,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.src).toBe('https://example.com/image.png');
      expect(img?.width).toBe(200);
      expect(img?.height).toBe(150);
    });

    it('returns null for missing src', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: '',
            width: 100,
            height: 100,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img).toBeNull();
    });

    it('returns null for javascript: URL (blocked by sanitizeUrl)', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'javascript:alert("XSS")',
            width: 100,
            height: 100,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img).toBeNull();
    });

    it('returns null for data URLs exceeding MAX_DATA_URL_LENGTH (10MB)', () => {
      // Create a data URL that exceeds 10MB
      const largeBase64 = 'A'.repeat(10 * 1024 * 1024 + 1);
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: `data:image/png;base64,${largeBase64}`,
            width: 100,
            height: 100,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img).toBeNull();
    });

    it('returns null for invalid MIME type (e.g., data:text/html)', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=',
            width: 100,
            height: 100,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img).toBeNull();
    });

    it('applies correct dimensions (width, height)', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 250,
            height: 175,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 250,
            ascent: 175,
            descent: 0,
            lineHeight: 175,
          },
        ],
        totalHeight: 175,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 250,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img?.width).toBe(250);
      expect(img?.height).toBe(175);
    });

    it('sets alt attribute (empty string default)', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 100,
            height: 100,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img?.alt).toBe('');
    });

    it('sets title attribute when provided', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 100,
            height: 100,
            title: 'Test Image',
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img');
      expect(img?.title).toBe('Test Image');
    });

    it('applies spacing margins (distTop, distBottom, distLeft, distRight)', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 100,
            height: 100,
            distTop: 10,
            distBottom: 20,
            distLeft: 5,
            distRight: 15,
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img') as HTMLElement;
      expect(img?.style.marginTop).toBe('10px');
      expect(img?.style.marginBottom).toBe('20px');
      expect(img?.style.marginLeft).toBe('5px');
      expect(img?.style.marginRight).toBe('15px');
    });

    it('sets vertical alignment', () => {
      const imageBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'img-block',
        runs: [
          {
            kind: 'image',
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 100,
            height: 100,
            verticalAlign: 'bottom',
          },
        ],
      };

      const imageMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 0,
            width: 100,
            ascent: 100,
            descent: 0,
            lineHeight: 100,
          },
        ],
        totalHeight: 100,
      };

      const imageLayout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'img-block',
                fromLine: 0,
                toLine: 1,
                x: 0,
                y: 0,
                width: 100,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({ blocks: [imageBlock], measures: [imageMeasure] });
      painter.paint(imageLayout, mount);

      const img = mount.querySelector('img') as HTMLElement;
      expect(img?.style.verticalAlign).toBe('bottom');
    });
  });
});

describe('URL sanitization security', () => {
  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull();
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
  });

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeUrl('Data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('blocks vbscript: URLs', () => {
    expect(sanitizeUrl('vbscript:alert(1)')).toBeNull();
    expect(sanitizeUrl('VBScript:alert(1)')).toBeNull();
  });

  it('allows safe http and https URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('HTTP://example.com')).toBe('HTTP://example.com');
    expect(sanitizeUrl('HTTPS://example.com')).toBe('HTTPS://example.com');
  });

  it('allows mailto: URLs', () => {
    expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
    expect(sanitizeUrl('MAILTO:user@example.com')).toBe('MAILTO:user@example.com');
  });

  it('allows tel: URLs', () => {
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    expect(sanitizeUrl('TEL:+1234567890')).toBe('TEL:+1234567890');
  });

  it('allows internal anchor links', () => {
    expect(sanitizeUrl('#section1')).toBe('#section1');
    expect(sanitizeUrl('#top')).toBe('#top');
  });

  it('blocks relative URLs', () => {
    expect(sanitizeUrl('/path/to/page')).toBeNull();
    expect(sanitizeUrl('./relative/path')).toBeNull();
    expect(sanitizeUrl('../parent/path')).toBeNull();
  });

  it('handles empty and whitespace-only URLs', () => {
    expect(sanitizeUrl('')).toBeNull();
    expect(sanitizeUrl('   ')).toBeNull();
  });

  it('trims whitespace from URLs', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    expect(sanitizeUrl(' #anchor ')).toBe('#anchor');
  });
});

describe('normalizeAnchor XSS protection', () => {
  let mount: HTMLElement;
  let painter: ReturnType<typeof createDomPainter>;

  const createFlowBlockWithLink = (link: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-anchor-block',
    runs: [
      {
        text: 'Test Link',
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForBlock = (): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 9,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-anchor-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should block anchor with quote injection', () => {
    const link = {
      version: 2,
      anchor: 'x" onclick="alert(1)',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    // Should render as blocked span, not anchor
    const span = mount.querySelector('span[data-link-blocked="true"]');
    expect(span).toBeTruthy();
    expect(mount.querySelector('a')).toBeNull();
  });

  it('should block anchor with angle brackets', () => {
    const link = {
      version: 2,
      anchor: 'test<script>alert(1)</script>',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const span = mount.querySelector('span[data-link-blocked="true"]');
    expect(span).toBeTruthy();
  });

  it('should block anchor with spaces', () => {
    const link = {
      version: 2,
      anchor: 'foo bar baz',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const span = mount.querySelector('span[data-link-blocked="true"]');
    expect(span).toBeTruthy();
  });

  it('should allow valid anchor names', () => {
    const link = {
      version: 2,
      anchor: 'valid-anchor_123',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('#valid-anchor_123');
  });

  it('should handle anchor with leading hash', () => {
    const link = {
      version: 2,
      anchor: '#bookmark',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('#bookmark');
  });
});

describe('appendDocLocation XSS protection', () => {
  let mount: HTMLElement;
  let painter: ReturnType<typeof createDomPainter>;

  const createFlowBlockWithLink = (link: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-docloc-block',
    runs: [
      {
        text: 'Test Link',
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForBlock = (): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 9,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-docloc-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('DATA INTEGRITY: URL-encodes docLocation with quote injection instead of blocking', () => {
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '" onmouseover="alert(1)',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    // CRITICAL FIX: Should preserve the sanitized href and URL-encode the unsafe fragment
    // Previously this would destroy the entire link by returning null
    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    expect(href).toBe('https://example.com#%22%20onmouseover%3D%22alert(1)');
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });

  it('DATA INTEGRITY: URL-encodes docLocation with angle brackets instead of blocking', () => {
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '<script>alert(1)</script>',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    // CRITICAL FIX: Should preserve the sanitized href and URL-encode the unsafe fragment
    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    expect(href).toBe('https://example.com#%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });

  it('DATA INTEGRITY: URL-encodes docLocation with spaces instead of blocking', () => {
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: 'foo bar',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    // CRITICAL FIX: Should preserve the sanitized href and URL-encode the unsafe fragment
    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    expect(href).toBe('https://example.com#foo%20bar');
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });

  it('should allow valid docLocation', () => {
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: 'section-123',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('https://example.com#section-123');
  });

  it('should handle docLocation without href', () => {
    const link = {
      version: 2,
      docLocation: 'bookmark',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('#bookmark');
  });

  it('should not append docLocation if href already has fragment', () => {
    const link = {
      version: 2,
      href: 'https://example.com#existing',
      docLocation: 'new',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('https://example.com#existing');
  });
});

describe('appendDocLocation edge cases', () => {
  let mount: HTMLElement;
  let painter: ReturnType<typeof createDomPainter>;

  const createFlowBlockWithLink = (link: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-edge-case-block',
    runs: [
      {
        text: 'Test Link',
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForBlock = (): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 9,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-edge-case-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should handle very long fragments (>1000 chars) by URL-encoding', () => {
    // Test that extremely long fragments are URL-encoded rather than rejected
    const longFragment = 'a'.repeat(1500);
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: longFragment,
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    // Fragment should be the base URL + # + the long fragment (all a's are safe chars, no encoding needed)
    expect(href).toBe(`https://example.com#${longFragment}`);
    // Link should not be blocked
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });

  it('should handle empty string fragment by preserving href', () => {
    // Empty docLocation should not modify the href
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
  });

  it('should handle whitespace-only fragment by preserving href', () => {
    // Whitespace-only docLocation should not modify the href
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '   \t\n  ',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
  });

  it('should preserve href when encoding fails gracefully', () => {
    // Test that if fragment encoding somehow fails, the base href is preserved
    // Using a docLocation that contains only special characters that need encoding
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '!@#$%^&*()',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    // Special characters should be URL-encoded
    expect(href).toBe('https://example.com#!%40%23%24%25%5E%26*()');
    // Link should not be blocked
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });

  it('should handle fragment with only special characters', () => {
    // Test fragments containing only special characters that require encoding
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '!@#$%^&*()',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    // All special characters should be properly URL-encoded
    expect(href).toContain('https://example.com#');
    expect(href?.includes('%')).toBe(true); // Should contain encoded characters
    // Link should render as an anchor, not blocked
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });

  it('should handle docLocation with null href by creating anchor-only link', () => {
    // When href is null/undefined but docLocation exists, should create internal anchor
    const link = {
      version: 2,
      href: null,
      docLocation: 'bookmark123',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('#bookmark123');
  });

  it('should preserve base href when docLocation contains unicode characters', () => {
    // Test that unicode characters in fragments are properly handled
    const link = {
      version: 2,
      href: 'https://example.com',
      docLocation: '中文锚点',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    const href = anchor?.getAttribute('href');
    // Unicode characters should be URL-encoded
    expect(href).toContain('https://example.com#');
    expect(href?.includes('%')).toBe(true);
    // Link should not be blocked
    expect(mount.querySelector('span[data-link-blocked="true"]')).toBeNull();
  });
});

describe('Tooltip truncation signaling', () => {
  let mount: HTMLElement;
  let painter: ReturnType<typeof createDomPainter>;

  const createFlowBlockWithLink = (link: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-tooltip-block',
    runs: [
      {
        text: 'Test Link',
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForBlock = (): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 9,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (_blocks: FlowBlock[]): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-tooltip-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should add data attribute when tooltip is truncated', () => {
    const longTooltip = 'a'.repeat(600);
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      tooltip: longTooltip,
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout([block]);

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('title')).toHaveLength(500);
    expect(anchor?.dataset.linkTooltipTruncated).toBe('true');
  });

  it('should not add truncation attribute for short tooltips', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      tooltip: 'Short tooltip',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout([block]);

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('title')).toBe('Short tooltip');
    expect(anchor?.dataset.linkTooltipTruncated).toBeUndefined();
  });

  it('REGRESSION FIX: should not double-encode tooltip special characters', () => {
    // This tests the critical fix: tooltips should show readable text, not HTML entities
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      tooltip: '"Click here" to view <details> & more',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout([block]);

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const anchor = mount.querySelector('a');
    // Browser automatically escapes when setting title attribute
    // We should pass raw text, NOT pre-encoded HTML entities like &quot;
    expect(anchor?.getAttribute('title')).toBe('"Click here" to view <details> & more');
    expect(anchor?.getAttribute('title')).not.toContain('&quot;');
    expect(anchor?.getAttribute('title')).not.toContain('&lt;');
    expect(anchor?.getAttribute('title')).not.toContain('&gt;');
    expect(anchor?.getAttribute('title')).not.toContain('&amp;');
  });
});

describe('Link accessibility - Focus styles', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should inject link styles into document', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
    };

    const block: FlowBlock = {
      kind: 'paragraph',
      id: 'test-focus-block',
      runs: [
        {
          text: 'Test link',
          fontFamily: 'Arial',
          fontSize: 16,
          link,
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 9,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };

    const testLayout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'test-focus-block',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    // Check that style tag exists
    const styleTag = document.querySelector('[data-superdoc-link-styles]');
    expect(styleTag).toBeTruthy();
    expect(styleTag?.textContent).toContain(':focus-visible');
    expect(styleTag?.textContent).toContain('sr-only');
  });

  it('should not inject styles twice', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
    };

    const block: FlowBlock = {
      kind: 'paragraph',
      id: 'test-duplicate-block',
      runs: [
        {
          text: 'Test',
          fontFamily: 'Arial',
          fontSize: 16,
          link,
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 4,
          width: 80,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };

    const testLayout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'test-duplicate-block',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);
    painter.paint(testLayout, mount);

    const styleTags = document.querySelectorAll('[data-superdoc-link-styles]');
    expect(styleTags.length).toBe(1);
  });
});

describe('Link accessibility - ARIA labels', () => {
  let mount: HTMLElement;

  const createFlowBlockWithRun = (run: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-aria-block',
    runs: [run],
  });

  const createMeasureForRun = (textLength: number): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: textLength,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-aria-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should add aria-label for ambiguous "click here" text', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com/article',
    };

    const run = {
      text: 'click here',
      fontFamily: 'Arial',
      fontSize: 16,
      link,
    };

    const block = createFlowBlockWithRun(run);
    const measure = createMeasureForRun(run.text.length);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('aria-label')).toContain('example.com');
    expect(anchor?.getAttribute('aria-label')).toBe('click here - example.com');
  });

  it('should add aria-label for "read more" text', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://blog.example.com',
    };

    const run = {
      text: 'read more',
      fontFamily: 'Arial',
      fontSize: 16,
      link,
    };

    const block = createFlowBlockWithRun(run);
    const measure = createMeasureForRun(run.text.length);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('aria-label')).toBe('read more - blog.example.com');
  });

  it('should add "opens in new tab" for target=_blank', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      target: '_blank',
    };

    const run = {
      text: 'External site',
      fontFamily: 'Arial',
      fontSize: 16,
      link,
    };

    const block = createFlowBlockWithRun(run);
    const measure = createMeasureForRun(run.text.length);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('aria-label')).toContain('opens in new tab');
  });

  it('should not add aria-label for descriptive link text without target', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      target: '_self', // Explicitly set to _self to avoid default _blank behavior
    };

    const run = {
      text: 'View the complete documentation',
      fontFamily: 'Arial',
      fontSize: 16,
      link,
    };

    const block = createFlowBlockWithRun(run);
    const measure = createMeasureForRun(run.text.length);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    // Should not have aria-label for non-ambiguous, non-external text
    expect(anchor?.getAttribute('aria-label')).toBeFalsy();
  });

  it('should handle case-insensitive ambiguous pattern matching', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
    };

    const run = {
      text: 'CLICK HERE',
      fontFamily: 'Arial',
      fontSize: 16,
      link,
    };

    const block = createFlowBlockWithRun(run);
    const measure = createMeasureForRun(run.text.length);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('aria-label')).toContain('example.com');
  });
});

describe('Link accessibility - Role attributes', () => {
  let mount: HTMLElement;

  const createFlowBlockWithLink = (link: unknown, text: string): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-role-block',
    runs: [
      {
        text,
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForText = (textLength: number): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: textLength,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-role-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should set role=link for valid links', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
    };

    const block = createFlowBlockWithLink(link, 'Valid link');
    const measure = createMeasureForText(10);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('role')).toBe('link');
    expect(anchor?.getAttribute('tabindex')).toBe('0');
  });

  it('should set role=text for blocked links', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'javascript:alert(1)',
    };

    const block = createFlowBlockWithLink(link, 'Blocked link');
    const measure = createMeasureForText(12);
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const span = mount.querySelector('span[data-link-blocked="true"]');
    expect(span?.getAttribute('role')).toBe('text');
    expect(span?.getAttribute('aria-label')).toBe('Invalid link - not clickable');
  });
});

describe('Link accessibility - Tooltip aria-describedby', () => {
  let mount: HTMLElement;

  const createFlowBlockWithLink = (link: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-tooltip-block',
    runs: [
      {
        text: 'Test Link',
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForBlock = (): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 9,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-tooltip-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
  });

  it('should add aria-describedby for tooltips', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      tooltip: 'Visit our homepage for more information',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    const describedBy = anchor?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    // Look for the description element in the mount, not document
    const descElem = mount.querySelector(`#${describedBy}`);
    expect(descElem?.textContent).toBe('Visit our homepage for more information');
    expect(descElem?.className).toContain('sr-only');
  });

  it('should maintain title attribute for visual tooltip', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
      tooltip: 'Tooltip text',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('title')).toBe('Tooltip text');
  });

  it('should not add aria-describedby for links without tooltips', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const testLayout = createLayout();

    const painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(testLayout, mount);

    const anchor = mount.querySelector('a');
    expect(anchor?.getAttribute('aria-describedby')).toBeFalsy();
  });

  it('should generate unique IDs for multiple links with tooltips', () => {
    const block1: FlowBlock = {
      kind: 'paragraph',
      id: 'block-1',
      runs: [
        {
          text: 'Link 1',
          fontFamily: 'Arial',
          fontSize: 16,
          link: {
            version: 2,
            href: 'https://example.com',
            tooltip: 'First tooltip',
          },
        },
      ],
    };

    const block2: FlowBlock = {
      kind: 'paragraph',
      id: 'block-2',
      runs: [
        {
          text: 'Link 2',
          fontFamily: 'Arial',
          fontSize: 16,
          link: {
            version: 2,
            href: 'https://test.com',
            tooltip: 'Second tooltip',
          },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 6,
          width: 80,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };

    const multiLayout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'block-1',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
            {
              kind: 'para',
              blockId: 'block-2',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 20,
              width: 200,
            },
          ],
        },
      ],
    };

    const painter = createDomPainter({ blocks: [block1, block2], measures: [measure, measure] });
    painter.paint(multiLayout, mount);

    const anchors = mount.querySelectorAll('a');
    expect(anchors).toHaveLength(2);

    const id1 = anchors[0].getAttribute('aria-describedby');
    const id2 = anchors[1].getAttribute('aria-describedby');

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);

    // Look for description elements in the mount, not document
    const desc1 = mount.querySelector(`#${id1}`);
    const desc2 = mount.querySelector(`#${id2}`);

    expect(desc1?.textContent).toBe('First tooltip');
    expect(desc2?.textContent).toBe('Second tooltip');
  });
});

describe('Link rendering metrics', () => {
  let mount: HTMLElement;
  let painter: ReturnType<typeof createDomPainter>;

  const createFlowBlockWithLink = (link: unknown): FlowBlock => ({
    kind: 'paragraph',
    id: 'test-metrics-block',
    runs: [
      {
        text: 'Test Link',
        fontFamily: 'Arial',
        fontSize: 16,
        link,
      },
    ],
  });

  const createMeasureForBlock = (): Measure => ({
    kind: 'paragraph',
    lines: [
      {
        fromRun: 0,
        fromChar: 0,
        toRun: 0,
        toChar: 9,
        width: 100,
        ascent: 12,
        descent: 4,
        lineHeight: 18,
      },
    ],
    totalHeight: 18,
  });

  const createLayout = (): Layout => ({
    pageSize: { w: 400, h: 500 },
    pages: [
      {
        number: 1,
        fragments: [
          {
            kind: 'para',
            blockId: 'test-metrics-block',
            fromLine: 0,
            toLine: 1,
            x: 0,
            y: 0,
            width: 200,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    mount = document.createElement('div');
    linkMetrics.reset();
  });

  it('should increment sanitized count for valid links', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'https://example.com',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const metrics = linkMetrics.getMetrics();
    expect(metrics['hyperlink.sanitized.count']).toBeGreaterThan(0);
  });

  it('should increment blocked count for invalid links', () => {
    const link: FlowRunLink = {
      version: 2,
      href: 'javascript:alert(1)',
    };

    const block = createFlowBlockWithLink(link);
    const measure = createMeasureForBlock();
    const layout = createLayout();

    painter = createDomPainter({ blocks: [block], measures: [measure] });
    painter.paint(layout, mount);

    const metrics = linkMetrics.getMetrics();
    expect(metrics['hyperlink.blocked.count']).toBeGreaterThan(0);
    expect(metrics['hyperlink.invalid_protocol.count']).toBeGreaterThan(0);
  });

  it('should track multiple metrics across multiple links', () => {
    // Create blocks with different IDs for proper multi-block rendering
    const validBlock1: FlowBlock = {
      kind: 'paragraph',
      id: 'valid-block-1',
      runs: [
        {
          text: 'Valid Link 1',
          fontFamily: 'Arial',
          fontSize: 16,
          link: { version: 2, href: 'https://example.com' },
        },
      ],
    };

    const blockedBlock: FlowBlock = {
      kind: 'paragraph',
      id: 'blocked-block',
      runs: [
        {
          text: 'Blocked Link',
          fontFamily: 'Arial',
          fontSize: 16,
          link: { version: 2, href: 'javascript:alert(1)' },
        },
      ],
    };

    const validBlock2: FlowBlock = {
      kind: 'paragraph',
      id: 'valid-block-2',
      runs: [
        {
          text: 'Valid Link 2',
          fontFamily: 'Arial',
          fontSize: 16,
          link: { version: 2, href: 'https://test.com' },
        },
      ],
    };

    const measure: Measure = {
      kind: 'paragraph',
      lines: [
        {
          fromRun: 0,
          fromChar: 0,
          toRun: 0,
          toChar: 12,
          width: 100,
          ascent: 12,
          descent: 4,
          lineHeight: 18,
        },
      ],
      totalHeight: 18,
    };

    const multiLayout: Layout = {
      pageSize: { w: 400, h: 500 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: 'valid-block-1',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 0,
              width: 200,
            },
            {
              kind: 'para',
              blockId: 'blocked-block',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 20,
              width: 200,
            },
            {
              kind: 'para',
              blockId: 'valid-block-2',
              fromLine: 0,
              toLine: 1,
              x: 0,
              y: 40,
              width: 200,
            },
          ],
        },
      ],
    };

    // Create single painter with all blocks
    painter = createDomPainter({
      blocks: [validBlock1, blockedBlock, validBlock2],
      measures: [measure, measure, measure],
    });
    painter.paint(multiLayout, mount);

    const metrics = linkMetrics.getMetrics();
    expect(metrics['hyperlink.sanitized.count']).toBe(2);
    expect(metrics['hyperlink.blocked.count']).toBe(1);
  });
});

describe('applyRunDataAttributes', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('span');
  });

  describe('Happy path', () => {
    it('applies valid data attributes to element', () => {
      const dataAttrs = {
        'data-id': '123',
        'data-name': 'test',
        'data-category': 'example',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-id')).toBe('123');
      expect(element.getAttribute('data-name')).toBe('test');
      expect(element.getAttribute('data-category')).toBe('example');
    });

    it('applies single data attribute', () => {
      const dataAttrs = {
        'data-id': '456',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-id')).toBe('456');
    });

    it('applies attributes with special characters in values', () => {
      const dataAttrs = {
        'data-text': 'hello world',
        'data-url': 'https://example.com/page?param=value',
        'data-json': '{"key":"value"}',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-text')).toBe('hello world');
      expect(element.getAttribute('data-url')).toBe('https://example.com/page?param=value');
      expect(element.getAttribute('data-json')).toBe('{"key":"value"}');
    });
  });

  describe('Edge cases', () => {
    it('handles undefined dataAttrs gracefully', () => {
      applyRunDataAttributes(element, undefined);

      // Should not have any data attributes
      expect(element.attributes.length).toBe(0);
    });

    it('handles empty object', () => {
      applyRunDataAttributes(element, {});

      // Should not have any data attributes
      expect(element.attributes.length).toBe(0);
    });

    it('filters out non-data-* attributes at runtime', () => {
      const dataAttrs = {
        'data-id': '123',
        id: 'invalid',
        class: 'invalid',
        'data-valid': 'test',
      } as Record<string, string>;

      applyRunDataAttributes(element, dataAttrs);

      // Only data-* attributes should be set
      expect(element.getAttribute('data-id')).toBe('123');
      expect(element.getAttribute('data-valid')).toBe('test');
      expect(element.getAttribute('id')).toBeNull();
      expect(element.getAttribute('class')).toBeNull();
    });

    it('filters out non-string values at runtime', () => {
      const dataAttrs = {
        'data-id': '123',
        'data-invalid': 456,
        'data-also-invalid': true,
      } as unknown as Record<string, string>;

      applyRunDataAttributes(element, dataAttrs);

      // Only string values should be set
      expect(element.getAttribute('data-id')).toBe('123');
      expect(element.getAttribute('data-invalid')).toBeNull();
      expect(element.getAttribute('data-also-invalid')).toBeNull();
    });

    it('handles case-insensitive data- prefix matching', () => {
      const dataAttrs = {
        'DATA-ID': '123',
        'Data-Name': 'test',
        'dAtA-MiXeD': 'value',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('DATA-ID')).toBe('123');
      expect(element.getAttribute('Data-Name')).toBe('test');
      expect(element.getAttribute('dAtA-MiXeD')).toBe('value');
    });

    it('handles empty string values', () => {
      const dataAttrs = {
        'data-empty': '',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-empty')).toBe('');
    });

    it('overwrites existing attributes with same name', () => {
      element.setAttribute('data-id', 'old-value');

      const dataAttrs = {
        'data-id': 'new-value',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-id')).toBe('new-value');
    });

    it('preserves existing non-data attributes', () => {
      element.setAttribute('class', 'my-class');
      element.setAttribute('id', 'my-id');

      const dataAttrs = {
        'data-custom': 'value',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('class')).toBe('my-class');
      expect(element.getAttribute('id')).toBe('my-id');
      expect(element.getAttribute('data-custom')).toBe('value');
    });

    it('handles attributes with numeric suffixes', () => {
      const dataAttrs = {
        'data-attr-1': 'value1',
        'data-attr-2': 'value2',
        'data-attr-999': 'value999',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-attr-1')).toBe('value1');
      expect(element.getAttribute('data-attr-2')).toBe('value2');
      expect(element.getAttribute('data-attr-999')).toBe('value999');
    });

    it('handles attributes with hyphens and underscores', () => {
      const dataAttrs = {
        'data-kebab-case': 'value1',
        'data-snake_case': 'value2',
        'data-mixed-kebab_snake': 'value3',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-kebab-case')).toBe('value1');
      expect(element.getAttribute('data-snake_case')).toBe('value2');
      expect(element.getAttribute('data-mixed-kebab_snake')).toBe('value3');
    });
  });

  describe('Security and safety', () => {
    it('does not execute JavaScript in attribute values', () => {
      const dataAttrs = {
        'data-script': 'javascript:alert(1)',
        'data-onclick': 'alert(1)',
      };

      applyRunDataAttributes(element, dataAttrs);

      // Attributes should be set as plain text, not executed
      expect(element.getAttribute('data-script')).toBe('javascript:alert(1)');
      expect(element.getAttribute('data-onclick')).toBe('alert(1)');
      // Element should not have onclick handler
      expect(element.onclick).toBeNull();
    });

    it('handles HTML entities in values', () => {
      const dataAttrs = {
        'data-html': '<script>alert(1)</script>',
        'data-entities': '&lt;div&gt;',
      };

      applyRunDataAttributes(element, dataAttrs);

      // Should store as plain text
      expect(element.getAttribute('data-html')).toBe('<script>alert(1)</script>');
      expect(element.getAttribute('data-entities')).toBe('&lt;div&gt;');
    });

    it('handles very long attribute values', () => {
      const longValue = 'a'.repeat(10000);
      const dataAttrs = {
        'data-long': longValue,
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-long')).toBe(longValue);
    });

    it('handles special Unicode characters', () => {
      const dataAttrs = {
        'data-emoji': '😀🎉',
        'data-chinese': '你好',
        'data-arabic': 'مرحبا',
      };

      applyRunDataAttributes(element, dataAttrs);

      expect(element.getAttribute('data-emoji')).toBe('😀🎉');
      expect(element.getAttribute('data-chinese')).toBe('你好');
      expect(element.getAttribute('data-arabic')).toBe('مرحبا');
    });
  });

  describe('setData with header/footer blocks', () => {
    let mount: HTMLElement;

    beforeEach(() => {
      mount = document.createElement('div');
      document.body.appendChild(mount);
    });

    it('should accept header and footer blocks in setData', () => {
      // Main document block
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-block-1',
        runs: [{ text: 'Main content', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 12 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 12,
            width: 120,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      // Header block with prefixed ID (matching HeaderFooterLayoutAdapter pattern)
      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'hf-header-rId6-0-paragraph',
        runs: [{ text: 'Header text', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 11 }],
      };

      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 11,
            width: 100,
            ascent: 10,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      // Footer block with prefixed ID
      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'hf-footer-rId7-0-paragraph',
        runs: [{ text: 'Footer text', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 11 }],
      };

      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 11,
            width: 100,
            ascent: 10,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
      });

      // Call setData with header and footer blocks
      expect(() => {
        painter.setData?.([mainBlock], [mainMeasure], [headerBlock], [headerMeasure], [footerBlock], [footerMeasure]);
      }).not.toThrow();
    });

    it('should render fragments with header block IDs without errors', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-block-1',
        runs: [{ text: 'Main content', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 12 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 12,
            width: 120,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'hf-header-rId6-0-paragraph',
        runs: [{ text: 'Header', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 6 }],
      };

      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 6,
            width: 60,
            ascent: 10,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      const layoutWithHeader: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-block-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 12,
              },
            ],
          },
        ],
      };

      const headerFragment = {
        kind: 'para' as const,
        blockId: 'hf-header-rId6-0-paragraph',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
        pmStart: 0,
        pmEnd: 6,
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 16 }),
      });

      // Set data with header blocks
      painter.setData?.([mainBlock], [mainMeasure], [headerBlock], [headerMeasure]);

      // Paint should not throw errors about missing blocks
      expect(() => {
        painter.paint(layoutWithHeader, mount);
      }).not.toThrow();

      // Verify header was rendered
      const headerEl = mount.querySelector('.superdoc-page-header');
      expect(headerEl).toBeTruthy();
      expect(headerEl?.textContent).toContain('Header');
    });

    it('should handle multiple header/footer blocks', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Content', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 7 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 7,
            width: 70,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const headerBlocks: FlowBlock[] = [
        {
          kind: 'paragraph',
          id: 'hf-header-default-0-paragraph',
          runs: [{ text: 'Default Header', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 14 }],
        },
        {
          kind: 'paragraph',
          id: 'hf-header-first-0-paragraph',
          runs: [{ text: 'First Page Header', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 17 }],
        },
      ];

      const headerMeasures: Measure[] = [
        {
          kind: 'paragraph',
          lines: [
            { fromRun: 0, fromChar: 0, toRun: 0, toChar: 14, width: 100, ascent: 10, descent: 3, lineHeight: 16 },
          ],
          totalHeight: 16,
        },
        {
          kind: 'paragraph',
          lines: [
            { fromRun: 0, fromChar: 0, toRun: 0, toChar: 17, width: 120, ascent: 10, descent: 3, lineHeight: 16 },
          ],
          totalHeight: 16,
        },
      ];

      const footerBlocks: FlowBlock[] = [
        {
          kind: 'paragraph',
          id: 'hf-footer-default-0-paragraph',
          runs: [{ text: 'Footer', fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: 6 }],
        },
      ];

      const footerMeasures: Measure[] = [
        {
          kind: 'paragraph',
          lines: [{ fromRun: 0, fromChar: 0, toRun: 0, toChar: 6, width: 50, ascent: 9, descent: 3, lineHeight: 14 }],
          totalHeight: 14,
        },
      ];

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
      });

      // Should handle multiple header and footer blocks without errors
      expect(() => {
        painter.setData?.([mainBlock], [mainMeasure], headerBlocks, headerMeasures, footerBlocks, footerMeasures);
      }).not.toThrow();
    });

    it('should handle empty header/footer arrays', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Content', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 7 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 7,
            width: 70,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
      });

      // Should handle empty arrays gracefully
      expect(() => {
        painter.setData?.([mainBlock], [mainMeasure], [], [], [], []);
      }).not.toThrow();
    });

    it('should handle undefined header/footer parameters', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Content', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 7 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 7,
            width: 70,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
      });

      // Should handle undefined parameters (backward compatibility)
      expect(() => {
        painter.setData?.([mainBlock], [mainMeasure], undefined, undefined, undefined, undefined);
      }).not.toThrow();
    });

    it('should maintain backward compatibility with original setData signature', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Content', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 7 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 7,
            width: 70,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
      });

      // Should work with just blocks and measures (original signature)
      expect(() => {
        painter.setData?.([mainBlock], [mainMeasure]);
      }).not.toThrow();

      const layoutData: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 7,
              },
            ],
          },
        ],
      };

      expect(() => {
        painter.paint(layoutData, mount);
      }).not.toThrow();
    });

    it('should properly merge header/footer blocks into blockLookup', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const headerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'hf-header-rId6-0-paragraph',
        runs: [{ text: 'Header', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 6 }],
      };

      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'hf-footer-rId7-0-paragraph',
        runs: [{ text: 'Footer', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 6 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [{ fromRun: 0, fromChar: 0, toRun: 0, toChar: 4, width: 40, ascent: 12, descent: 4, lineHeight: 20 }],
        totalHeight: 20,
      };

      const headerMeasure: Measure = {
        kind: 'paragraph',
        lines: [{ fromRun: 0, fromChar: 0, toRun: 0, toChar: 6, width: 60, ascent: 10, descent: 3, lineHeight: 16 }],
        totalHeight: 16,
      };

      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [{ fromRun: 0, fromChar: 0, toRun: 0, toChar: 6, width: 60, ascent: 10, descent: 3, lineHeight: 16 }],
        totalHeight: 16,
      };

      const layoutData: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 100,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const headerFragment = {
        kind: 'para' as const,
        blockId: 'hf-header-rId6-0-paragraph',
        fromLine: 0,
        toLine: 1,
        x: 30,
        y: 10,
        width: 300,
        pmStart: 0,
        pmEnd: 6,
      };

      const footerFragment = {
        kind: 'para' as const,
        blockId: 'hf-footer-rId7-0-paragraph',
        fromLine: 0,
        toLine: 1,
        x: 30,
        y: 450,
        width: 300,
        pmStart: 0,
        pmEnd: 6,
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        headerProvider: () => ({ fragments: [headerFragment], height: 20 }),
        footerProvider: () => ({ fragments: [footerFragment], height: 20 }),
      });

      painter.setData?.([mainBlock], [mainMeasure], [headerBlock], [headerMeasure], [footerBlock], [footerMeasure]);

      // Paint should successfully render all blocks without errors
      expect(() => {
        painter.paint(layoutData, mount);
      }).not.toThrow();

      // Verify all content is rendered
      const content = mount.textContent;
      expect(content).toContain('Main');
      expect(content).toContain('Header');
      expect(content).toContain('Footer');
    });
  });

  describe('footer alignment logic', () => {
    let mount: HTMLElement;

    beforeEach(() => {
      mount = document.createElement('div');
      document.body.appendChild(mount);
    });

    afterEach(() => {
      document.body.removeChild(mount);
    });

    it('should apply offset when footer content is shorter than allocated height with explicit contentHeight', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 4,
            width: 40,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-1',
        runs: [{ text: 'Footer', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 6 }],
      };

      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 6,
            width: 60,
            ascent: 10,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      const footerFragment: Fragment = {
        kind: 'para',
        blockId: 'footer-1',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
        pmStart: 0,
        pmEnd: 6,
      };

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        footerProvider: () => ({
          fragments: [footerFragment],
          height: 50,
          contentHeight: 16, // Explicit content height smaller than allocated height
        }),
      });

      painter.setData?.([mainBlock], [mainMeasure], undefined, undefined, [footerBlock], [footerMeasure]);
      painter.paint(layout, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer');
      expect(footerEl).toBeTruthy();

      // Footer content should be pushed to bottom
      // With height=50 and contentHeight=16, offset should be 34px
      const paraEl = footerEl?.querySelector('[data-block-id="footer-1"]') as HTMLElement;
      expect(paraEl).toBeTruthy();
      // The fragment's y position should be offset by (50 - 16) = 34
      expect(paraEl.style.top).toBe('34px');
    });

    it('should calculate offset from fragments when contentHeight is not provided', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 4,
            width: 40,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const footerBlock: FlowBlock = {
        kind: 'table',
        id: 'footer-table',
        rows: [
          {
            id: 'row-1',
            cells: [
              {
                id: 'cell-1',
                paragraph: {
                  kind: 'paragraph',
                  id: 'cell-para-1',
                  runs: [{ text: 'Cell', fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: 4 }],
                },
              },
            ],
          },
        ],
      };

      const footerMeasure: Measure = {
        kind: 'table',
        rows: [
          {
            cells: [{ paragraph: { kind: 'paragraph', lines: [], totalHeight: 20 }, width: 100, height: 20 }],
            height: 20,
          },
        ],
        columnWidths: [100],
        totalWidth: 100,
        totalHeight: 20,
      };

      // Table fragment with explicit height
      const footerFragment: Fragment = {
        kind: 'table',
        blockId: 'footer-table',
        fromRow: 0,
        toRow: 1,
        x: 0,
        y: 5,
        width: 100,
        height: 20,
      };

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        footerProvider: () => ({
          fragments: [footerFragment],
          height: 60,
          // No contentHeight provided - should calculate from fragments
        }),
      });

      painter.setData?.([mainBlock], [mainMeasure], undefined, undefined, [footerBlock], [footerMeasure]);
      painter.paint(layout, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer');
      expect(footerEl).toBeTruthy();

      // Fragment at y=5 with height=20, so max y+height = 25
      // With allocated height=60, offset should be 60-25=35
      const tableEl = footerEl?.querySelector('[data-block-id="footer-table"]') as HTMLElement;
      expect(tableEl).toBeTruthy();
      expect(tableEl.style.top).toBe('40px'); // 5 (original y) + 35 (offset)
    });

    it('should not apply offset when footer content is taller than allocated height', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 4,
            width: 40,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-1',
        runs: [{ text: 'Tall Footer', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 11 }],
      };

      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 11,
            width: 110,
            ascent: 10,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      const footerFragment: Fragment = {
        kind: 'para',
        blockId: 'footer-1',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 0,
        width: 200,
        pmStart: 0,
        pmEnd: 11,
      };

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        footerProvider: () => ({
          fragments: [footerFragment],
          height: 30,
          contentHeight: 50, // Content height exceeds allocated height
        }),
      });

      painter.setData?.([mainBlock], [mainMeasure], undefined, undefined, [footerBlock], [footerMeasure]);
      painter.paint(layout, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer');
      expect(footerEl).toBeTruthy();

      // No offset should be applied (Math.max(0, 30-50) = 0)
      const paraEl = footerEl?.querySelector('[data-block-id="footer-1"]') as HTMLElement;
      expect(paraEl).toBeTruthy();
      expect(paraEl.style.top).toBe('0px');
    });

    it('should handle empty footer with 0 fragments', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 4,
            width: 40,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        footerProvider: () => ({
          fragments: [], // Empty footer
          height: 40,
        }),
      });

      painter.setData?.([mainBlock], [mainMeasure]);
      expect(() => {
        painter.paint(layout, mount);
      }).not.toThrow();

      const footerEl = mount.querySelector('.superdoc-page-footer');
      // Footer container should NOT exist when there are no fragments (correct behavior)
      expect(footerEl).toBeNull();
    });

    it('should handle multiple fragments with varying heights', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 4,
            width: 40,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const footerBlocks: FlowBlock[] = [
        {
          kind: 'paragraph',
          id: 'footer-1',
          runs: [{ text: 'Line 1', fontFamily: 'Arial', fontSize: 12, pmStart: 0, pmEnd: 6 }],
        },
        {
          kind: 'table',
          id: 'footer-table',
          rows: [
            {
              id: 'row-1',
              cells: [
                {
                  id: 'cell-1',
                  paragraph: {
                    kind: 'paragraph',
                    id: 'cell-para-1',
                    runs: [{ text: 'Table', fontFamily: 'Arial', fontSize: 10, pmStart: 0, pmEnd: 5 }],
                  },
                },
              ],
            },
          ],
        },
      ];

      const footerMeasures: Measure[] = [
        {
          kind: 'paragraph',
          lines: [
            {
              fromRun: 0,
              fromChar: 0,
              toRun: 0,
              toChar: 6,
              width: 60,
              ascent: 10,
              descent: 2,
              lineHeight: 14,
            },
          ],
          totalHeight: 14,
        },
        {
          kind: 'table',
          rows: [
            {
              cells: [{ paragraph: { kind: 'paragraph', lines: [], totalHeight: 15 }, width: 100, height: 15 }],
              height: 15,
            },
          ],
          columnWidths: [100],
          totalWidth: 100,
          totalHeight: 15,
        },
      ];

      // Multiple fragments with different types and heights
      const footerFragments: Fragment[] = [
        {
          kind: 'para',
          blockId: 'footer-1',
          fromLine: 0,
          toLine: 1,
          x: 0,
          y: 0,
          width: 200,
          pmStart: 0,
          pmEnd: 6,
        },
        {
          kind: 'table',
          blockId: 'footer-table',
          fromRow: 0,
          toRow: 1,
          x: 0,
          y: 20, // Positioned below first fragment
          width: 100,
          height: 15,
        },
      ];

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        footerProvider: () => ({
          fragments: footerFragments,
          height: 70,
          // No contentHeight - should calculate max from fragments
          // Para fragment: y=0, no explicit height (uses measure)
          // Table fragment: y=20, height=15, so max is y+height=35
        }),
      });

      painter.setData?.([mainBlock], [mainMeasure], undefined, undefined, footerBlocks, footerMeasures);
      painter.paint(layout, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer');
      expect(footerEl).toBeTruthy();

      // Max content height should be calculated as 20 + 15 = 35
      // Offset should be 70 - 35 = 35
      const tableEl = footerEl?.querySelector('[data-block-id="footer-table"]') as HTMLElement;
      expect(tableEl).toBeTruthy();
      expect(tableEl.style.top).toBe('55px'); // 20 (original y) + 35 (offset)

      const paraEl = footerEl?.querySelector('[data-block-id="footer-1"]') as HTMLElement;
      expect(paraEl).toBeTruthy();
      expect(paraEl.style.top).toBe('35px'); // 0 (original y) + 35 (offset)
    });

    it('should apply offset correctly when footer has only para fragments without explicit height', () => {
      const mainBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'main-1',
        runs: [{ text: 'Main', fontFamily: 'Arial', fontSize: 16, pmStart: 0, pmEnd: 4 }],
      };

      const mainMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 4,
            width: 40,
            ascent: 12,
            descent: 4,
            lineHeight: 20,
          },
        ],
        totalHeight: 20,
      };

      const footerBlock: FlowBlock = {
        kind: 'paragraph',
        id: 'footer-1',
        runs: [{ text: 'Footer', fontFamily: 'Arial', fontSize: 14, pmStart: 0, pmEnd: 6 }],
      };

      const footerMeasure: Measure = {
        kind: 'paragraph',
        lines: [
          {
            fromRun: 0,
            fromChar: 0,
            toRun: 0,
            toChar: 6,
            width: 60,
            ascent: 10,
            descent: 3,
            lineHeight: 16,
          },
        ],
        totalHeight: 16,
      };

      // Para fragment without explicit height property
      const footerFragment: Fragment = {
        kind: 'para',
        blockId: 'footer-1',
        fromLine: 0,
        toLine: 1,
        x: 0,
        y: 2,
        width: 200,
        pmStart: 0,
        pmEnd: 6,
      };

      const layout: Layout = {
        pageSize: { w: 400, h: 500 },
        pages: [
          {
            number: 1,
            fragments: [
              {
                kind: 'para',
                blockId: 'main-1',
                fromLine: 0,
                toLine: 1,
                x: 30,
                y: 40,
                width: 300,
                pmStart: 0,
                pmEnd: 4,
              },
            ],
          },
        ],
      };

      const painter = createDomPainter({
        blocks: [mainBlock],
        measures: [mainMeasure],
        footerProvider: () => ({
          fragments: [footerFragment],
          height: 50,
          // No contentHeight, para fragment has no height property
          // Should fall back to calculating from y position (y=2, height=0, so max=2)
        }),
      });

      painter.setData?.([mainBlock], [mainMeasure], undefined, undefined, [footerBlock], [footerMeasure]);
      painter.paint(layout, mount);

      const footerEl = mount.querySelector('.superdoc-page-footer');
      expect(footerEl).toBeTruthy();

      // Para fragments don't have explicit height, so we fall back to the measure's totalHeight (16)
      // Calculated content height = y (2) + 16 = 18, offset = 50 - 18 = 32
      const paraEl = footerEl?.querySelector('[data-block-id="footer-1"]') as HTMLElement;
      expect(paraEl).toBeTruthy();
      expect(paraEl.style.top).toBe('34px'); // 2 (original y) + 32 (offset)
    });
  });
});
