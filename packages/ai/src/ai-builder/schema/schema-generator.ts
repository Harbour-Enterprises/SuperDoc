import type { Editor } from '../../shared/types';

/**
 * Schema summary structure from editor.getSchemaSummaryJSON()
 */
interface SchemaSummaryAttribute {
    default: any;
    required: boolean;
}

interface SchemaSummaryNode {
    name: string;
    attrs: Record<string, SchemaSummaryAttribute>;
    group?: string;
    content?: string;
    marks?: string;
    inline?: boolean;
    atom?: boolean;
    defining?: boolean;
}

interface SchemaSummaryMark {
    name: string;
    attrs: Record<string, SchemaSummaryAttribute>;
    group?: string;
    inclusive?: boolean;
    excludes?: string;
}

interface SchemaSummaryJSON {
    version: string;
    schemaVersion: string;
    topNode?: string;
    nodes: SchemaSummaryNode[];
    marks: SchemaSummaryMark[];
}

/**
 * Options for schema generation
 */
export interface SchemaGeneratorOptions {
    /** Node types to exclude from schema */
    excludedNodes?: string[];
    /** Mark types to exclude from schema */
    excludedMarks?: string[];
    /** Whether to include descriptions for better AI understanding */
    includeDescriptions?: boolean;
}

/**
 * Convert a ProseMirror attribute type to JSON Schema type
 */
function getAttributeType(attrValue: any): any {
    if (attrValue === null || attrValue === undefined) {
        return { type: ['string', 'number', 'boolean', 'null'] };
    }

    const type = typeof attrValue;
    switch (type) {
        case 'string':
            return { type: 'string' };
        case 'number':
            return { type: 'number' };
        case 'boolean':
            return { type: 'boolean' };
        case 'object':
            if (Array.isArray(attrValue)) {
                return { type: 'array' };
            }
            return { type: 'object' };
        default:
            return { type: ['string', 'number', 'boolean', 'object', 'null'] };
    }
}

/**
 * Generate JSON Schema for node attributes
 */
function generateAttributesSchema(
    attrs: Record<string, SchemaSummaryAttribute>,
    excludedAttrs: string[] = []
): { properties: Record<string, any>; required?: string[] } {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [attrName, attrSpec] of Object.entries(attrs)) {
        if (excludedAttrs.includes(attrName)) {
            continue;
        }

        properties[attrName] = getAttributeType(attrSpec.default);

        if (attrSpec.required) {
            required.push(attrName);
        }
    }

    return {
        properties,
        ...(required.length > 0 ? { required } : {}),
    };
}

/**
 * Generate JSON Schema for marks
 */
function generateMarksSchema(
    marks: SchemaSummaryMark[],
    excludedMarks: string[] = []
): any {
    const markSchemas = marks
        .filter((mark) => !excludedMarks.includes(mark.name))
        .map((mark) => {
            const schema: any = {
                type: 'object',
                required: ['type'],
                properties: {
                    type: {
                        type: 'string',
                        const: mark.name,
                        description: `${mark.name} mark`,
                    },
                },
                additionalProperties: false,
            };

            // Add attrs if the mark has any
            if (mark.attrs && Object.keys(mark.attrs).length > 0) {
                const attrsSchema = generateAttributesSchema(mark.attrs);
                schema.properties.attrs = {
                    type: 'object',
                    ...attrsSchema,
                };
            }

            return schema;
        });

    if (markSchemas.length === 0) {
        return undefined;
    }

    if (markSchemas.length === 1) {
        return markSchemas[0];
    }

    return {
        oneOf: markSchemas,
    };
}

/**
 * Generate JSON Schema for text nodes
 */
function generateTextNodeSchema(marksSchema?: any): any {
    const schema: any = {
        type: 'object',
        required: ['type', 'text'],
        properties: {
            type: {
                type: 'string',
                const: 'text',
                description: 'Text content node',
            },
            text: {
                type: 'string',
                description: 'The actual text content',
            },
        },
        additionalProperties: false,
    };

    if (marksSchema) {
        schema.properties.marks = {
            type: 'array',
            description: 'Formatting marks applied to this text',
            items: marksSchema,
        };
    }

    return schema;
}

/**
 * Generate JSON Schema for a single node type
 */
function generateNodeSchema(
    node: SchemaSummaryNode,
    marksSchema?: any,
    contentNodesSchema?: any
): any {
    const schema: any = {
        type: 'object',
        required: ['type'],
        properties: {
            type: {
                type: 'string',
                const: node.name,
                description: `${node.name} node${node.group ? ` (group: ${node.group})` : ''}`,
            },
        },
        additionalProperties: false,
    };

    // Add content if the node can have content
    if (node.content && !node.atom) {
        // For nodes that can contain text
        if (node.content.includes('text') || node.content.includes('inline')) {
            schema.properties.content = {
                type: 'array',
                description: 'Content of the node',
                items: {
                    oneOf: [generateTextNodeSchema(marksSchema), { type: 'object' }], // Simplified
                },
            };
            schema.required = ['type', 'content'];
        } else {
            // For block-level nodes
            schema.properties.content = {
                type: 'array',
                description: 'Content of the node',
                items: contentNodesSchema || { type: 'object' },
            };
        }
    }

    // Add attrs if the node has any
    if (node.attrs && Object.keys(node.attrs).length > 0) {
        const attrsSchema = generateAttributesSchema(node.attrs);
        schema.properties.attrs = {
            type: 'object',
            description: `Attributes for ${node.name}`,
            ...attrsSchema,
        };
    }

    return schema;
}

