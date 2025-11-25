declare module '@superdoc/painter-dom' {
  import type { FlowBlock, Fragment, Measure, Page, PainterDOM, PageMargins } from '@superdoc/contracts';

  export type LayoutMode = 'vertical' | 'horizontal' | 'book';

  export type PageDecorationPayload = {
    fragments: Fragment[];
    height: number;
    offset?: number;
    marginLeft?: number;
    contentWidth?: number;
    headerId?: string;
    sectionType?: string;
    box?: { x: number; y: number; width: number; height: number };
    hitRegion?: { x: number; y: number; width: number; height: number };
  };

  export type PageDecorationProvider = (
    pageNumber: number,
    pageMargins?: PageMargins,
    page?: Page,
  ) => PageDecorationPayload | null;

  export type DomPainterOptions = {
    blocks: FlowBlock[];
    measures: Measure[];
    pageStyles?: unknown;
    layoutMode?: LayoutMode;
    headerProvider?: PageDecorationProvider;
    footerProvider?: PageDecorationProvider;
    virtualization?: {
      enabled?: boolean;
      window?: number;
      overscan?: number;
      gap?: number;
      paddingTop?: number;
    };
  };

  export const createDomPainter: (options: DomPainterOptions) => PainterDOM & {
    setProviders?: (header?: PageDecorationProvider, footer?: PageDecorationProvider) => void;
  };
}
