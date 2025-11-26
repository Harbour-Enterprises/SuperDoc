import type { HeaderFooterType, Layout } from '@superdoc/contracts';

export type HeaderFooterIdentifier = {
  headerIds: Record<'default' | 'first' | 'even' | 'odd', string | null>;
  footerIds: Record<'default' | 'first' | 'even' | 'odd', string | null>;
  titlePg: boolean;
  alternateHeaders: boolean;
};

export const defaultHeaderFooterIdentifier = (): HeaderFooterIdentifier => ({
  headerIds: { default: null, first: null, even: null, odd: null },
  footerIds: { default: null, first: null, even: null, odd: null },
  titlePg: false,
  alternateHeaders: false,
});

export type ConverterLike = {
  headerIds?: {
    default?: string | null;
    first?: string | null;
    even?: string | null;
    odd?: string | null;
    titlePg?: boolean;
  };
  footerIds?: {
    default?: string | null;
    first?: string | null;
    even?: string | null;
    odd?: string | null;
    titlePg?: boolean;
  };
  pageStyles?: {
    alternateHeaders?: boolean;
  };
};

export const extractIdentifierFromConverter = (converter?: ConverterLike | null): HeaderFooterIdentifier => {
  const identifier = defaultHeaderFooterIdentifier();
  if (!converter) return identifier;

  const headerIds = converter.headerIds ?? {};
  const footerIds = converter.footerIds ?? {};

  identifier.headerIds = {
    default: headerIds.default ?? null,
    first: headerIds.first ?? null,
    even: headerIds.even ?? null,
    odd: headerIds.odd ?? null,
  };

  identifier.footerIds = {
    default: footerIds.default ?? null,
    first: footerIds.first ?? null,
    even: footerIds.even ?? null,
    odd: footerIds.odd ?? null,
  };

  identifier.titlePg = Boolean(headerIds.titlePg ?? footerIds.titlePg ?? false);
  identifier.alternateHeaders = Boolean(converter.pageStyles?.alternateHeaders ?? false);

  return identifier;
};

export const getHeaderFooterType = (
  pageNumber: number,
  identifier: HeaderFooterIdentifier,
  options?: { kind?: 'header' | 'footer' },
): HeaderFooterType | null => {
  if (pageNumber <= 0) return null;

  const kind = options?.kind ?? 'header';
  const ids = kind === 'header' ? identifier.headerIds : identifier.footerIds;

  const hasFirst = Boolean(ids.first);
  const hasEven = Boolean(ids.even);
  const hasOdd = Boolean(ids.odd);
  const hasDefault = Boolean(ids.default);

  const titlePgEnabled = identifier.titlePg && hasFirst;
  const isFirstPage = pageNumber === 1;
  if (isFirstPage && titlePgEnabled) {
    return 'first';
  }

  if (identifier.alternateHeaders) {
    if (pageNumber % 2 === 0 && (hasEven || hasDefault)) {
      return hasEven ? 'even' : 'default';
    }
    if (pageNumber % 2 === 1 && (hasOdd || hasDefault)) {
      return hasOdd ? 'odd' : 'default';
    }
  }

  if (hasDefault) {
    return 'default';
  }

  return null;
};

export const resolveHeaderFooterForPage = (
  layout: Layout,
  pageIndex: number,
  identifier: HeaderFooterIdentifier,
  options?: { kind?: 'header' | 'footer' },
) => {
  const pageNumber = layout.pages[pageIndex]?.number ?? pageIndex + 1;
  const type = getHeaderFooterType(pageNumber, identifier, options);
  if (!type) {
    return null;
  }
  const slot = layout.headerFooter?.[type];
  if (!slot) {
    return null;
  }
  const page = slot.pages.find((entry) => entry.number === pageNumber) ?? slot.pages[0];
  if (!page) {
    return null;
  }

  return {
    type,
    layout: slot,
    page,
  };
};
