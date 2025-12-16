/**
 * Section Analysis Module
 *
 * Analyzes section ranges in documents using Word's "end-tagged" semantics.
 * A paragraph's sectPr defines properties for the section ENDING at that paragraph.
 */

import type { PMNode, AdapterOptions } from '../types.js';
import type { SectionRange, SectPrElement } from './types.js';
import { DEFAULT_PARAGRAPH_SECTION_TYPE, DEFAULT_BODY_SECTION_TYPE, SectionType } from './types.js';
import { extractSectionData } from './extraction.js';
import { isSectPrElement, hasSectPr, getSectPrFromNode } from './breaks.js';

/**
 * Determines if a section break should be ignored during section range analysis.
 *
 * A section break is ignored if:
 * 1. The paragraph contains content (not just a section marker)
 * 2. The paragraph has no sectPr element
 * 3. The sectPr has no type AND it's not the final section (body has sectPr)
 *
 * @param paragraph - The paragraph node to check
 * @param index - Index in the paragraphs array
 * @param total - Total number of paragraphs with sectPr
 * @param hasBodySectPr - Whether the document body has a sectPr
 * @returns true if the section break should be ignored
 */
export function shouldIgnoreSectionBreak(
  paragraph: PMNode,
  index: number,
  total: number,
  hasBodySectPr: boolean,
): boolean {
  // Extract sectPr from paragraph properties
  const paragraphAttrs = (paragraph.attrs ?? {}) as {
    paragraphProperties?: { sectPr?: SectPrElement };
    sectionMargins?: { header?: number | null; footer?: number | null };
  };
  const paragraphProperties = paragraphAttrs?.paragraphProperties;
  const sectPr = paragraphProperties?.sectPr as SectPrElement | undefined;
  if (!sectPr) return true;

  const hasElements = Array.isArray(sectPr.elements) && sectPr.elements.length > 0;
  const hasNormalizedMargins = (() => {
    const normalizedMargins = paragraphAttrs.sectionMargins;
    if (!normalizedMargins) return false;
    return normalizedMargins.header != null || normalizedMargins.footer != null;
  })();
  const isLastParagraphBreak = index === total - 1 && !hasBodySectPr;

  // If sectPr lacks any child elements, only keep it when it carries normalized metadata (margins)
  // or represents the fallback final section.
  if (!hasElements && !hasNormalizedMargins && !isLastParagraphBreak) return true;

  return false;
}

/**
 * Find all paragraphs in the document that contain sectPr elements.
 *
 * @param doc - ProseMirror document node
 * @returns Object containing paragraphs with sectPr and total paragraph count
 */
export function findParagraphsWithSectPr(doc: PMNode): {
  paragraphs: Array<{ index: number; node: PMNode }>;
  totalCount: number;
} {
  const paragraphs: Array<{ index: number; node: PMNode }> = [];
  let paragraphIndex = 0;

  if (doc.content) {
    for (const node of doc.content) {
      if (node.type === 'paragraph') {
        if (hasSectPr(node)) {
          paragraphs.push({ index: paragraphIndex, node });
        }
        paragraphIndex++;
      }
    }
  }

  return { paragraphs, totalCount: paragraphIndex };
}

/**
 * Build section ranges from paragraphs with sectPr using Word's "end-tagged" semantics.
 *
 * @param paragraphs - Array of paragraphs containing sectPr elements
 * @param hasBodySectPr - Whether the document has a body-level sectPr
 * @returns Array of section ranges
 */
export function buildSectionRangesFromParagraphs(
  paragraphs: Array<{ index: number; node: PMNode }>,
  hasBodySectPr: boolean,
): SectionRange[] {
  const ranges: SectionRange[] = [];
  let currentStart = 0;

  paragraphs.forEach((item, idx) => {
    if (shouldIgnoreSectionBreak(item.node, idx, paragraphs.length, hasBodySectPr)) {
      return;
    }
    const sectionData = extractSectionData(item.node);
    if (!sectionData) return;

    const sectPr = getSectPrFromNode(item.node);
    const range: SectionRange = {
      sectionIndex: idx,
      startParagraphIndex: currentStart,
      endParagraphIndex: item.index,
      sectPr,
      margins:
        sectionData.headerPx != null || sectionData.footerPx != null
          ? {
              header: sectionData.headerPx ?? 0,
              footer: sectionData.footerPx ?? 0,
              top: sectionData.topPx,
              right: sectionData.rightPx,
              bottom: sectionData.bottomPx,
              left: sectionData.leftPx,
            }
          : null,
      pageSize: sectionData.pageSizePx ?? null,
      orientation: sectionData.orientation ?? null,
      columns: sectionData.columnsPx ?? null,
      type: (sectionData.type as SectionType) ?? DEFAULT_PARAGRAPH_SECTION_TYPE,
      titlePg: sectionData.titlePg ?? false,
      headerRefs: sectionData.headerRefs,
      footerRefs: sectionData.footerRefs,
      numbering: sectionData.numbering,
      vAlign: sectionData.vAlign,
    };
    ranges.push(range);

    currentStart = item.index + 1;
  });

  return ranges;
}

