import type { FlowBlock, Fragment, Layout, Measure, PainterPDF, PageMargins } from '@superdoc/contracts';
import { PdfPainter } from './renderer.js';

export type PdfPainterOptions = {
  blocks: FlowBlock[];
  measures: Measure[];
  headerProvider?: PageDecorationProvider;
  footerProvider?: PageDecorationProvider;
};

export type PageDecorationPayload = {
  fragments: Fragment[];
  height: number;
  /** Optional measured content height to aid bottom alignment in footers. */
  contentHeight?: number;
  offset?: number;
  marginLeft?: number;
};

export type PageDecorationProvider = (pageNumber: number, pageMargins?: PageMargins) => PageDecorationPayload | null;

export const createPdfPainter = (options: PdfPainterOptions): PainterPDF => {
  const painter = new PdfPainter(options.blocks, options.measures, {
    headerProvider: options.headerProvider,
    footerProvider: options.footerProvider,
  });

  return {
    render(layout: Layout) {
      return painter.render(layout);
    },
  };
};
