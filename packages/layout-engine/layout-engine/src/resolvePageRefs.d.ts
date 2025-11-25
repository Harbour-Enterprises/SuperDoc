/**
 * Page Reference Resolution Module
 *
 * Handles two-pass layout for dynamic cross-reference resolution:
 * - Pass 1: Build anchor map (bookmark → page number)
 * - Pass 2: Resolve pageReference tokens and re-measure affected paragraphs
 */
import type { Layout, FlowBlock, ParagraphBlock } from '@superdoc/contracts';
/**
 * Build an anchor map from bookmarks and layout fragments.
 *
 * For each bookmark, determines which page it appears on by checking
 * if the bookmark's PM position falls within any fragment's PM range.
 *
 * @param bookmarks - Map of bookmark names to PM positions
 * @param layout - Completed layout with positioned fragments
 * @returns Map of bookmark names to page numbers (1-indexed)
 */
export declare function buildAnchorMap(bookmarks: Map<string, number>, layout: Layout): Map<string, number>;
/**
 * Resolve pageReference tokens in blocks using the anchor map.
 *
 * Finds all runs with token='pageReference', looks up the target bookmark
 * in the anchor map, and replaces the run's text with the resolved page number.
 *
 * @param blocks - FlowBlocks containing runs with pageReference tokens
 * @param anchorMap - Map of bookmark names to page numbers
 * @returns Array of block IDs that had tokens resolved (for re-measurement)
 */
export declare function resolvePageRefTokens(blocks: FlowBlock[], anchorMap: Map<string, number>): Set<string>;
/**
 * Filter blocks to only include TOC entries that need re-measurement.
 *
 * @param blocks - All FlowBlocks
 * @param affectedBlockIds - Set of block IDs that had tokens resolved
 * @returns Array of ParagraphBlocks that are TOC entries and were affected
 */
export declare function getTocBlocksForRemeasurement(
  blocks: FlowBlock[],
  affectedBlockIds: Set<string>,
): ParagraphBlock[];
