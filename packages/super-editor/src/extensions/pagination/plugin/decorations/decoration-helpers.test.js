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
});
