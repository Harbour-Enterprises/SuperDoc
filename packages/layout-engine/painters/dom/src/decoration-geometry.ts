import type { Fragment, ResolvedPage, ResolvedPaintItem } from '@superdoc/contracts';
import {
  isPagePositionedFloatingTable,
  isPagePositionedParagraphFrame,
  isPositionedParagraphFrame,
  resolveFooterPageFrameOriginY,
} from '@superdoc/contracts';
import type { PageDecorationPayload } from './renderer.js';

export type DecorationPageGeometry = Pick<
  ResolvedPage,
  'height' | 'margins' | 'baseMargins' | 'footnoteReserved' | 'index'
>;

/**
 * Check if a fragment is vertically anchored to the page.
 * Used to determine special Y positioning for page-relative anchored content
 * in header/footer decoration sections.
 */
function isPageRelativeAnchoredFragment(
  fragment: Fragment,
  resolvedItem: ResolvedPaintItem | undefined,
  kind: 'header' | 'footer',
): boolean {
  if (isPageRelativeParagraphFrame(fragment, resolvedItem)) return true;
  const block = resolvedItem && 'block' in resolvedItem ? resolvedItem.block : undefined;
  if (
    kind === 'footer' &&
    fragment.kind === 'table' &&
    fragment.isAnchored === true &&
    isPagePositionedFloatingTable(block)
  ) {
    return true;
  }
  return (
    (fragment.kind === 'image' || fragment.kind === 'drawing') &&
    (block?.kind === 'image' || block?.kind === 'drawing') &&
    block.anchor?.vRelativeFrom === 'page'
  );
}

function isPageRelativeParagraphFrame(fragment: Fragment, resolvedItem: ResolvedPaintItem | undefined): boolean {
  if (fragment.kind !== 'para') return false;
  const block = resolvedItem && 'block' in resolvedItem ? resolvedItem.block : undefined;
  const frame = block?.kind === 'paragraph' ? block.attrs?.frame : undefined;
  return isPagePositionedParagraphFrame(frame);
}

function isPageRelativeHorizontalAnchoredFragment(
  fragment: Fragment,
  resolvedItem: ResolvedPaintItem | undefined,
  kind: 'header' | 'footer',
): boolean {
  const block = resolvedItem && 'block' in resolvedItem ? resolvedItem.block : undefined;
  if (fragment.kind === 'para' && block?.kind === 'paragraph') {
    const frame = block.attrs?.frame;
    return isPositionedParagraphFrame(frame) && frame.hAnchor === 'page';
  }
  if (fragment.kind === 'table' && block?.kind === 'table') {
    return (
      kind === 'footer' &&
      fragment.isAnchored === true &&
      block.anchor?.isAnchored === true &&
      block.anchor.hRelativeFrom === 'page'
    );
  }
  if (fragment.kind !== 'image' && fragment.kind !== 'drawing') {
    return false;
  }
  if (!block || (block.kind !== 'image' && block.kind !== 'drawing')) {
    return false;
  }
  return block.anchor?.hRelativeFrom === 'page';
}

/**
 * Header/footer layout emits normalized anchor Y coordinates:
 * - headers: local to the header container origin
 * - footers: local to the top of the footer band (pageHeight - bottomMargin)
 *
 * Footer containers can grow upward when content overflows the reserved footer
 * band, so their top edge is not always the same as the footer band origin.
 * This helper returns the page-space origin that normalized anchor Y values
 * are measured from.
 */
