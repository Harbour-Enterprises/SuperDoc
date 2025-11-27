import type { FlowBlock, Layout, Measure, HeaderFooterLayout } from '@superdoc/contracts';
import { layoutDocument, type LayoutOptions, type HeaderFooterConstraints } from '../../layout-engine/src/index';
import { remeasureParagraph } from './remeasure';
import { computeDirtyRegions } from './diff';
import { MeasureCache } from './cache';
import { layoutHeaderFooterWithCache, HeaderFooterLayoutCache, type HeaderFooterBatch } from './layoutHeaderFooter';

export type HeaderFooterMeasureFn = (
  block: FlowBlock,
  constraints: { maxWidth: number; maxHeight: number },
) => Promise<Measure>;

export type HeaderFooterLayoutResult = {
  kind: 'header' | 'footer';
  type: keyof HeaderFooterBatch;
  layout: HeaderFooterLayout;
  blocks: FlowBlock[];
  measures: Measure[];
};

export type IncrementalLayoutResult = {
  layout: Layout;
  measures: Measure[];
  dirty: ReturnType<typeof computeDirtyRegions>;
  headers?: HeaderFooterLayoutResult[];
  footers?: HeaderFooterLayoutResult[];
};

export const measureCache = new MeasureCache<Measure>();
const headerMeasureCache = new HeaderFooterLayoutCache();

const layoutDebugEnabled =
  typeof process !== 'undefined' && typeof process.env !== 'undefined' && Boolean(process.env.SD_DEBUG_LAYOUT);

const perfLog = (...args: unknown[]): void => {
  if (!layoutDebugEnabled) return;

  console.log(...args);
};

export async function incrementalLayout(
  previousBlocks: FlowBlock[],
  _previousLayout: Layout | null,
  nextBlocks: FlowBlock[],
  options: LayoutOptions,
  measureBlock: (block: FlowBlock, constraints: { maxWidth: number; maxHeight: number }) => Promise<Measure>,
  headerFooter?: {
    headerBlocks?: HeaderFooterBatch;
    footerBlocks?: HeaderFooterBatch;
    constraints: HeaderFooterConstraints;
    measure?: HeaderFooterMeasureFn;
  },
): Promise<IncrementalLayoutResult> {
  const _perfStart = performance.now();
  const dirty = computeDirtyRegions(previousBlocks, nextBlocks);
  if (dirty.deletedBlockIds.length > 0) {
    measureCache.invalidate(dirty.deletedBlockIds);
  }

  const { measurementWidth, measurementHeight } = resolveMeasurementConstraints(options);

  if (measurementWidth <= 0 || measurementHeight <= 0) {
    throw new Error('incrementalLayout: invalid measurement constraints resolved from options');
  }

  const measureStart = performance.now();
  const constraints = { maxWidth: measurementWidth, maxHeight: measurementHeight };
  const measures: Measure[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;
  for (const block of nextBlocks) {
    if (block.kind === 'sectionBreak') {
      measures.push({ kind: 'sectionBreak' });
      continue;
    }
    const cached = measureCache.get(block, measurementWidth, measurementHeight);
    if (cached) {
      measures.push(cached);
      cacheHits++;
      continue;
    }
    const measurement = await measureBlock(block, constraints);
    measureCache.set(block, measurementWidth, measurementHeight, measurement);
    measures.push(measurement);
    cacheMisses++;
  }
  const measureEnd = performance.now();
  perfLog(
    `[Perf] 4.1 Measure all blocks: ${(measureEnd - measureStart).toFixed(2)}ms (${cacheMisses} measured, ${cacheHits} cached)`,
  );

  const layoutStart = performance.now();
  const layout = layoutDocument(nextBlocks, measures, {
    ...options,
    remeasureParagraph: (block, maxWidth) => remeasureParagraph(block, maxWidth),
  });
  const layoutEnd = performance.now();
  perfLog(`[Perf] 4.2 Layout document (pagination): ${(layoutEnd - layoutStart).toFixed(2)}ms`);

  let headers: HeaderFooterLayoutResult[] | undefined;
  let footers: HeaderFooterLayoutResult[] | undefined;

  if (headerFooter?.constraints && (headerFooter.headerBlocks || headerFooter.footerBlocks)) {
    const measureFn = headerFooter.measure ?? measureBlock;
    if (headerFooter.headerBlocks) {
      const headerLayouts = await layoutHeaderFooterWithCache(
        headerFooter.headerBlocks,
        headerFooter.constraints,
        measureFn,
        headerMeasureCache,
      );
      headers = serializeHeaderFooterResults('header', headerLayouts);
    }
    if (headerFooter.footerBlocks) {
      const footerLayouts = await layoutHeaderFooterWithCache(
        headerFooter.footerBlocks,
        headerFooter.constraints,
        measureFn,
        headerMeasureCache,
      );
      footers = serializeHeaderFooterResults('footer', footerLayouts);
    }
  }

  return {
    layout,
    measures,
    dirty,
    headers,
    footers,
  };
}

const DEFAULT_PAGE_SIZE = { w: 612, h: 792 };
const DEFAULT_MARGINS = { top: 72, right: 72, bottom: 72, left: 72 };

export function resolveMeasurementConstraints(options: LayoutOptions): {
  measurementWidth: number;
  measurementHeight: number;
} {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const margins = options.margins ?? DEFAULT_MARGINS;
  const contentWidth = pageSize.w - (margins.left + margins.right);
  const contentHeight = pageSize.h - (margins.top + margins.bottom);

  const columns = options.columns;
  if (columns && columns.count > 1) {
    const gap = Math.max(0, columns.gap ?? 0);
    const totalGap = gap * (columns.count - 1);
    const columnWidth = (contentWidth - totalGap) / columns.count;
    if (columnWidth > 0) {
      return {
        measurementWidth: columnWidth,
        measurementHeight: contentHeight,
      };
    }
  }

  return {
    measurementWidth: contentWidth,
    measurementHeight: contentHeight,
  };
}

const serializeHeaderFooterResults = (
  kind: 'header' | 'footer',
  batch: Awaited<ReturnType<typeof layoutHeaderFooterWithCache>>,
): HeaderFooterLayoutResult[] => {
  const results: HeaderFooterLayoutResult[] = [];
  Object.entries(batch).forEach(([type, value]) => {
    if (!value) return;
    results.push({
      kind,
      type: type as keyof HeaderFooterBatch,
      layout: value.layout,
      blocks: value.blocks,
      measures: value.measures,
    });
  });
  return results;
};
