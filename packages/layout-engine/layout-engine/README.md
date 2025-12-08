# @superdoc/layout-engine

Layout and pagination engine for SuperDoc documents.

## What it does

Takes measured FlowBlocks (paragraphs, tables, lists, images, drawings) and layouts them into paginated fragments. Handles multi-column layouts, section breaks, page breaks, headers/footers, anchored/floating objects, and column/page advancement. Input is deterministic: `blocks` and `measures` are parallel arrays produced by the measuring stage.

## Main API

- `layoutDocument(blocks, measures, options)` → `Layout`
  - Requires `blocks.length === measures.length`; measures come from the measuring/dom pipeline.
  - `options`: `pageSize`, `margins`, `columns`, `sectionMetadata`, and optional `remeasureParagraph` hook (allows caller to remeasure a paragraph at a new max width).
  - Output: pages with fragments (para/list-item/table/image/drawing) plus effective columns/page size.
- `layoutHeaderFooter(blocks, measures, constraints)` → `Layout`
  - Simple layout for header/footer regions with fixed `width`/`height` constraints.
- Other exports: `buildAnchorMap`, `resolvePageRefTokens`, `getTocBlocksForRemeasurement` for page-ref resolution/TOC recomputation.

Defaults: Letter page (612×792 px @72dpi), 1in margins, and single-column unless overridden.

## Performance Testing

Performance benchmarks may write `perf-baseline-results.json` to the package root during test runs. This file contains timing measurements for reflow operations and is used to track performance regressions locally.

**Note**: `perf-baseline-results.json` is listed in `.gitignore` and should never be committed. The tracked copy was removed intentionally; the file is regenerated locally when performance tests run.