/**
 * Generate content schema from editor's schema summary.
 * This creates a JSON Schema that describes the document structure for AI tools.
 *
 * @param editor - SuperDoc editor instance
 * @param options - Schema generation options
 * @returns JSON Schema object describing valid document content
 *
 * @example
 * ```typescript
 * const schema = await generateContentSchema(editor, {
 *   excludedNodes: ['doc', 'tableRow', 'tableCell'],
 *   excludedMarks: ['trackInsert', 'trackDelete'],
 *   includeDescriptions: true
 * });
 * ```
 */
export async function generateContentSchema(
    editor: Editor,
    options?: SchemaGeneratorOptions
): Promise<any> {
    const {
        excludedNodes = ['doc'], // Exclude doc node as it's the container
        excludedMarks = [],
        includeDescriptions = true,
    } = options || {};

    // Get schema summary from editor
    const schemaSummary: SchemaSummaryJSON = await editor.getSchemaSummaryJSON();

    // Generate marks schema
    const marksSchema = generateMarksSchema(schemaSummary.marks, excludedMarks);

    // Filter nodes
    const blockNodes = schemaSummary.nodes.filter(
        (node) => !excludedNodes.includes(node.name) && node.group?.includes('block')
    );

    const inlineNodes = schemaSummary.nodes.filter(
        (node) => !excludedNodes.includes(node.name) && node.inline
    );

    // Generate schemas for block nodes (these are the top-level content items)
    const blockNodeSchemas = blockNodes.map((node) =>
        generateNodeSchema(node, marksSchema)
    );

    // If no block nodes found, include all non-excluded nodes
    if (blockNodeSchemas.length === 0) {
        const allNodes = schemaSummary.nodes.filter(
            (node) => !excludedNodes.includes(node.name)
        );
        blockNodeSchemas.push(
            ...allNodes.map((node) => generateNodeSchema(node, marksSchema))
        );
    }

    // Main content schema - array of block nodes
    const contentSchema = {
        type: 'array',
        description: includeDescriptions
            ? 'Array of content nodes (paragraphs, headings, lists, etc.)'
            : undefined,
        items:
            blockNodeSchemas.length === 1
                ? blockNodeSchemas[0]
                : {
                      oneOf: blockNodeSchemas,
                  },
    };

    // Clean up undefined values
    return JSON.parse(JSON.stringify(contentSchema));
}

/**
 * Generate a simplified content schema (legacy compatibility).
 * Uses hardcoded paragraph-based schema similar to the original CONTENT_SCHEMA.
 *
 * @deprecated Use generateContentSchema instead for full schema support
 */
export function generateLegacyContentSchema(): any {
    return {
        type: 'array',
        description: 'Array of paragraph nodes that make up the document content',
        items: {
            additionalProperties: false,
            type: 'object',
            required: ['type', 'content'],
            properties: {
                type: {
                    type: 'string',
                    const: 'paragraph',
                    description:
                        'Paragraph node. For headings, use styleId attribute (e.g., "Heading1"). For lists, use numberingProperties.',
                },
                content: {
                    type: 'array',
                    description: 'Array of text nodes and line breaks',
                    items: {
                        oneOf: [
                            {
                                type: 'object',
                                required: ['type', 'text'],
                                properties: {
                                    type: { type: 'string', const: 'text' },
                                    text: { type: 'string' },
                                    marks: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['type'],
                                            properties: {
                                                type: {
                                                    type: 'string',
                                                    enum: [
                                                        'bold',
                                                        'italic',
                                                        'underline',
                                                        'strike',
                                                        'link',
                                                        'highlight',
                                                    ],
                                                },
                                                attrs: { type: 'object' },
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                type: 'object',
                                required: ['type'],
                                properties: {
                                    type: { type: 'string', const: 'hardBreak' },
                                },
                            },
                        ],
                    },
                },
                attrs: {
                    type: 'object',
                    properties: {
                        styleId: { type: 'string' },
                        textAlign: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
                        numberingProperties: {
                            type: 'object',
                            required: ['numId', 'ilvl'],
                            properties: {
                                numId: { type: 'number' },
                                ilvl: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
    };
}

/**
 * Cache for generated schemas to avoid regenerating on every tool call
 */
const schemaCache = new WeakMap<Editor, Promise<any>>();

/**
 * Get content schema for editor (with caching).
 * Generates schema once per editor instance and caches the result.
 *
 * @param editor - SuperDoc editor instance
 * @param options - Schema generation options
 * @returns Cached or newly generated content schema
 *
 * @example
 * ```typescript
 * const schema = await getContentSchema(editor);
 * // Subsequent calls return cached schema
 * const sameSchema = await getContentSchema(editor);
 * ```
 */
export async function getContentSchema(
    editor: Editor,
    options?: SchemaGeneratorOptions
): Promise<any> {
    if (!schemaCache.has(editor)) {
        schemaCache.set(editor, generateContentSchema(editor, options));
    }
    return schemaCache.get(editor)!;
}

/**
 * Clear schema cache for an editor.
 * Call this if the editor's schema changes dynamically.
 *
 * @param editor - SuperDoc editor instance
 */
export function clearSchemaCache(editor: Editor): void {
    schemaCache.delete(editor);
}