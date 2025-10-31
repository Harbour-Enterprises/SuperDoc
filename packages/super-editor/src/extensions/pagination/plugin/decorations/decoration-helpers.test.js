import { describe, it, expect } from 'vitest';
import { Schema } from 'prosemirror-model';
import { DecorationSet } from 'prosemirror-view';

import { buildPageBreakDecorations } from './decoration-helpers.js';

const testSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
});

const createDoc = (text = 'Hello world') =>
  testSchema.nodes.doc.create(null, [testSchema.nodes.paragraph.create(null, testSchema.text(text))]);

describe('buildPageBreakDecorations', () => {
  it('returns an empty decoration set when there are no widgets to render', () => {
    const doc = createDoc();

    const decorations = buildPageBreakDecorations(doc, []);

    expect(decorations).toBe(DecorationSet.empty);
  });

  it('creates widgets for spacers, page breaks, and fillers with expected DOM metadata', () => {
    const doc = createDoc('abc');
    const pageBreaks = [
      {
        pos: 2,
        placeholder: { headerHeightPx: 15, footerHeightPx: 12, gapHeightPx: 5 },
        pageIndex: 0,
        break: { pos: 2 },
      },
    ];

    const decorations = buildPageBreakDecorations(doc, pageBreaks, {
      leadingSpacingPx: 20,
      trailingSpacingPx: 25,
      pageFillers: [{ pos: 4, heightPx: 30, pageIndex: 2, key: 'custom-fill' }],
      pageHeaderHeights: [null, 40],
      pageFooterHeights: [18],
    });

    const widgets = decorations.find();

    expect(widgets).toHaveLength(4);

    const leadingWidget = widgets.find((item) => item.type.spec?.key?.startsWith('page-leading-spacer'));
    expect(leadingWidget).toBeDefined();
    expect(leadingWidget.from).toBe(0);
    const leadingDom = leadingWidget.type.toDOM(null);
    expect(leadingDom.className).toBe('page-leading-spacer');
    expect(leadingDom.dataset.leadingSpacer).toBe('true');
    expect(leadingDom.style.height).toBe('20px');
    expect(leadingDom.dataset.leadingSpacerHeight).toBe('20');

    const pageBreakWidget = widgets.find((item) => item.type.spec?.key === 'page-break-0');
    expect(pageBreakWidget).toBeDefined();
    const wrapper = pageBreakWidget.type.toDOM(null);
    expect(wrapper.className).toBe('page-break-wrapper');
    expect(wrapper.style.paddingTop).toBe('45px');
    const placeholder = wrapper.querySelector('.page-break');
    expect(placeholder).toBeTruthy();
    expect(placeholder.dataset.pageIndex).toBe('0');
    expect(placeholder.dataset.pageNumber).toBe('1');
    expect(placeholder.dataset.headerHeight).toBe('40');
    expect(placeholder.dataset.footerHeight).toBe('18');
    expect(placeholder.dataset.gapHeight).toBe('5');
    expect(placeholder.dataset.totalHeight).toBe('63');

    const fillerWidget = widgets.find((item) => item.type.spec?.key === 'custom-fill');
    expect(fillerWidget).toBeDefined();
    expect(fillerWidget.from).toBe(4);
    const fillerDom = fillerWidget.type.toDOM(null);
    expect(fillerDom.className).toBe('page-fill-spacer');
    expect(fillerDom.dataset.pageFillSpacer).toBe('true');
    expect(fillerDom.dataset.pageFillHeight).toBe('30');
    expect(fillerDom.dataset.pageFillIndex).toBe('2');

    const trailingWidget = widgets.find((item) => item.type.spec?.key?.startsWith('page-trailing-spacer'));
    expect(trailingWidget).toBeDefined();
    expect(trailingWidget.from).toBe(doc.content.size);
    const trailingDom = trailingWidget.type.toDOM(null);
    expect(trailingDom.className).toBe('page-trailing-spacer');
    expect(trailingDom.dataset.trailingSpacer).toBe('true');
    expect(trailingDom.style.height).toBe('25px');
    expect(trailingDom.dataset.trailingSpacerHeight).toBe('25');
  });

  it('renders trailing page breaks at the end of the document when no position is supplied', () => {
    const doc = createDoc('content');
    const decorations = buildPageBreakDecorations(doc, [
      {
        placeholder: {},
      },
    ]);

    const widgets = decorations.find();

    expect(widgets).toHaveLength(1);
    const trailingWidget = widgets[0];
    expect(trailingWidget.from).toBe(doc.content.size);
    const wrapper = trailingWidget.type.toDOM(null);
    expect(wrapper.className).toBe('page-break-wrapper');
    const placeholder = wrapper.querySelector('.page-break');
    expect(placeholder).toBeTruthy();
    expect(placeholder.dataset.pageIndex).toBe('0');
    expect(placeholder.dataset.pageNumber).toBe('1');
    expect(placeholder.dataset.totalHeight).toBe('0');
  });

  describe('position resolution', () => {
    it('resolves position from break.pos property', () => {
      const doc = createDoc('test content');
      const decorations = buildPageBreakDecorations(doc, [
        {
          break: { pos: 3 },
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].from).toBe(3);
    });

    it('resolves position from boundary.to property', () => {
      const doc = createDoc('test content');
      const decorations = buildPageBreakDecorations(doc, [
        {
          boundary: { to: 5 },
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].from).toBe(5);
    });

    it('resolves position from to property', () => {
      const doc = createDoc('test content');
      const decorations = buildPageBreakDecorations(doc, [
        {
          to: 4,
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].from).toBe(4);
    });

    it('prioritizes pos over break.pos', () => {
      const doc = createDoc('test content');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          break: { pos: 3 },
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets[0].from).toBe(2);
    });

    it('falls back to doc.content.size when position is NaN', () => {
      const doc = createDoc('test content');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: NaN,
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets[0].from).toBe(doc.content.size);
    });

    it('falls back to doc.content.size when no position properties exist', () => {
      const doc = createDoc('test content');
      const decorations = buildPageBreakDecorations(doc, [
        {
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets[0].from).toBe(doc.content.size);
    });
  });

  describe('invalid input handling', () => {
    it('handles negative leadingSpacingPx gracefully (no spacer rendered)', () => {
      const doc = createDoc();
      const decorations = buildPageBreakDecorations(doc, [], {
        leadingSpacingPx: -10,
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(0);
      expect(decorations).toBe(DecorationSet.empty);
    });

    it('handles negative trailingSpacingPx gracefully (no spacer rendered)', () => {
      const doc = createDoc();
      const decorations = buildPageBreakDecorations(doc, [], {
        trailingSpacingPx: -10,
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(0);
      expect(decorations).toBe(DecorationSet.empty);
    });

    it('handles NaN spacing values by treating them as 0', () => {
      const doc = createDoc();
      const decorations = buildPageBreakDecorations(doc, [], {
        leadingSpacingPx: NaN,
        trailingSpacingPx: NaN,
      });

      expect(decorations).toBe(DecorationSet.empty);
    });

    it('handles undefined options object', () => {
      const doc = createDoc();
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
    });

    it('handles null pageBreaks array', () => {
      const doc = createDoc();
      const decorations = buildPageBreakDecorations(doc, null);

      expect(decorations).toBe(DecorationSet.empty);
    });

    it('handles non-array pageFillers option', () => {
      const doc = createDoc();
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: 'not-an-array',
      });

      expect(decorations).toBe(DecorationSet.empty);
    });
  });

  describe('height override arrays', () => {
    it('uses header override from pageHeaderHeights array', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          {
            pos: 2,
            pageIndex: 0,
            placeholder: { headerHeightPx: 10, footerHeightPx: 10, gapHeightPx: 5 },
          },
        ],
        {
          pageHeaderHeights: [20, 30],
          pageFooterHeights: [15],
        },
      );

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');
      // Next page (pageIndex + 1 = 1) should use headerHeights[1] = 30
      expect(placeholder.dataset.headerHeight).toBe('30');
      // Current page footer should use footerHeights[0] = 15
      expect(placeholder.dataset.footerHeight).toBe('15');
    });

    it('clamps index when pageHeaderHeights index is out of bounds (too high)', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          {
            pos: 2,
            pageIndex: 10,
            placeholder: { headerHeightPx: 10, footerHeightPx: 10 },
          },
        ],
        {
          pageHeaderHeights: [20, 30],
        },
      );

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');
      // Should clamp to last element (30)
      expect(placeholder.dataset.headerHeight).toBe('30');
    });

    it('clamps index when pageFooterHeights index is negative', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          {
            pos: 2,
            pageIndex: -5,
            placeholder: { headerHeightPx: 10, footerHeightPx: 10 },
          },
        ],
        {
          pageFooterHeights: [25, 35],
        },
      );

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');
      // Should clamp to first element (25)
      expect(placeholder.dataset.footerHeight).toBe('25');
    });

    it('returns null for empty height arrays', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          {
            pos: 2,
            pageIndex: 0,
            placeholder: { headerHeightPx: 10, footerHeightPx: 10 },
          },
        ],
        {
          pageHeaderHeights: [],
          pageFooterHeights: [],
        },
      );

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');
      // Should fall back to placeholder values
      expect(placeholder.dataset.headerHeight).toBe('10');
      expect(placeholder.dataset.footerHeight).toBe('10');
    });

    it('falls back to placeholder when override is 0', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          {
            pos: 2,
            pageIndex: 0,
            placeholder: { headerHeightPx: 10, footerHeightPx: 10 },
          },
        ],
        {
          pageHeaderHeights: [0],
          pageFooterHeights: [0],
        },
      );

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');
      // Should fall back to placeholder values since override is 0
      expect(placeholder.dataset.headerHeight).toBe('10');
      expect(placeholder.dataset.footerHeight).toBe('10');
    });
  });

  describe('multiple page breaks', () => {
    it('renders multiple page breaks in correct order', () => {
      const doc = createDoc('long content here');
      const decorations = buildPageBreakDecorations(doc, [
        { pos: 3, pageIndex: 0, placeholder: { headerHeightPx: 10 } },
        { pos: 7, pageIndex: 1, placeholder: { headerHeightPx: 20 } },
        { pos: 12, pageIndex: 2, placeholder: { headerHeightPx: 30 } },
      ]);

      const widgets = decorations.find();
      expect(widgets).toHaveLength(3);
      expect(widgets[0].from).toBe(3);
      expect(widgets[1].from).toBe(7);
      expect(widgets[2].from).toBe(12);
    });

    it('generates unique keys for multiple page breaks', () => {
      const doc = createDoc('content');
      const decorations = buildPageBreakDecorations(doc, [
        { pos: 2, pageIndex: 0, placeholder: {} },
        { pos: 4, pageIndex: 1, placeholder: {} },
        { pos: 6, pageIndex: 2, placeholder: {} },
      ]);

      const widgets = decorations.find();
      expect(widgets[0].type.spec.key).toBe('page-break-0');
      expect(widgets[1].type.spec.key).toBe('page-break-1');
      expect(widgets[2].type.spec.key).toBe('page-break-2');
    });

    it('generates keys based on position when pageIndex is missing', () => {
      const doc = createDoc('content');
      const decorations = buildPageBreakDecorations(doc, [
        { pos: 2, placeholder: {} },
        { pos: 4, placeholder: {} },
      ]);

      const widgets = decorations.find();
      expect(widgets[0].type.spec.key).toBe('page-break-2-0');
      expect(widgets[1].type.spec.key).toBe('page-break-4-1');
    });
  });

  describe('page fillers', () => {
    it('renders page filler with auto-generated key when key not provided', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [{ pos: 3, heightPx: 20 }],
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].type.spec.key).toBe('page-fill-3-0');
    });

    it('renders page filler without pageIndex dataset when not provided', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [{ pos: 3, heightPx: 20 }],
      });

      const widgets = decorations.find();
      const dom = widgets[0].type.toDOM(null);
      expect(dom.dataset.pageFillIndex).toBeUndefined();
    });

    it('skips page fillers with zero height', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [
          { pos: 3, heightPx: 0 },
          { pos: 5, heightPx: 20 },
        ],
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].from).toBe(5);
    });

    it('skips page fillers with negative height', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [
          { pos: 3, heightPx: -10 },
          { pos: 5, heightPx: 20 },
        ],
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].from).toBe(5);
    });

    it('renders multiple page fillers with correct positioning and side=-1', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [
          { pos: 2, heightPx: 10, key: 'fill-a' },
          { pos: 4, heightPx: 15, key: 'fill-b', pageIndex: 1 },
        ],
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(2);
      expect(widgets[0].from).toBe(2);
      expect(widgets[0].type.spec.key).toBe('fill-a');
      expect(widgets[0].type.spec.side).toBe(-1);
      expect(widgets[1].from).toBe(4);
      expect(widgets[1].type.spec.key).toBe('fill-b');

      const domB = widgets[1].type.toDOM(null);
      expect(domB.dataset.pageFillIndex).toBe('1');
    });

    it('uses doc.content.size when filler pos is not finite', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [{ pos: NaN, heightPx: 20 }],
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(1);
      expect(widgets[0].from).toBe(doc.content.size);
    });
  });

  describe('segment rendering', () => {
    it('includes all three segments (footer, gap, header) when all heights are positive', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: { headerHeightPx: 20, footerHeightPx: 15, gapHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      const footer = placeholder.querySelector('.page-break__footer');
      const gap = placeholder.querySelector('.page-break__gap');
      const header = placeholder.querySelector('.page-break__header');

      expect(footer).toBeTruthy();
      expect(gap).toBeTruthy();
      expect(header).toBeTruthy();

      expect(footer.dataset.segmentHeight).toBe('15');
      expect(gap.dataset.segmentHeight).toBe('10');
      expect(header.dataset.segmentHeight).toBe('20');
    });

    it('skips segments with zero height', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: { headerHeightPx: 20, footerHeightPx: 0, gapHeightPx: 0 },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      const footer = placeholder.querySelector('.page-break__footer');
      const gap = placeholder.querySelector('.page-break__gap');
      const header = placeholder.querySelector('.page-break__header');

      expect(footer).toBeNull();
      expect(gap).toBeNull();
      expect(header).toBeTruthy();
      expect(header.dataset.segmentHeight).toBe('20');
    });

    it('includes breakPos dataset when break.pos is an integer', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          break: { pos: 5 },
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      expect(placeholder.dataset.breakPos).toBe('5');
    });

    it('does not include breakPos dataset when break.pos is missing', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: { headerHeightPx: 10 },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      expect(placeholder.dataset.breakPos).toBeUndefined();
    });
  });

  describe('combined spacer behavior', () => {
    it('creates wrapper with padding when spacerHeight > 0', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: { headerHeightPx: 20, footerHeightPx: 10, gapHeightPx: 5 },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);

      // spacerHeight = headerHeight + gapHeight = 20 + 5 = 25
      expect(wrapper.style.paddingTop).toBe('25px');

      const placeholder = wrapper.querySelector('.page-break');
      expect(placeholder.style.marginTop).toBe('-25px');
    });

    it('creates wrapper without padding when spacerHeight is 0', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: { headerHeightPx: 0, footerHeightPx: 10, gapHeightPx: 0 },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);

      expect(wrapper.style.paddingTop).toBe('');

      const placeholder = wrapper.querySelector('.page-break');
      expect(placeholder.style.marginTop).toBe('');
    });
  });

  describe('total height calculation', () => {
    it('calculates total height from component heights', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: {
            headerHeightPx: 10,
            footerHeightPx: 15,
            gapHeightPx: 5,
          },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      // 10 + 15 + 5 = 30
      expect(placeholder.dataset.totalHeight).toBe('30');
      expect(placeholder.style.height).toBe('30px');
    });

    it('calculates total height from overridden component heights', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          {
            pos: 2,
            pageIndex: 0,
            placeholder: { headerHeightPx: 10, footerHeightPx: 10, gapHeightPx: 5 },
          },
        ],
        {
          pageHeaderHeights: [0, 20],
          pageFooterHeights: [15],
        },
      );

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      // headerHeight (from override[1]) = 20, footerHeight (from override[0]) = 15, gap = 5
      // Total = 20 + 15 + 5 = 40
      expect(placeholder.dataset.totalHeight).toBe('40');
      expect(placeholder.style.height).toBe('40px');
    });

    it('handles zero heights correctly', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [
        {
          pos: 2,
          placeholder: {
            headerHeightPx: 0,
            footerHeightPx: 0,
            gapHeightPx: 0,
          },
        },
      ]);

      const widgets = decorations.find();
      const wrapper = widgets[0].type.toDOM(null);
      const placeholder = wrapper.querySelector('.page-break');

      expect(placeholder.dataset.totalHeight).toBe('0');
      expect(placeholder.style.height).toBe('0px');
    });
  });

  describe('leading spacer edge cases', () => {
    it('renders leading spacer with segment child element', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        leadingSpacingPx: 25,
      });

      const widgets = decorations.find();
      const spacer = widgets[0].type.toDOM(null);

      expect(spacer.className).toBe('page-leading-spacer');
      expect(spacer.dataset.leadingSpacerSegment).toBe('header');

      const segment = spacer.querySelector('.page-leading-spacer__header');
      expect(segment).toBeTruthy();
      expect(segment.dataset.segmentHeight).toBe('25');
    });

    it('does not render leading spacer when spacing is 0', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [{ pos: 2, placeholder: { headerHeightPx: 10 } }], {
        leadingSpacingPx: 0,
      });

      const widgets = decorations.find();
      const leadingWidget = widgets.find((item) => item.type.spec?.key?.startsWith('page-leading-spacer'));
      expect(leadingWidget).toBeUndefined();
    });
  });

  describe('trailing spacer edge cases', () => {
    it('renders trailing spacer with segment child element', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [], {
        trailingSpacingPx: 30,
      });

      const widgets = decorations.find();
      const spacer = widgets[0].type.toDOM(null);

      expect(spacer.className).toBe('page-trailing-spacer');
      expect(spacer.dataset.trailingSpacerSegment).toBe('footer');

      const segment = spacer.querySelector('.page-trailing-spacer__footer');
      expect(segment).toBeTruthy();
      expect(segment.dataset.segmentHeight).toBe('30');
    });

    it('does not render trailing spacer when spacing is 0', () => {
      const doc = createDoc('test');
      const decorations = buildPageBreakDecorations(doc, [{ pos: 2, placeholder: { headerHeightPx: 10 } }], {
        trailingSpacingPx: 0,
      });

      const widgets = decorations.find();
      const trailingWidget = widgets.find((item) => item.type.spec?.key?.startsWith('page-trailing-spacer'));
      expect(trailingWidget).toBeUndefined();
    });

    it('positions trailing spacer at doc.content.size', () => {
      const doc = createDoc('test content here');
      const decorations = buildPageBreakDecorations(doc, [], {
        trailingSpacingPx: 30,
      });

      const widgets = decorations.find();
      expect(widgets[0].from).toBe(doc.content.size);
    });
  });

  describe('complex scenarios', () => {
    it('combines leading spacer, multiple breaks, fillers, and trailing spacer', () => {
      const doc = createDoc('long test content');
      const decorations = buildPageBreakDecorations(
        doc,
        [
          { pos: 3, pageIndex: 0, placeholder: { headerHeightPx: 10 } },
          { pos: 8, pageIndex: 1, placeholder: { headerHeightPx: 15 } },
        ],
        {
          leadingSpacingPx: 20,
          trailingSpacingPx: 25,
          pageFillers: [
            { pos: 5, heightPx: 12, key: 'fill-1' },
            { pos: 10, heightPx: 18, key: 'fill-2' },
          ],
        },
      );

      const widgets = decorations.find();

      // leading + 2 breaks + 2 fillers + trailing = 6
      expect(widgets).toHaveLength(6);

      // Widgets should be sorted by position
      const widgetsByPos = widgets.map((w) => ({ pos: w.from, key: w.type.spec.key }));

      // Find each widget type
      const leadingWidget = widgets.find((w) => w.type.spec.key?.includes('page-leading-spacer'));
      const trailingWidget = widgets.find((w) => w.type.spec.key?.includes('page-trailing-spacer'));
      const break0Widget = widgets.find((w) => w.type.spec.key === 'page-break-0');
      const break1Widget = widgets.find((w) => w.type.spec.key === 'page-break-1');
      const fill1Widget = widgets.find((w) => w.type.spec.key === 'fill-1');
      const fill2Widget = widgets.find((w) => w.type.spec.key === 'fill-2');

      expect(leadingWidget).toBeDefined();
      expect(leadingWidget.from).toBe(0);
      expect(trailingWidget).toBeDefined();
      expect(trailingWidget.from).toBe(doc.content.size);
      expect(break0Widget).toBeDefined();
      expect(break0Widget.from).toBe(3);
      expect(break1Widget).toBeDefined();
      expect(break1Widget.from).toBe(8);
      expect(fill1Widget).toBeDefined();
      expect(fill1Widget.from).toBe(5);
      expect(fill2Widget).toBeDefined();
      expect(fill2Widget.from).toBe(10);
    });

    it('handles document with only fillers (no page breaks or spacers)', () => {
      const doc = createDoc('content');
      const decorations = buildPageBreakDecorations(doc, [], {
        pageFillers: [
          { pos: 2, heightPx: 10 },
          { pos: 4, heightPx: 15 },
        ],
      });

      const widgets = decorations.find();
      expect(widgets).toHaveLength(2);
      expect(widgets[0].type.spec.key).toBe('page-fill-2-0');
      expect(widgets[1].type.spec.key).toBe('page-fill-4-1');
    });
  });
});