function getDecorationAnchorPageOriginY(
  page: DecorationPageGeometry,
  kind: 'header' | 'footer',
  effectiveOffset: number,
): number {
  if (kind === 'header') {
    return effectiveOffset;
  }

  if (!Number.isFinite(page.height) || page.height <= 0) {
    throw new Error(
      `DomPainter: invalid ResolvedPage.height (${page.height}) for page ${page.index}; resolve stage must produce a positive numeric height.`,
    );
  }

  const pageMargins = page.margins;
  const pageHeight = page.height;

  const footerDistance = pageMargins?.footer;
  if (typeof footerDistance === 'number' && Number.isFinite(footerDistance)) {
    return Math.max(0, pageHeight - Math.max(0, footerDistance));
  }

  const bottomMargin = pageMargins?.bottom;
  if (bottomMargin == null) {
    return effectiveOffset;
  }

  const footnoteReserve = page.footnoteReserved ?? 0;
  const adjustedBottomMargin = Math.max(0, bottomMargin - footnoteReserve);

  return Math.max(0, pageHeight - adjustedBottomMargin);
}

function getFooterFragmentAnchorPageOriginY(
  page: DecorationPageGeometry,
  effectiveOffset: number,
  fragment: Fragment,
  resolvedItem: ResolvedPaintItem | undefined,
): number {
  const mediaOrigin = getDecorationAnchorPageOriginY(page, 'footer', effectiveOffset);
  if (!isPageRelativeParagraphFrame(fragment, resolvedItem)) return mediaOrigin;

  return resolveFooterPageFrameOriginY(page.height, page.baseMargins?.bottom ?? page.margins?.bottom);
}

export function resolveDecorationBandGeometry(data: PageDecorationPayload, kind: 'header' | 'footer') {
  let effectiveHeight = data.height;
  let effectiveOffset = data.offset ?? 0;
  if (
    kind === 'footer' &&
    typeof data.contentHeight === 'number' &&
    Number.isFinite(data.contentHeight) &&
    data.contentHeight > 0 &&
    data.contentHeight > data.height
  ) {
    effectiveHeight = data.contentHeight;
    effectiveOffset -= data.contentHeight - data.height;
  }
  let footerYOffset = 0;
  if (kind === 'footer' && data.fragments.length > 0) {
    const contentHeight =
      typeof data.contentHeight === 'number'
        ? data.contentHeight
        : data.fragments.reduce((max, fragment, index) => {
            const item = data.items?.[index];
            const height =
              'height' in fragment && typeof fragment.height === 'number'
                ? fragment.height
                : item && 'height' in item && typeof item.height === 'number'
                  ? item.height
                  : 0;
            return Math.max(max, fragment.y + Math.max(0, height));
          }, 0);
    footerYOffset = Math.max(0, effectiveHeight - contentHeight);
  }
  return { effectiveHeight, effectiveOffset, footerYOffset };
}

/** Page-local coordinates shared by canonical painting and neutral edit geometry. */
export function resolveDecorationFragmentPosition(
  page: DecorationPageGeometry,
  kind: 'header' | 'footer',
  data: PageDecorationPayload,
  fragment: Fragment,
  item: ResolvedPaintItem | undefined,
  band = resolveDecorationBandGeometry(data, kind),
  behindDocument = false,
) {
  const pageRelative = isPageRelativeAnchoredFragment(fragment, item, kind);
  const localX = !behindDocument && item?.kind === 'fragment' ? item.x : fragment.x;
  const localY = !behindDocument && item?.kind === 'fragment' ? item.y : fragment.y;
  const x = isPageRelativeHorizontalAnchoredFragment(fragment, item, kind)
    ? fragment.x
    : localX + (data.marginLeft ?? 0);
  const containerOrigin = behindDocument ? band.effectiveOffset : Math.max(0, band.effectiveOffset);
  const y = pageRelative
    ? (behindDocument ? 0 : containerOrigin - band.effectiveOffset) +
      fragment.y +
      (kind === 'footer' ? getFooterFragmentAnchorPageOriginY(page, band.effectiveOffset, fragment, item) : 0)
    : containerOrigin +
      (kind === 'footer' && band.footerYOffset > 0 ? localY || fragment.y : localY) +
      (kind === 'footer' ? band.footerYOffset : 0);
  return { x, y };
}
