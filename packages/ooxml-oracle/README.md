# OOXML Oracle

**OOXML Oracle** is a developer tool + library for working with [Office Open XML (OOXML)](https://en.wikipedia.org/wiki/Office_Open_XML) schemas.

This uses [ECMA-376 part 4](https://ecma-international.org/publications-and-standards/standards/ecma-376/) transitional definitions, filtered mainly to the ooxml tags that SuperDoc is currently interested in.

It bundles the transitional WordprocessingML schema into JSON and provides both:

- a **CLI** (`ooxml`) for inspecting schema relationships, and
- a **JavaScript/TypeScript library** for programmatic access.

## Features

- Query OOXML element children, attributes, and namespaces
- Explore schema relationships and tag hierarchies
- Use as a CLI or import as a library in Node.js/TypeScript

## Installation

```bash
npm install @superdoc-dev/ooxml-oracle
```

## CLI Usage

```bash
npx ooxml children w:p
npx ooxml tags --parents
npx ooxml namespaces
npx ooxml attrs w:p
```

- `children <prefix:local>`: List allowed children for an element
- `tags [prefix] [--parents] [--plain]`: List tags, optionally filtering by namespace or parent status
- `namespaces`: List all namespaces in the schema
- `attrs <prefix:local>`: List attributes for an element

## Library Usage

```js
import { childrenOf } from '@superdoc-dev/ooxml-oracle';

const children = childrenOf('w:p'); // Get children of <w:p>
```

## Development

- Build: `npm run build`
- Test: `npm run test`
- Coverage: `npm run test:cov`

## License

AGPLv3
