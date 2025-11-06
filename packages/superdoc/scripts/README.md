# Schema Generator

Automatically generates a JSON Schema from the SuperDoc ProseMirror schema.

## Overview

The schema generator introspects the SuperDoc editor's ProseMirror schema and produces a JSON Schema (draft-07) that describes the structure of SuperDoc documents. This schema can be used for:

- **Runtime validation** with AJV or similar validators
- **Claude API tool calling** for AI-powered document generation
- **API documentation** to describe the document format
- **TypeScript type generation** for type-safe document manipulation

## Usage

After building the superdoc package, run the schema generator:

```bash
npm run schema:generate
```

This will create `superdoc-schema.json` in the `packages/superdoc/dist/` directory.

## Output

The generated schema includes:

- **Document root structure**: Defines the top-level `doc` node with required content
- **Node definitions**: All ProseMirror node types (paragraph, heading, table, etc.)
- **Mark definitions**: All formatting marks (bold, italic, link, etc.)
- **Attribute schemas**: Type-safe definitions for node attributes
- **Content relationships**: Which nodes can contain which other nodes

### Example Schema Structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SuperDoc Document",
  "type": "object",
  "required": ["type", "content"],
  "properties": {
    "type": { "const": "doc" },
    "content": {
      "type": "array",
      "minItems": 1,
      "items": { "oneOf": [...] }
    }
  },
  "definitions": {
    "paragraph": {...},
    "heading": {...},
    ...
  }
}
```

## Use Cases

### 1. Document Validation

Use with AJV to validate SuperDoc JSON documents:

```javascript
import Ajv from 'ajv';
import schema from './dist/superdoc-schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);

const doc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello World' }],
    },
  ],
};

if (validate(doc)) {
  console.log('Valid document!');
} else {
  console.log('Validation errors:', validate.errors);
}
```

### 2. LLM Tool Calling

Use as input schema for LLM's to generate structured documents:

```javascript
import schema from './dist/superdoc-schema.json';

const toolSchema = {
  name: 'generate_superdoc',
  description: 'Generate a SuperDoc JSON document with the specified content.',
  input_schema: {
    type: 'object',
    properties: {
      document: schema
    },
    required: ['document']
  }
};

// Use with LLM
const response = await llm.messages.create({
  model: 'claude-sonnet-4-20250514',
  tools: [toolSchema],
  messages: [...]
});
```

## Implementation Details

The schema generator:

1. Creates a headless editor instance with all starter extensions
2. Introspects the ProseMirror schema to extract node and mark definitions
3. Analyzes content expressions to determine parent-child relationships
4. Generates JSON Schema definitions for all nodes and marks
5. Infers attribute types from default values
6. Outputs a complete JSON Schema (draft-07) document

## Files

- `generate-schema.mjs` - Main script that generates the schema
- `../src/utils/generateJSONSchema.js` - Core schema generation logic
- `../dist/superdoc-schema.json` - Generated schema (created after running the script)

## Requirements

- Node.js 16+
- Built superdoc package (`npm run build` in the superdoc directory)
- JSDOM (included as dependency)

## Development

To modify the schema generation logic:

1. Edit `src/utils/generateJSONSchema.js` to change how the schema is generated
2. Run `npm run schema:generate` to test your changes
3. Check the generated `dist/superdoc-schema.json` file
