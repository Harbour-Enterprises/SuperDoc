/**
 * Document Part Object Handler
 *
 * Processes documentPartObject nodes (e.g., TOC galleries, page number galleries).
 * Applies document part metadata and processes children appropriately.
 */

import type { PMNode, NodeHandlerContext } from '../types.js';
import { getDocPartGallery, getDocPartObjectId, getNodeInstruction, resolveNodeSdtMetadata } from './metadata.js';
import { processTocChildren } from './toc.js';

/**
 * Check if a gallery is a page number gallery.
 */
function isPageNumberGallery(gallery: string | undefined): boolean {
  if (!gallery) return false;
  return gallery.startsWith('Page Numbers');
}

/**
 * Handle document part object nodes (e.g., TOC galleries, page number galleries).
 * Processes children for Table of Contents and Page Number galleries.
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
    listCounterContext,
    trackedChangesConfig,
    nodeHandlers,
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
  } else if (isPageNumberGallery(docPartGallery) && paragraphToFlowBlocks) {
    // Process page number gallery children (paragraphs containing page-number tokens)
    for (const child of node.content) {
      if (child.type === 'paragraph') {
        // Call paragraphToFlowBlocks with individual arguments (same as TOC processing)
        const childBlocks = paragraphToFlowBlocks(
          child,
          nextBlockId,
          positions,
          defaultFont,
          defaultSize,
          styleContext,
          listCounterContext,
          trackedChangesConfig,
          bookmarks,
          hyperlinkConfig,
        );
        for (const block of childBlocks) {
          blocks.push(block);
          recordBlockKind(block.id, block.kind);
        }
      } else if (nodeHandlers && child.type in nodeHandlers) {
        // Recursively handle other node types
        const handler = nodeHandlers[child.type as keyof typeof nodeHandlers];
        if (handler) {
          handler(child, context);
        }
      }
    }
  }
  // Note: Other documentPartObject types (e.g., Bibliography) are intentionally
  // not processed - they are ignored to maintain backward compatibility.
}
