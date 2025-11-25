/**
 * Text Run Converter Module
 *
 * Functions for converting ProseMirror text nodes to TextRun and TabRun blocks:
 * - Text node conversion
 * - Tab node conversion
 * - Token node conversion (page numbers, etc.)
 */

import type { TextRun, Run, TabRun, TabStop, ParagraphIndent, SdtMetadata } from '@superdoc/contracts';
import type { PMNode, PMMark, PositionMap, HyperlinkConfig, ThemeColorPalette } from '../types.js';
import { applyMarksToRun } from '../marks/index.js';
import { DEFAULT_HYPERLINK_CONFIG } from '../constants.js';

/**
 * Converts a text PM node to a TextRun.
 *
 * @param textNode - PM text node to convert
 * @param positions - Position map for PM node tracking
 * @param defaultFont - Default font family
 * @param defaultSize - Default font size
 * @param inheritedMarks - Marks inherited from parent nodes
 * @param sdtMetadata - Optional SDT metadata to attach
 * @param hyperlinkConfig - Hyperlink configuration
 * @returns TextRun block
 */
export function textNodeToRun(
  textNode: PMNode,
  positions: PositionMap,
  defaultFont: string,
  defaultSize: number,
  inheritedMarks: PMMark[] = [],
  sdtMetadata?: SdtMetadata,
  hyperlinkConfig: HyperlinkConfig = DEFAULT_HYPERLINK_CONFIG,
  themeColors?: ThemeColorPalette,
): TextRun {
  const run: TextRun = {
    text: textNode.text || '',
    fontFamily: defaultFont,
    fontSize: defaultSize,
  };

  // Attach PM position tracking
  const pos = positions.get(textNode);
  if (pos) {
    run.pmStart = pos.start;
    run.pmEnd = pos.end;
    // Per-run creation logs removed to reduce noise
  }

  applyMarksToRun(run, [...(textNode.marks ?? []), ...(inheritedMarks ?? [])], hyperlinkConfig, themeColors);
  if (sdtMetadata) {
    run.sdt = sdtMetadata;
  }

  return run;
}

/**
 * Converts a tab PM node to a TabRun.
 *
 * @param node - PM tab node to convert
 * @param positions - Position map for PM node tracking
 * @param tabIndex - Index of this tab in the paragraph
 * @param paragraph - Parent paragraph node (for tab stops and indent)
 * @returns TabRun block or null if position not found
 */
export function tabNodeToRun(node: PMNode, positions: PositionMap, tabIndex: number, paragraph: PMNode): Run | null {
  const pos = positions.get(node);
  if (!pos) return null;
  const paragraphAttrs = paragraph.attrs ?? {};
  const paragraphProps =
    typeof paragraphAttrs.paragraphProperties === 'object' && paragraphAttrs.paragraphProperties !== null
      ? (paragraphAttrs.paragraphProperties as Record<string, unknown>)
      : {};
  const tabStops =
    Array.isArray(paragraphAttrs.tabStops) && paragraphAttrs.tabStops.length
      ? (paragraphAttrs.tabStops as TabStop[])
      : Array.isArray(paragraphProps.tabStops)
        ? (paragraphProps.tabStops as TabStop[])
        : undefined;
  const indent =
    (paragraphAttrs.indent as ParagraphIndent | undefined) ??
    (paragraphProps.indent as ParagraphIndent | undefined) ??
    undefined;
  return {
    kind: 'tab',
    text: '\t',
    pmStart: pos.start,
    pmEnd: pos.end,
    tabIndex,
    tabStops,
    indent,
    leader: (node.attrs?.leader as TabRun['leader']) ?? null,
  };
}

/**
 * Converts a token PM node (e.g., page-number) to a TextRun with token metadata.
 *
 * @param node - PM token node to convert
 * @param positions - Position map for PM node tracking
 * @param defaultFont - Default font family
 * @param defaultSize - Default font size
 * @param inheritedMarks - Marks inherited from parent nodes
 * @param token - Token type (e.g., 'pageNumber', 'totalPageCount')
 * @param hyperlinkConfig - Hyperlink configuration
 * @returns TextRun block with token metadata
 */
export function tokenNodeToRun(
  node: PMNode,
  positions: PositionMap,
  defaultFont: string,
  defaultSize: number,
  inheritedMarks: PMMark[] = [],
  token: TextRun['token'],
  hyperlinkConfig: HyperlinkConfig = DEFAULT_HYPERLINK_CONFIG,
  themeColors?: ThemeColorPalette,
): TextRun {
  // Tokens carry a placeholder character so measurers reserve width; painters will replace it with the real value.
  const run: TextRun = {
    text: '0',
    token,
    fontFamily: defaultFont,
    fontSize: defaultSize,
  };

  // Attach PM position tracking
  const pos = positions.get(node);
  if (pos) {
    run.pmStart = pos.start;
    run.pmEnd = pos.end;
  }

  const marks = [...(node.marks ?? []), ...(inheritedMarks ?? [])];
  applyMarksToRun(run, marks, hyperlinkConfig, themeColors);
  return run;
}
