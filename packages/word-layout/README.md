# @superdoc/word-layout

Shared Word paragraph and list layout math for SuperDoc. Pure, data-driven functions for marker spacing, tab stops, numbering counters, and paragraph layout calculations used across super-editor and layout-engine (no DOM/Canvas dependencies).

## Purpose

This package provides:
- Pure functions for Word paragraph layout (`computeWordParagraphLayout`, `resolveMarkerRunProperties`)
- Numbering manager for multi-level list counters
- Tab stop resolution and geometry calculations
- Unit conversion utilities (twips ↔ pixels ↔ points)
- Marker text formatting (bullets, decimals, roman numerals, alphabetic)

All functions operate on serializable JSON structures with no DOM, ProseMirror, or canvas dependencies. Text measurement is injected via callbacks, allowing consumers to use DOM, canvas, or headless implementations.

## Main API

### `computeWordParagraphLayout(input: WordParagraphLayoutInput): WordParagraphLayoutOutput`

Computes indentation, tab stops, marker layout (if numbered), and resolved defaults. Measurement is optional; pass `measurement.measureText` to get accurate marker widths, otherwise safe fallbacks are used.

Computes complete layout properties for a Word paragraph including indentation, tab stops, and optional list marker positioning.

```typescript
const layout = computeWordParagraphLayout({
  paragraph: {
    indent: { left: 36, hanging: 18 },
    tabs: [{ position: 72, alignment: 'start' }],
    numberingProperties: { numId: '1', ilvl: 0, format: 'decimal', lvlText: '%1.', path: [3] }
  },
  docDefaults: {
    defaultTabIntervalTwips: 720,
    run: { fontFamily: 'Calibri', fontSize: 12 }
  },
  measurement: {
    measureText: (text, fontCss) => /* your measurement implementation */
  }
});
```

### `resolveMarkerRunProperties(input: ResolveMarkerRunPropsInput): ResolvedRunProperties`

Resolves final run properties for list markers by merging defaults, document settings, numbering properties, and inline overrides.

### `createNumberingManager(): NumberingManager`

Creates a stateful manager for tracking list counters, restart behavior, and hierarchical numbering paths.

### Tab + unit helpers

- `normalizeExplicitTabStops`, `computeTabStops`, `buildEffectiveTabStopsPx`
- `pixelsToTwips`, `twipsToPixels`, `pointsToTwips`, `twipsToPoints`, `halfPointsToPoints`, `pointsToHalfPoints`

### Marker helpers

- `formatMarkerText`, `buildFontCss`, `LIST_MARKER_GAP`, `DEFAULT_LIST_HANGING_PX`

## Supporting Utilities

- **Tab Layout**: `normalizeExplicitTabStops`, `computeTabStops`, `buildEffectiveTabStopsPx`
- **Unit Conversions**: `pixelsToTwips`, `twipsToPixels`, `pointsToTwips`, `twipsToPoints`, `halfPointsToPoints`, `pointsToHalfPoints`
- **Marker Formatting**: `formatMarkerText`, `buildFontCss`

## Type Definitions

All TypeScript types are exported from `src/types.ts`:
- `WordParagraphLayoutInput`, `WordParagraphLayoutOutput`
- `WordListMarkerLayout`
- `ResolvedParagraphProperties`, `ResolvedRunProperties`, `ResolvedNumberingProperties`
- `DocDefaults`, `ParagraphIndent`, `ResolvedTabStop`

## Tests

Test suites are in `tests/` using Vitest:
- `word-layout.test.ts` – end-to-end layout calculations
- `numbering-manager.test.ts` – counter tracking and restart behavior
- `unit-conversions.test.ts` – conversion round-trips
- `marker-utils.test.ts` – text formatting
