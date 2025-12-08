# @superdoc/style-engine

**OOXML Style Resolution Engine** – Produces fully-resolved `ComputedStyle` objects for layout engines.

## Overview

Resolves OOXML styles into normalized `ComputedStyle` objects by applying Word's cascade rules (defaults → style definitions → numbering → direct formatting). Also normalizes Structured Document Tag (SDT) metadata into stable contract shapes.

## Features

- **Style cascade**: Resolves `w:pStyle` inheritance chains with base styles and direct formatting
- **Numbering resolution**: Computes list indents, formats, and text from numbering definitions
- **Font fallback**: Maps OOXML font hints to CSS font stacks with proper fallbacks
- **SDT metadata normalization**: Handles field annotations, structured content, document sections, and doc parts
- **Performance optimization**: Caches normalized SDT metadata to avoid recomputation

## API

### `resolveStyle(node, context, options?)`

Resolves a node's fully-computed style by applying the OOXML cascade. `node` can be a PM node-like shape; `context` includes `styles`, `numbering`, and `defaults`.

```typescript
import { resolveStyle } from '@superdoc/style-engine';

const style = resolveStyle(
  { styleId: 'Heading1', paragraphProps: { indent: { left: 36 } } },
  {
    styles: { /* style definitions */ },
    numbering: { /* numbering definitions */ },
    defaults: { paragraphFont: 'Calibri', fontSize: 11 }
  }
);

console.log(style.paragraph.alignment); // 'left'
console.log(style.character.font.family); // 'Calibri, sans-serif'
```

**Options:**
- `sdt`: Attach SDT metadata to the computed style (see `resolveSdtMetadata`)
- `locale`: Locale hints (decimal separator) used in numbering resolution

### `resolveNumbering(numId, level, context)`

Resolves numbering metadata for a list item at a specific level.

```typescript
const numbering = resolveNumbering('1', 0, context);
console.log(numbering.format); // 'decimal'
console.log(numbering.text); // '%1.'
console.log(numbering.indent.hanging); // 18
```

### `resolveSdtMetadata(input)`

Normalizes Structured Document Tag metadata into stable contract shapes. Results are cached by hash/id for performance.

```typescript
import { resolveSdtMetadata, resolveStyle } from '@superdoc/style-engine';

const metadata = resolveSdtMetadata({
  nodeType: 'fieldAnnotation',
  attrs: {
    fieldId: 'CLIENT_NAME',
    displayLabel: 'Client Name',
    fieldColor: '#980043'
  }
});

// Or attach directly during style resolution
const computed = resolveStyle(node, context, {
  sdt: { nodeType: 'fieldAnnotation', attrs: node.attrs }
});
console.log(computed.sdt); // Normalized metadata
```

**Supported node types:**
- `fieldAnnotation`: Inline field annotations
- `structuredContent` / `structuredContentBlock`: Structured content containers
- `documentSection`: Document section metadata
- `docPartObject`: Document parts (TOC, bibliography, etc.)

### `clearSdtMetadataCache()`

Clears the internal SDT metadata cache. Useful for testing to ensure clean state between test runs.

```typescript
import { clearSdtMetadataCache } from '@superdoc/style-engine';

beforeEach(() => {
  clearSdtMetadataCache();
});
```

### `resolveTableCellStyle(table, row, col, context)`

Resolves style for table cell content. Currently returns document defaults; full table cascade will be implemented in a future update.

### `clearCaches()`

Clears internal caches (styles and SDT metadata). Useful for tests to ensure isolation.

## Usage Examples

### PM Adapter Integration

```typescript
import { resolveStyle } from '@superdoc/style-engine';

const computedStyle = resolveStyle(pmNode, styleContext);
// Use computedStyle.paragraph and computedStyle.character in FlowBlock creation
```

### Layout Engine Integration

```typescript
import { resolveStyle } from '@superdoc/style-engine';

const style = resolveStyle(block, context);
const tabStops = style.paragraph.tabs || [];
const indent = style.paragraph.indent;
// Use for layout calculations
```

## Implementation Notes

- **Tab stops**: Values preserved in OOXML units (twips) for round-trip fidelity; conversion to pixels happens at measurement boundary
- **Table cascade**: Currently returns document defaults; full `tblPr → trPr → tcPr → pPr` cascade planned for future implementation
- **Font handling**: Uses shared `toCssFontFamily` utility for consistent font stack generation
- **Caching**: SDT metadata and style resolution use caches; call `clearCaches`/`clearSdtMetadataCache` in tests.

## Dependencies

- `@superdoc/contracts` – Shared type definitions (TabStop, SdtMetadata, etc.)
- `shared/font-utils` – Font family resolution utilities
