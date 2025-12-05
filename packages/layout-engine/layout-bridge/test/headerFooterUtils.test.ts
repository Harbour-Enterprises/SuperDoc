import { describe, expect, it } from 'vitest';
import type { Layout } from '@superdoc/contracts';
import {
  defaultHeaderFooterIdentifier,
  extractIdentifierFromConverter,
  getHeaderFooterType,
  getHeaderFooterTypeForSection,
  resolveHeaderFooterForPage,
  resolveHeaderFooterForPageAndSection,
  buildMultiSectionIdentifier,
} from '../src/headerFooterUtils';
import type { SectionMetadata } from '@superdoc/contracts';

const makeLayout = (): Layout => ({
  pageSize: { w: 600, h: 800 },
  pages: [
    { number: 1, fragments: [] },
    { number: 2, fragments: [] },
    { number: 3, fragments: [] },
  ],
  headerFooter: {
    default: {
      height: 36,
      pages: [
        { number: 1, fragments: [] },
        { number: 2, fragments: [] },
        { number: 3, fragments: [] },
      ],
    },
    first: {
      height: 40,
      pages: [{ number: 1, fragments: [] }],
    },
    even: {
      height: 32,
      pages: [{ number: 2, fragments: [] }],
    },
    odd: {
      height: 32,
      pages: [{ number: 3, fragments: [] }],
    },
  },
});

