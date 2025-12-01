import type { FlowBlock, ImageBlock, ImageMeasure, Measure, DrawingBlock, DrawingMeasure } from '@superdoc/contracts';

/**
 * Represents an anchored image or drawing block with its measurements.
 * Used to bundle block and measure data for anchor processing.
 */
export type AnchoredDrawing = {
  block: ImageBlock | DrawingBlock;
  measure: ImageMeasure | DrawingMeasure;
};

/**
 * Check if an anchored image should be pre-registered (before any paragraphs are laid out).
 * Images with vRelativeFrom='margin' or 'page' position themselves relative to the page,
 * not relative to their anchor paragraph. These need to be registered first so ALL
 * paragraphs can wrap around them.
 */
export function isPageRelativeAnchor(block: ImageBlock | DrawingBlock): boolean {
  const vRelativeFrom = block.anchor?.vRelativeFrom;
  return vRelativeFrom === 'margin' || vRelativeFrom === 'page';
}

/**
 * Collect anchored images that should be pre-registered before the layout loop.
 * These are images with vRelativeFrom='margin' or 'page' that affect all paragraphs.
 *
 * @param blocks - Array of flow blocks to scan for anchored images
 * @param measures - Corresponding measures for each block
 * @returns Array of anchored drawings that should be pre-registered
 */
export function collectPreRegisteredAnchors(blocks: FlowBlock[], measures: Measure[]): AnchoredDrawing[] {
  const result: AnchoredDrawing[] = [];
  const len = Math.min(blocks.length, measures.length);

  for (let i = 0; i < len; i += 1) {
    const block = blocks[i];
    const measure = measures[i];
    const isImage = block.kind === 'image' && measure?.kind === 'image';
    const isDrawing = block.kind === 'drawing' && measure?.kind === 'drawing';
    if (!isImage && !isDrawing) continue;

    const drawingBlock = block as ImageBlock | DrawingBlock;
    const drawingMeasure = measure as ImageMeasure | DrawingMeasure;

    if (!drawingBlock.anchor?.isAnchored) continue;

    // Only pre-register page/margin-relative anchors
    if (isPageRelativeAnchor(drawingBlock)) {
      result.push({ block: drawingBlock, measure: drawingMeasure });
    }
  }

  return result;
}

/**
 * Collect anchored images that are positioned relative to their anchor paragraph.
 *
 * Images with vRelativeFrom='paragraph' (or undefined) are mapped to the nearest
 * paragraph block using a heuristic: prefer the nearest preceding paragraph,
 * falling back to the nearest following paragraph if none precedes.
 *
 * @param blocks - Array of flow blocks to scan for anchored images
 * @param measures - Corresponding measures for each block
 * @returns Map of paragraph block index to anchored images for that paragraph
 */
export function collectAnchoredDrawings(blocks: FlowBlock[], measures: Measure[]): Map<number, AnchoredDrawing[]> {
  const map = new Map<number, AnchoredDrawing[]>();
  const len = Math.min(blocks.length, measures.length);

  const paragraphs: number[] = [];
  for (let i = 0; i < len; i += 1) {
    if (blocks[i].kind === 'paragraph') paragraphs.push(i);
  }

  const nearestPrevParagraph = (fromIndex: number): number | null => {
    for (let i = fromIndex - 1; i >= 0; i -= 1) {
      if (blocks[i].kind === 'paragraph') return i;
    }
    return null;
  };

  const nearestNextParagraph = (fromIndex: number): number | null => {
    for (let i = fromIndex + 1; i < len; i += 1) {
      if (blocks[i].kind === 'paragraph') return i;
    }
    return null;
  };

  for (let i = 0; i < len; i += 1) {
    const block = blocks[i];
    const measure = measures[i];
    const isImage = block.kind === 'image' && measure?.kind === 'image';
    const isDrawing = block.kind === 'drawing' && measure?.kind === 'drawing';
    if (!isImage && !isDrawing) continue;

    const drawingBlock = block as ImageBlock | DrawingBlock;
    const drawingMeasure = measure as ImageMeasure | DrawingMeasure;

    if (!drawingBlock.anchor?.isAnchored) {
      continue;
    }

    // Skip page/margin-relative anchors - they're handled by collectPreRegisteredAnchors
    if (isPageRelativeAnchor(drawingBlock)) {
      continue;
    }

    // Heuristic: anchor to nearest preceding paragraph, else nearest next paragraph
    let anchorParaIndex = nearestPrevParagraph(i);
    if (anchorParaIndex == null) anchorParaIndex = nearestNextParagraph(i);
    if (anchorParaIndex == null) continue; // no paragraphs at all

    const list = map.get(anchorParaIndex) ?? [];
    list.push({ block: drawingBlock, measure: drawingMeasure });
    map.set(anchorParaIndex, list);
  }

  return map;
}
