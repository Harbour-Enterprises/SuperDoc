/**
 * Structured Content Block Handler
 *
 * Processes SDT structuredContentBlock nodes, applying metadata to nested
 * paragraphs and tables while preserving their content structure.
 */

import type { ParagraphBlock } from '@superdoc/contracts';
import type { PMNode, NodeHandlerContext } from '../types.js';
import { resolveNodeSdtMetadata } from './metadata.js';
import { applySdtMetadataToParagraphBlocks } from './metadata.js';

/**
 * Handle structured content block nodes.
 * Processes child paragraphs and tables, applying SDT metadata.
 *
 * @param node - Structured content block node to process
 * @param context - Shared handler context
 */
export function handleStructuredContentBlockNode(node: PMNode, context: NodeHandlerContext): void {
  if (!Array.isArray(node.content)) return;

  const {
    blocks,
    recordBlockKind,
    nextBlockId,
    positions,
    defaultFont,
    defaultSize,
    styleContext,
    listCounterContext,
    trackedChangesConfig,
    bookmarks,
    hyperlinkConfig,
    converters,
  } = context;
  const { getListCounter, incrementListCounter, resetListCounter } = listCounterContext;
  const structuredContentMetadata = resolveNodeSdtMetadata(node, 'structuredContentBlock');
  const paragraphToFlowBlocks = converters?.paragraphToFlowBlocks;

  if (!paragraphToFlowBlocks) {
    return;
  }

  node.content.forEach((child) => {
    if (child.type === 'paragraph') {
      const paragraphBlocks = paragraphToFlowBlocks(
        child,
        nextBlockId,
        positions,
        defaultFont,
        defaultSize,
        styleContext,
        { getListCounter, incrementListCounter, resetListCounter },
        trackedChangesConfig,
        bookmarks,
        hyperlinkConfig,
      );
      applySdtMetadataToParagraphBlocks(
        paragraphBlocks.filter((b) => b.kind === 'paragraph') as ParagraphBlock[],
        structuredContentMetadata,
      );
      paragraphBlocks.forEach((block) => {
        blocks.push(block);
        recordBlockKind(block.kind);
      });
    } else if (child.type === 'table') {
      // Note: Table conversion requires tableNodeToBlock which needs to be passed via converters
      // For now, tables in structured content blocks are not converted
      // This can be extended to support tables in SDT blocks if needed
    }
  });
}
