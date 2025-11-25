/**
 * ProseMirror to FlowBlock Adapter
 *
 * Converts ProseMirror documents into FlowBlock[] for the layout engine pipeline.
 *
 * Responsibilities:
 * - Parse paragraph nodes from PM document
 * - Split text content into styled runs based on mark boundaries
 * - Generate deterministic BlockIds for layout tracking
 * - Normalize whitespace and handle empty paragraphs
 */
import type { FlowBlock } from '@superdoc/contracts';
import type {
  PMNode,
  FlowBlocksResult,
  AdapterOptions,
  NodeHandler,
  PMDocumentMap,
  BatchAdapterOptions,
} from './types.js';
/**
 * Dispatch map for node type handlers.
 * Maps node type names to their corresponding handler functions.
 */
export declare const nodeHandlers: Record<string, NodeHandler>;
/**
 * Convert a ProseMirror document to FlowBlock array with bookmark tracking.
 *
 * Returns both blocks and a bookmark map for two-pass layout with
 * cross-reference resolution (e.g., TOC page numbers, PAGEREF fields).
 *
 * Use this when you need to resolve page references dynamically:
 * 1. Call toFlowBlocks() to get blocks + bookmarks
 * 2. Run first layout pass to position fragments
 * 3. Build anchor map from bookmarks and fragment PM positions
 * 4. Resolve pageRef tokens to actual page numbers
 * 5. Re-measure affected paragraphs (TOC entries)
 * 6. Run second layout pass for final positioning
 *
 * @param pmDoc - ProseMirror document
 * @param options - Optional configuration
 * @returns Object with blocks and bookmark position map
 *
 * @example
 * ```typescript
 * const { blocks, bookmarks } = toFlowBlocks(pmDoc);
 * const layout = layoutDocument(blocks, measures, options);
 * const anchorMap = buildAnchorMap(bookmarks, layout);
 * resolvePageRefTokens(blocks, anchorMap);
 * const finalLayout = layoutDocument(blocks, newMeasures, options);
 * ```
 */
export declare function toFlowBlocks(pmDoc: PMNode | object, options?: AdapterOptions): FlowBlocksResult;
export declare function toFlowBlocksMap(
  documents: PMDocumentMap,
  options?: BatchAdapterOptions,
): Record<string, FlowBlock[]>;
