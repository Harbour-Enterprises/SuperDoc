# @superdoc/layout-engine

Layout and pagination engine for SuperDoc documents.

## What it does

Takes measured FlowBlocks (paragraphs, tables, lists, images, drawings) and layouts them into paginated fragments. Handles multi-column layouts, section breaks, page breaks, headers/footers, and floating objects.

## Main API

- `layoutDocument(blocks, measures, options)` - Paginate document content
- `layoutHeaderFooter(blocks, measures, constraints)` - Layout header/footer regions

## Performance Testing

Performance benchmarks may write `perf-baseline-results.json` to the package root during test runs. This file contains timing measurements for reflow operations and is used to track performance regressions locally.

**Note**: `perf-baseline-results.json` is listed in `.gitignore` and should never be committed. The tracked copy was removed intentionally; the file is regenerated locally when performance tests run.