describe('headerFooterUtils', () => {
  it('extracts identifiers from SuperConverter metadata', () => {
    const identifier = extractIdentifierFromConverter({
      headerIds: { default: 'rId1', first: 'rId2', even: 'rId3', odd: 'rId4', titlePg: true },
      footerIds: { default: 'rId10' },
      pageStyles: { alternateHeaders: true },
    });

    expect(identifier.headerIds).toMatchObject({
      default: 'rId1',
      first: 'rId2',
      even: 'rId3',
      odd: 'rId4',
    });
    expect(identifier.footerIds.default).toBe('rId10');
    expect(identifier.titlePg).toBe(true);
    expect(identifier.alternateHeaders).toBe(true);
  });

  it('resolves first/even/odd precedence', () => {
    const identifier = extractIdentifierFromConverter({
      headerIds: { default: 'rId1', first: 'rIdFirst', even: 'rIdEven', odd: 'rIdOdd', titlePg: true },
      pageStyles: { alternateHeaders: true },
    });

    expect(getHeaderFooterType(1, identifier)).toBe('first');
    expect(getHeaderFooterType(2, identifier)).toBe('even');
    expect(getHeaderFooterType(3, identifier)).toBe('odd');
  });

  it('falls back to default when alternating slots missing', () => {
    const identifier = extractIdentifierFromConverter({
      headerIds: { default: 'rId1' },
      pageStyles: { alternateHeaders: true },
    });

    expect(getHeaderFooterType(2, identifier)).toBe('default');
    expect(getHeaderFooterType(3, identifier)).toBe('default');
  });

  it('resolves layout/page payloads for a given page', () => {
    const identifier = extractIdentifierFromConverter({
      headerIds: { default: 'rId1', first: 'rIdFirst', titlePg: true },
    });
    const layout = makeLayout();

    const first = resolveHeaderFooterForPage(layout, 0, identifier, { kind: 'header' });
    expect(first?.type).toBe('first');
    expect(first?.page.number).toBe(1);

    const defaultPage = resolveHeaderFooterForPage(layout, 1, identifier, { kind: 'header' });
    expect(defaultPage?.type).toBe('default');
    expect(defaultPage?.page.number).toBe(2);
  });

  it('returns null when identifier is empty', () => {
    const identifier = defaultHeaderFooterIdentifier();
    expect(getHeaderFooterType(1, identifier)).toBeNull();
  });

  it('honors footer identifiers separately from headers', () => {
    const identifier = extractIdentifierFromConverter({
      headerIds: { default: 'header-default' },
      footerIds: { default: 'footer-default', even: 'footer-even' },
      pageStyles: { alternateHeaders: true },
    });

    expect(getHeaderFooterType(1, identifier)).toBe('default');
    expect(getHeaderFooterType(2, identifier, { kind: 'footer' })).toBe('even');
  });

  it('returns null for invalid page numbers', () => {
    const identifier = extractIdentifierFromConverter({ headerIds: { default: 'rId1' } });
    expect(getHeaderFooterType(0, identifier)).toBeNull();
    expect(getHeaderFooterType(-1, identifier)).toBeNull();
  });

  it('returns null when layout has no headerFooter data', () => {
    const identifier = extractIdentifierFromConverter({ headerIds: { default: 'rId1' } });
    const layout: Layout = { pageSize: { w: 600, h: 800 }, pages: [{ number: 1, fragments: [] }] };
    expect(resolveHeaderFooterForPage(layout, 0, identifier)).toBeNull();
  });

  it('resolves first page when alternate headers disabled', () => {
    const identifier = extractIdentifierFromConverter({
      headerIds: { default: 'rId1', first: 'rIdFirst', titlePg: true },
    });

    expect(getHeaderFooterType(1, identifier)).toBe('first');
    expect(getHeaderFooterType(2, identifier)).toBe('default');
  });

  describe('scenario tests', () => {
    it('handles document with first page header only (no default)', () => {
      const identifier = extractIdentifierFromConverter({
        headerIds: { first: 'rIdFirst', titlePg: true },
      });

      // First page should resolve to 'first'
      expect(getHeaderFooterType(1, identifier)).toBe('first');
      // Subsequent pages have no header (returns null)
      expect(getHeaderFooterType(2, identifier)).toBeNull();
      expect(getHeaderFooterType(3, identifier)).toBeNull();
    });

    it('handles document with odd pages only (even pages fall back to default)', () => {
      const identifier = extractIdentifierFromConverter({
        headerIds: { default: 'rIdDefault', odd: 'rIdOdd' },
        pageStyles: { alternateHeaders: true },
      });

      // Odd pages use 'odd' variant
      expect(getHeaderFooterType(1, identifier)).toBe('odd');
      expect(getHeaderFooterType(3, identifier)).toBe('odd');
      expect(getHeaderFooterType(5, identifier)).toBe('odd');
      // Even pages fall back to 'default' (no 'even' variant defined)
      expect(getHeaderFooterType(2, identifier)).toBe('default');
      expect(getHeaderFooterType(4, identifier)).toBe('default');
    });

    it('handles document with all header/footer variants defined', () => {
      const identifier = extractIdentifierFromConverter({
        headerIds: { default: 'hDefault', first: 'hFirst', even: 'hEven', odd: 'hOdd', titlePg: true },
        footerIds: { default: 'fDefault', first: 'fFirst', even: 'fEven', odd: 'fOdd' },
        pageStyles: { alternateHeaders: true },
      });

      // Headers
      expect(getHeaderFooterType(1, identifier, { kind: 'header' })).toBe('first');
      expect(getHeaderFooterType(2, identifier, { kind: 'header' })).toBe('even');
      expect(getHeaderFooterType(3, identifier, { kind: 'header' })).toBe('odd');
      expect(getHeaderFooterType(4, identifier, { kind: 'header' })).toBe('even');

      // Footers
      expect(getHeaderFooterType(1, identifier, { kind: 'footer' })).toBe('first');
      expect(getHeaderFooterType(2, identifier, { kind: 'footer' })).toBe('even');
      expect(getHeaderFooterType(3, identifier, { kind: 'footer' })).toBe('odd');
      expect(getHeaderFooterType(4, identifier, { kind: 'footer' })).toBe('even');
    });

    it('handles document with no headers but footers present', () => {
      const identifier = extractIdentifierFromConverter({
        footerIds: { default: 'fDefault', first: 'fFirst', titlePg: true },
      });

      // No headers defined
      expect(getHeaderFooterType(1, identifier, { kind: 'header' })).toBeNull();
      expect(getHeaderFooterType(2, identifier, { kind: 'header' })).toBeNull();

      // Footers work correctly
      expect(getHeaderFooterType(1, identifier, { kind: 'footer' })).toBe('first');
      expect(getHeaderFooterType(2, identifier, { kind: 'footer' })).toBe('default');
      expect(getHeaderFooterType(3, identifier, { kind: 'footer' })).toBe('default');
    });
  });

  describe('multi-section first-page variants', () => {
    const sectionMetadata: SectionMetadata[] = [
      { sectionIndex: 0, headerRefs: { default: 'h0-default', first: 'h0-first' } },
      { sectionIndex: 1, headerRefs: { default: 'h1-default', first: 'h1-first' } },
    ];
    const layout: Layout = {
      pageSize: { w: 600, h: 800 },
      pages: [
        { number: 1, fragments: [], sectionIndex: 0 },
        { number: 2, fragments: [], sectionIndex: 0 },
        { number: 3, fragments: [], sectionIndex: 1 },
        { number: 4, fragments: [], sectionIndex: 1 },
      ],
      headerFooter: {
        default: {
          height: 36,
          pages: [{ number: 1, fragments: [] }],
        },
        first: {
          height: 40,
          pages: [{ number: 1, fragments: [] }],
        },
      },
    };

    it('treats the first page of a later section as a first-page header/footer', () => {
      const identifier = buildMultiSectionIdentifier(sectionMetadata);
      const sectionFirstPageType = getHeaderFooterTypeForSection(3, 1, identifier, {
        kind: 'header',
        sectionPageNumber: 1,
      });
      expect(sectionFirstPageType).toBe('first');

      const secondPageType = getHeaderFooterTypeForSection(4, 1, identifier, {
        kind: 'header',
        sectionPageNumber: 2,
      });
      expect(secondPageType).toBe('default');
    });

    it('resolves layout info with section-aware first-page detection', () => {
      const identifier = buildMultiSectionIdentifier(sectionMetadata);
      const resolved = resolveHeaderFooterForPageAndSection(layout, 2, identifier, { kind: 'header' });

      expect(resolved?.sectionIndex).toBe(1);
      expect(resolved?.type).toBe('first');
      expect(resolved?.contentId).toBe('h1-first');
    });
  });
});
