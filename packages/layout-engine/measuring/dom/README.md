# @superdoc/measuring-dom

DOM-based measurement adapter for the SuperDoc layout pipeline.

## Responsibilities

- Measure paragraphs, lists, images, tables, and drawings using Canvas 2D API
- Honor paragraph spacing/indent metadata from block attributes
- Compute tab alignment using `@harbour-enterprises/tab-layout` (default 0.5" interval)
- Provide deterministic + browser modes for consistent CI measurements

## Measurement Modes

```ts
import { configureMeasurement, measureBlock } from '@superdoc/measuring-dom';

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
- **deterministic:** Uses pinned font stack and rounds all metrics to 0.1px for stable CI diffs.

## Tabs

Tab characters align to stops computed by `@harbour-enterprises/tab-layout`. Supports explicit tab definitions from DOCX with Word's default 0.5" interval as fallback.
