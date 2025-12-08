import type { FlowBlock, ImageBlock, ImageMeasure, Measure, DrawingBlock, DrawingMeasure } from '@superdoc/contracts';
export type AnchoredDrawing = {
  block: ImageBlock | DrawingBlock;
  measure: ImageMeasure | DrawingMeasure;
};
export declare function collectAnchoredDrawings(
  blocks: FlowBlock[],
  measures: Measure[],
): Map<number, AnchoredDrawing[]>;
