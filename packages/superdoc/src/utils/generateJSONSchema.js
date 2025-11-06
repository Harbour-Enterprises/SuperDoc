/**
 * Generate JSON Schema from SuperDoc ProseMirror schema
 *
 * This generates a JSON Schema that can be used with:
 * - AJV for runtime validation
 * - Claude API tool calling (input_schema)
 * - TypeScript type generation
 * - API documentation
 *
 * Philosophy: Start minimal - generate basic structure first,
 * then add complexity only where needed.
 */

/**
 * Semantic descriptions for common nodes
 * Provides LLMs with context about *when* and *why* to use each node type
 */
const NODE_DESCRIPTIONS = {
  // Block-level content
  paragraph:
    'Standard paragraph block for body text, explanations, and general content. Use for non-heading text that forms the main document body.',
  heading:
    'Section heading with hierarchical levels 1-6. Use to structure documents: level 1 for main title, levels 2-3 for sections, 4-6 for subsections.',

  // Lists
  bulletList:
    "Unordered list with bullet points. Use for non-sequential items, features, or options where order doesn't matter.",
  orderedList:
    'Numbered list. Use for sequential steps, ranked items, or anything where order matters (procedures, instructions, rankings).',
  listItem: 'Individual item within a bullet or numbered list. Each list item contains one or more paragraphs.',

  // Tables
  table:
    'Tabular data structure with rows and cells. Use for comparisons, data tables, schedules, or any structured grid-based information.',
  tableRow: 'Single row in a table. Contains one or more table cells.',
  tableCell: 'Individual cell within a table row. Contains block content like paragraphs.',
  tableHeader: 'Header cell in a table. Use for column or row labels. Typically bold by default.',

  // Inline content
  text: 'Plain text content. The fundamental building block for all text in the document. Can have formatting marks applied.',
  image:
    'Embedded image with support for inline placement, anchored positioning, and text wrapping. Use for diagrams, photos, logos, or visual content.',
  hardBreak: 'Explicit line break within a paragraph. Use to break lines without starting a new paragraph.',

  // Template/structured content
  structuredContentBlock:
    'Template field for document templates. Use when creating fillable forms or documents with predefined placeholders that users complete later. Each field has a tag/alias for identification.',

  // Advanced features
  tableOfContents:
    'Automatically generated table of contents based on heading structure. Updates when headings change.',
  documentSection:
    'Document section container for page layout and formatting. Represents Word document sections with their own page settings.',

  // Internal nodes (preserve but don't modify)
  shapeContainer: 'Shape drawing container for Word diagrams and drawing objects. Internal Word feature.',
  shapeTextbox: 'Text box shape with text content. Internal Word feature.',
  documentPartObject: 'Embedded object reference (charts, SmartArt, etc.). Internal Word feature.',
};

/**
 * Semantic descriptions for marks (inline formatting)
 * Explains the purpose and appropriate use of each mark type
 */
