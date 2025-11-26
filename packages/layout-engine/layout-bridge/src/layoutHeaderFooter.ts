import type { FlowBlock, HeaderFooterLayout, Measure } from '@superdoc/contracts';
import { layoutHeaderFooter, type HeaderFooterConstraints } from '../../layout-engine/src/index';
import { MeasureCache } from './cache';

export type HeaderFooterBatch = Partial<Record<'default' | 'first' | 'even' | 'odd', FlowBlock[]>>;
export type MeasureResolver = (
  block: FlowBlock,
  constraints: { maxWidth: number; maxHeight: number },
) => Promise<Measure>;

export type HeaderFooterBatchResult = Partial<
  Record<'default' | 'first' | 'even' | 'odd', { blocks: FlowBlock[]; measures: Measure[]; layout: HeaderFooterLayout }>
>;

export class HeaderFooterLayoutCache {
  private readonly cache = new MeasureCache<Measure>();

  public async measureBlocks(
    blocks: FlowBlock[],
    constraints: { width: number; height: number },
    measureBlock: MeasureResolver,
  ): Promise<Measure[]> {
    const measures: Measure[] = [];
    for (const block of blocks) {
      const cached = this.cache.get(block, constraints.width, constraints.height);
      if (cached) {
        measures.push(cached);
        continue;
      }
      const measurement = await measureBlock(block, {
        maxWidth: constraints.width,
        maxHeight: constraints.height,
      });
      this.cache.set(block, constraints.width, constraints.height, measurement);
      measures.push(measurement);
    }
    return measures;
  }

  public invalidate(blockIds: string[]): void {
    this.cache.invalidate(blockIds);
  }
}

const sharedHeaderFooterCache = new HeaderFooterLayoutCache();

export async function layoutHeaderFooterWithCache(
  sections: HeaderFooterBatch,
  constraints: HeaderFooterConstraints,
  measureBlock: MeasureResolver,
  cache: HeaderFooterLayoutCache = sharedHeaderFooterCache,
): Promise<HeaderFooterBatchResult> {
  const result: HeaderFooterBatchResult = {};
  for (const [type, blocks] of Object.entries(sections) as [keyof HeaderFooterBatch, FlowBlock[] | undefined][]) {
    if (!blocks || blocks.length === 0) continue;
    const measures = await cache.measureBlocks(blocks, constraints, measureBlock);
    const layout = layoutHeaderFooter(blocks, measures, constraints);
    result[type] = { blocks, measures, layout };
  }
  return result;
}
