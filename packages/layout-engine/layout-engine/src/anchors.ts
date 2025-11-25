import type { FlowBlock, ImageBlock, ImageMeasure, Measure, DrawingBlock, DrawingMeasure } from '@superdoc/contracts';

export type AnchoredDrawing = {
  block: ImageBlock | DrawingBlock;
  measure: ImageMeasure | DrawingMeasure;
};

// Map of paragraph block index -> anchored images associated with that paragraph
export function collectAnchoredDrawings(blocks: FlowBlock[], measures: Measure[]): Map<number, AnchoredDrawing[]> {
  const map = new Map<number, AnchoredDrawing[]>();

  const paragraphs: number[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i].kind === 'paragraph') paragraphs.push(i);
  }

  const nearestPrevParagraph = (fromIndex: number): number | null => {
    for (let i = fromIndex - 1; i >= 0; i -= 1) {
      if (blocks[i].kind === 'paragraph') return i;
    }
    return null;
  };

  const nearestNextParagraph = (fromIndex: number): number | null => {
    for (let i = fromIndex + 1; i < blocks.length; i += 1) {
      if (blocks[i].kind === 'paragraph') return i;
    }
    return null;
  };

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const measure = measures[i];
    const isImage = block.kind === 'image' && measure?.kind === 'image';
    const isDrawing = block.kind === 'drawing' && measure?.kind === 'drawing';
    if (!isImage && !isDrawing) continue;

    const drawingBlock = block as ImageBlock | DrawingBlock;
    const drawingMeasure = measure as ImageMeasure | DrawingMeasure;
    if (!drawingBlock.anchor?.isAnchored) continue;

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