const MARK_DESCRIPTIONS = {
  bold: {
    title: 'Bold Formatting',
    description:
      'Strong emphasis. Use for important terms, headings within paragraphs, or key phrases that need visual weight.',
  },
  italic: {
    title: 'Italic Formatting',
    description:
      'Subtle emphasis or stylistic distinction. Use for book titles, foreign words, technical terms, or gentle emphasis.',
  },
  underline: {
    title: 'Underline Formatting',
    description:
      'Underlined text. Use sparingly for emphasis. Note: in modern documents, underlines often imply hyperlinks.',
  },
  strike: {
    title: 'Strikethrough',
    description:
      'Strikethrough text. Use to show deletions or deprecated content that should remain visible for context.',
  },
  highlight: {
    title: 'Text Highlight',
    description: 'Background color highlight. Use to draw attention to important passages or mark content for review.',
  },
  link: {
    title: 'Hyperlink',
    description:
      'Clickable hyperlink to external URLs or internal document references. Requires href attribute with the target URL.',
  },
  textStyle: {
    title: 'Text Styling',
    description:
      'Custom text styling (font family, size, color). Use for fine-grained typographic control beyond standard formatting.',
  },

  // Collaboration features
  trackInsert: {
    title: 'Track Changes: Insertion',
    description:
      "Marks text inserted during editing (Word Track Changes). Automatically applied when document is in 'suggesting' mode. Shows additions with author and timestamp. Don't manually add - used by change tracking system.",
  },
  trackDelete: {
    title: 'Track Changes: Deletion',
    description:
      "Marks text deleted during editing (Word Track Changes). Automatically applied in 'suggesting' mode. Shows deletions with strikethrough. Don't manually add - used by change tracking system.",
  },
  trackFormat: {
    title: 'Track Changes: Formatting',
    description:
      "Marks formatting changes during editing (Word Track Changes). Automatically applied in 'suggesting' mode. Don't manually add - used by change tracking system.",
  },
  commentMark: {
    title: 'Comment Annotation',
    description:
      'Marks text with an associated comment thread. Use to highlight content that needs review, feedback, or discussion. Links to comment data structure.',
  },

  // AI features (internal)
  aiMark: {
    title: 'AI Annotation',
    description:
      "Internal marker for AI-generated or AI-modified content. Used by SuperDoc's AI features for tracking.",
  },
  aiAnimationMark: {
    title: 'AI Animation Marker',
    description: "Internal marker for animating AI-generated content. Used by SuperDoc's AI features for UI effects.",
  },
};

/**
 * Main generator function
 * @param {Object} editor - SuperDoc Editor instance
 * @returns {Object} JSON Schema (draft-07)
 */
export function generateJSONSchema(editor) {
  const schema = editor.schema;

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'SuperDoc Document',
    description:
      'SuperDoc document structure compatible with Microsoft Word .docx format. Documents must contain at least one block-level element. Common patterns: Start with a heading for the title, follow with paragraphs for body content. Use lists for enumerated items, tables for structured data, and structured content blocks for template fields. All text must be wrapped in block elements - never place text nodes directly in the document root.',
    type: 'object',
    required: ['type', 'content'],
    properties: {
      type: {
        const: 'doc',
        description: 'Root document type',
      },
      content: {
        type: 'array',
        description:
          'Document content blocks. Must contain at least one block-level node (paragraph, heading, list, table, etc.).',
        minItems: 1,
        items: {
          oneOf: getContentNodeRefs(schema, 'doc'),
        },
      },
    },
    definitions: generateDefinitions(schema),
  };
}

/**
 * Generate definitions for all nodes and marks
 */
function generateDefinitions(schema) {
  const definitions = {};

  // Generate node definitions
  Object.entries(schema.nodes).forEach(([name, nodeType]) => {
    // Skip 'doc' as it's the root, and 'text' as it's handled specially
    if (name === 'doc') return;

    definitions[name] = generateNodeDefinition(name, nodeType, schema);
  });

  // Generate mark definitions using semantic descriptions
  if (Object.keys(schema.marks).length > 0) {
    const markTypes = Object.keys(schema.marks);

    definitions.mark = {
      type: 'object',
      required: ['type'],
      properties: {
        type: {
          description: 'Mark type for inline formatting and annotations',
          oneOf: markTypes.map((markName) => {
            const markDesc = MARK_DESCRIPTIONS[markName];
            return {
              const: markName,
              title: markDesc?.title || markName,
              description: markDesc?.description || `${markName} mark`,
            };
          }),
        },
        attrs: {
          type: 'object',
          description: 'Mark attributes (e.g., href for links, color for highlights)',
        },
      },
    };
  }

  return definitions;
}

/**
 * Generate a JSON Schema definition for a single node type
 */
