/**
 * Document Part Object Handler
 *
 * Processes documentPartObject nodes (e.g., TOC galleries).
 * Applies document part metadata and processes TOC children.
 */

import type { PMNode, NodeHandlerContext } from '../types.js';
import { getDocPartGallery, getDocPartObjectId, getNodeInstruction, resolveNodeSdtMetadata } from './metadata.js';
import { processTocChildren } from './toc.js';

/**
 * Handle document part object nodes (e.g., TOC galleries).
 * Processes TOC children for Table of Contents galleries.
 *
 * @param node - Document part object node to process
 * @param context - Shared handler context
 */
export function handleDocumentPartObjectNode(node: PMNode, context: NodeHandlerContext): void {
  if (!Array.isArray(node.content)) return;

  const {
    blocks,
    recordBlockKind,
    nextBlockId,
    positions,
    defaultFont,
    defaultSize,
    styleContext,
    bookmarks,
    hyperlinkConfig,
    converters,
  } = context;
  const docPartGallery = getDocPartGallery(node);
  const docPartObjectId = getDocPartObjectId(node);
  const tocInstruction = getNodeInstruction(node);
  const docPartSdtMetadata = resolveNodeSdtMetadata(node, 'docPartObject');
  const paragraphToFlowBlocks = converters?.paragraphToFlowBlocks;

  if (docPartGallery === 'Table of Contents' && paragraphToFlowBlocks) {
    processTocChildren(
      Array.from(node.content),
      { docPartGallery, docPartObjectId, tocInstruction, sdtMetadata: docPartSdtMetadata },
      {
        nextBlockId,
        positions,
        defaultFont,
        defaultSize,
        styleContext,
        bookmarks,
        hyperlinkConfig,
      },
      { blocks, recordBlockKind },
      paragraphToFlowBlocks,
    );
  }
}