/**
 * Publish section metadata to the adapter options for external consumers.
 *
 * @param sectionRanges - Section ranges to publish
 * @param options - Adapter options containing sectionMetadata array
 */
export function publishSectionMetadata(sectionRanges: SectionRange[], options?: AdapterOptions) {
  if (!options?.sectionMetadata) return;
  options.sectionMetadata.length = 0;
  sectionRanges.forEach((section) => {
    options.sectionMetadata?.push({
      sectionIndex: section.sectionIndex,
      headerRefs: section.headerRefs,
      footerRefs: section.footerRefs,
      numbering: section.numbering,
      titlePg: section.titlePg,
    });
  });
}

/**
 * Create final section range using body sectPr.
 *
 * Respects the section type from the body sectPr (nextPage, continuous, etc.)
 * rather than forcing it to continuous. This allows the final section to
 * trigger page breaks when needed (e.g., for orientation or page size changes).
 *
 * @param bodySectPr - Body-level sectPr element
 * @param currentStart - Starting paragraph index for this section
 * @param totalParagraphs - Total number of paragraphs in document
 * @param sectionIndex - Index for this section
 * @returns Section range or null if no data could be extracted
 */
export function createFinalSectionFromBodySectPr(
  bodySectPr: SectPrElement,
  currentStart: number,
  totalParagraphs: number,
  sectionIndex: number,
): SectionRange | null {
  const tempNode: PMNode = {
    type: 'paragraph',
    attrs: {
      paragraphProperties: { sectPr: bodySectPr },
    },
  };

  const bodySectionData = extractSectionData(tempNode);
  if (!bodySectionData) return null;

  return {
    sectionIndex,
    startParagraphIndex: currentStart,
    endParagraphIndex: totalParagraphs - 1,
    sectPr: bodySectPr,
    margins:
      bodySectionData.headerPx != null || bodySectionData.footerPx != null
        ? {
            header: bodySectionData.headerPx ?? 0,
            footer: bodySectionData.footerPx ?? 0,
            top: bodySectionData.topPx,
            right: bodySectionData.rightPx,
            bottom: bodySectionData.bottomPx,
            left: bodySectionData.leftPx,
          }
        : null,
    pageSize: bodySectionData.pageSizePx ?? null,
    orientation: bodySectionData.orientation ?? null,
    columns: bodySectionData.columnsPx ?? null,
    type: (bodySectionData.type as SectionType) ?? DEFAULT_BODY_SECTION_TYPE,
    titlePg: bodySectionData.titlePg ?? false,
    headerRefs: bodySectionData.headerRefs,
    footerRefs: bodySectionData.footerRefs,
    vAlign: bodySectionData.vAlign,
  };
}

/**
 * Create default final section for backward compatibility.
 * Used when no body sectPr is provided.
 *
 * @param currentStart - Starting paragraph index for this section
 * @param totalParagraphs - Total number of paragraphs in document
 * @param sectionIndex - Index for this section
 * @returns Default section range
 */
export function createDefaultFinalSection(
  currentStart: number,
  totalParagraphs: number,
  sectionIndex: number,
): SectionRange {
  return {
    sectionIndex,
    startParagraphIndex: currentStart,
    endParagraphIndex: totalParagraphs - 1,
    sectPr: null,
    margins: null,
    pageSize: null,
    orientation: null,
    columns: null,
    type: DEFAULT_BODY_SECTION_TYPE,
    titlePg: false,
    headerRefs: undefined,
    footerRefs: undefined,
  };
}

/**
 * Analyze section ranges in the document using Word's "end-tagged" semantics.
 * A paragraph's sectPr defines properties for the section ENDING at that paragraph.
 * The final section uses the body-level sectPr (if provided).
 *
 * @param doc - ProseMirror document node
 * @param bodySectPr - Optional body-level sectPr from converter (defines final section)
 * @returns Array of section ranges with backward-looking semantics
 */
export function analyzeSectionRanges(doc: PMNode, bodySectPr?: unknown): SectionRange[] {
  const { paragraphs, totalCount } = findParagraphsWithSectPr(doc);
  const hasBody = Boolean(bodySectPr);
  const ranges = buildSectionRangesFromParagraphs(paragraphs, hasBody);

  const currentStart = ranges.length > 0 ? ranges[ranges.length - 1].endParagraphIndex + 1 : 0;

  // Always represent the final section defined by bodySectPr, even if there are
  // no remaining paragraphs after the last paragraph-level sectPr. This ensures
  // a trailing section break can be emitted for the body-level properties.
  if (isSectPrElement(bodySectPr)) {
    const finalSection = createFinalSectionFromBodySectPr(
      bodySectPr,
      Math.min(currentStart, totalCount),
      totalCount,
      ranges.length,
    );
    if (finalSection) {
      ranges.push(finalSection);
    }
  } else if (ranges.length > 0) {
    const fallbackFinal = createDefaultFinalSection(Math.min(currentStart, totalCount), totalCount, ranges.length);
    if (fallbackFinal) {
      fallbackFinal.type = DEFAULT_PARAGRAPH_SECTION_TYPE;
      ranges.push(fallbackFinal);
    }
  }

  return ranges;
}