function generateNodeDefinition(name, nodeType, schema) {
  const def = {
    type: 'object',
    required: ['type'],
    properties: {
      type: {
        const: name,
        description: NODE_DESCRIPTIONS[name] || `${name} node`,
      },
    },
  };

  // Add content property if node can have content
  if (!nodeType.isLeaf && !nodeType.isText) {
    const contentRefs = getContentNodeRefs(schema, name);

    if (contentRefs.length > 0) {
      def.properties.content = {
        type: 'array',
        description: `Content of ${name} node`,
        items: {
          oneOf: contentRefs,
        },
      };

      // Make content required for block nodes
      if (nodeType.isBlock && !def.required.includes('content')) {
        def.required.push('content');
      }
    }
  }

  // Add text property for text nodes
  if (nodeType.isText) {
    def.properties.text = {
      type: 'string',
      description: 'Text content',
    };
    def.required.push('text');
  }

  // Add marks property for inline nodes
  if (nodeType.isInline || nodeType.isText) {
    def.properties.marks = {
      type: 'array',
      description: 'Formatting marks applied to this node',
      items: {
        $ref: '#/definitions/mark',
      },
    };
  }

  // Add attrs if node has attributes
  if (nodeType.spec.attrs) {
    const attrsSchema = generateAttrsSchema(nodeType.spec.attrs);
    if (Object.keys(attrsSchema.properties).length > 0) {
      def.properties.attrs = attrsSchema;
    }
  }

  return def;
}

/**
 * Generate schema for node attributes
 */
function generateAttrsSchema(attrs) {
  const properties = {};
  const required = [];

  Object.entries(attrs).forEach(([name, spec]) => {
    const propDef = {
      description: `Attribute: ${name}`,
    };

    // Infer type from default value
    const defaultValue = spec.default;
    if (defaultValue !== null && defaultValue !== undefined) {
      const type = typeof defaultValue;
      if (type === 'string') propDef.type = 'string';
      else if (type === 'number') propDef.type = 'number';
      else if (type === 'boolean') propDef.type = 'boolean';
      else if (Array.isArray(defaultValue)) propDef.type = 'array';
      else if (type === 'object') propDef.type = 'object';

      propDef.default = defaultValue;
    } else {
      // No default, allow any type
      propDef.type = ['string', 'number', 'boolean', 'object', 'array', 'null'];
    }

    properties[name] = propDef;

    // If no default, it's required
    if (spec.default === undefined) {
      required.push(name);
    }
  });

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}

/**
 * Get valid content node references for a given parent node
 *
 * This uses ProseMirror's content expression to determine
 * which nodes can appear as children.
 */
function getContentNodeRefs(schema, parentNodeName) {
  const nodeType = schema.nodes[parentNodeName];
  const refs = [];

  // Check what this node allows as content
  const contentMatch = nodeType.contentMatch;
  if (!contentMatch) return refs;

  // Get all possible child node types
  // This is a simplified approach - walks all node types and checks if they're valid
  Object.entries(schema.nodes).forEach(([name, type]) => {
    // Skip doc node as content
    if (name === 'doc') return;

    // Check if this node type can be a child
    const canBeChild = contentMatch.matchType(type);

    if (canBeChild) {
      refs.push({ $ref: `#/definitions/${name}` });
    }
  });

  // If no refs found but node allows content, allow any node
  if (refs.length === 0 && !nodeType.isLeaf) {
    Object.keys(schema.nodes).forEach((name) => {
      if (name !== 'doc') {
        refs.push({ $ref: `#/definitions/${name}` });
      }
    });
  }

  return refs;
}

/**
 * Validate a document against the generated schema using AJV
 *
 * @param {Object} doc - Document JSON to validate
 * @param {Object} schema - JSON Schema
 * @param {Object} ajv - AJV instance
 * @returns {Object} { valid: boolean, errors: array }
 */
export function validateDocument(doc, schema, ajv) {
  const validate = ajv.compile(schema);
  const valid = validate(doc);

  return {
    valid,
    errors: validate.errors || [],
  };
}
