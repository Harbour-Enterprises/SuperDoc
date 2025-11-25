# @superdoc/measuring-dom

DOM-based measurement adapter for the SuperDoc layout pipeline.

## Responsibilities

- Measure paragraphs, lists, images, tables, and drawings using Canvas 2D API
- Honor paragraph spacing/indent metadata from block attributes
- Provide deterministic + browser modes for consistent CI measurements
- Export `measureBlock(block, constraints)` (main entry) and `configureMeasurement`/`installNodeCanvasPolyfill`

## Measurement Modes

```ts
import { configureMeasurement, measureBlock, installNodeCanvasPolyfill } from '@superdoc/measuring-dom';

// CI / fidelity runner
configureMeasurement({
  mode: 'deterministic',
  fonts: {
    deterministicFamily: 'Noto Sans',
    fallbackStack: ['Noto Sans', 'Arial', 'sans-serif'],
  },
});

// Browser/dev mode (default)
configureMeasurement({ mode: 'browser' });
```

- **browser:** Uses system fonts. Metrics are unrounded.
- **deterministic:** Uses pinned font stack and rounds to 0.1px for stable CI diffs.
- **Node/CI:** call `installNodeCanvasPolyfill()` before measuring to shim Canvas.

Notes:
- Input/Output: consumes FlowBlocks from parsing, produces Measure objects for layout-engine; caller pairs `blocks[i]` with `measures[i]`.
- Lists: can consume `wordLayout` metadata from `@superdoc/word-layout` for marker widths; otherwise falls back to legacy marker sizing.
- Tabs: handled inline (no external tab-layout module); tab layout is still partial and will be rewritten.
- Line breaking is greedy (no hyphenation/justification yet). Tables/images/drawings use safe fallbacks if dimensions are missing.
