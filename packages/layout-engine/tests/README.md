# Layout Engine Tests

This package contains integration tests for the layout engine's SDT (Structured Document Tag) metadata propagation pipeline.

## Overview

The layout engine needs to preserve Word SDT metadata (field annotations, structured content, document sections, doc parts) as documents flow through the conversion pipeline:

1. **PM (ProseMirror) nodes** with SDT attrs →
2. **Style engine** normalizes metadata →
3. **PM adapter** flattens SDTs into FlowBlocks →
4. **Measurer & Layout** position content →
5. **Painters** render with metadata annotations

This test suite validates that metadata survives end-to-end through FlowBlocks.

## Test Structure

### Fixtures

- `fixtures/sdt-flow-input.json`: Synthetic ProseMirror document containing all SDT variants:
  - Inline `structuredContent`
  - Block `structuredContentBlock`
  - `fieldAnnotation` (with full styling, hidden/locked flags)
  - Nested SDTs (inline within inline, field within section)
  - `documentSection` (with title, lock state)
  - `docPartObject` (TOC metadata)

### Test Cases

- `src/sdt-metadata.test.js`: Focused test cases per SDT type
  - Each test validates a specific metadata shape
  - Nested scenarios ensure parent and child metadata coexist
  - Block-level vs run-level metadata is tested separately

## Running Tests

This package lives as a separate workspace (`@superdoc/layout-tests`) to isolate integration test dependencies.

### Run via npm workspace

```bash
npm run test --workspace=@superdoc/layout-tests
```

### Run from package root

```bash
cd packages/layout-engine/tests
npm test
```

### Run from monorepo root

```bash
npm run test --workspace=packages/layout-engine
```

The layout-engine workspace test script includes this package automatically.

## Configuration

- **Test Runner**: Vitest (configured via `vitest.config.mjs`)
- **Environment**: Node (no DOM/browser globals needed)
- **Imports**: Uses JSON fixtures via `assert { type: 'json' }`

### vitest.config.mjs

Key settings:
- Runs in Node environment (no jsdom overhead)
- Includes only `src/**/*.test.js` files
- No coverage collection (integration tests focus on correctness, not coverage)

## Adding New Tests

1. **Extend the fixture** (`fixtures/sdt-flow-input.json`) with new SDT scenarios
2. **Add focused test cases** to `src/sdt-metadata.test.js`
   - Use `.find()` to locate specific blocks by ID or metadata
   - Validate metadata with `.toMatchObject()` for partial matching
   - Test both presence and correctness of nested/coexisting metadata
3. **Run tests** to confirm new scenarios pass

## Dependencies

This package depends on:
- `@superdoc/pm-adapter` - converts PM nodes to FlowBlocks
- Vitest - test runner

The PM adapter internally uses the style engine's `resolveSdtMetadata` API, so these tests indirectly validate the full metadata normalization pipeline.

## Debugging

If tests fail after SDT schema changes:

1. **Check contracts** (`@superdoc/contracts`) - ensure `SdtMetadata` union types are up to date
2. **Check style-engine** (`@superdoc/style-engine/src/index.ts`) - verify normalization helpers match new attrs
3. **Check PM adapter** (`@superdoc/pm-adapter/src/index.ts`) - confirm SDT unwrapping assigns metadata to blocks/runs
4. **Inspect snapshot diffs** - Vitest will show what changed in the summarized output

## Related Documentation

- Layout engine contracts: `packages/layout-engine/contracts/src/index.ts`
- Style engine SDT parsing: `packages/layout-engine/style-engine/src/index.ts`
- PM adapter SDT handling: `packages/layout-engine/pm-adapter/src/index.ts` (search for `resolveNodeSdtMetadata`)
- Planning docs: `packages/layout-engine/plan/fields-annotations-*.md`
