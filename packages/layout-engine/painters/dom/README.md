# @superdoc/painter-dom

Read-only DOM renderer for the SuperDoc layout engine.

## Responsibilities

- Render pages and fragments produced by `@superdoc/layout-engine`.
- Display static, paginated previews suitable for inspection in the browser.
- Handle rerenders when new layouts are provided.
- Annotate DOM elements with SDT (Structured Document Tag) metadata via `data-sdt-*` attributes for downstream consumers.
- Sanitize hyperlinks and expose link metrics for observability.

## API (read-only)

```ts
import { createDomPainter } from '@superdoc/painter-dom';

const painter = createDomPainter({
  blocks,      // FlowBlocks used to generate the layout
  measures,    // Measures (parallel to blocks)
  layoutMode: 'vertical' | 'horizontal' | 'book',
  pageStyles,  // optional style overrides
  headerProvider, // optional per-page header decorations
  footerProvider, // optional per-page footer decorations
  virtualization: { enabled: true, window: 5, overscan: 1 }, // vertical mode only
});

painter.paint(layout, mountElement); // layout comes from @superdoc/layout-engine
painter.setData(blocks, measures);   // update data without re-instantiating
painter.setProviders(newHeader, newFooter); // optional helper for provider changes
```

Notes:
- Expects `blocks[i]` and `measures[i]` to align with the layout you pass to `paint`.
- Virtualization is opt-in and only supported in vertical mode (windowed pages with spacers).
- Renderer is read-only: no editing/input handling is included here.
