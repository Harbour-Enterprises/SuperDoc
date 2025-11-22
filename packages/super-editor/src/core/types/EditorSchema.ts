import type { AttributeValue } from '../Attribute.js';

/**
 * Represents an attribute in a schema summary.
 *
 * Describes the default value and requirement status of a ProseMirror node or mark attribute.
 * Attributes without defaults are considered required when creating nodes/marks.
 *
 * @example
 * ```typescript
 * // Optional attribute with default value
 * const idAttr: SchemaSummaryAttribute = {
 *   default: null,
 *   required: false
 * };
 *
 * // Required attribute (no default)
 * const labelAttr: SchemaSummaryAttribute = {
 *   default: null,
 *   required: true
 * };
 * ```
 */
export type SchemaSummaryAttribute = {
  /** The default value for this attribute, or null if none */
  default: AttributeValue;
  /** Whether this attribute must be provided when creating the node/mark */
  required: boolean;
};

/**
 * Represents a node type in a schema summary.
 *
 * Contains all relevant information about a ProseMirror node type, including its
 * attributes, content model, and behavioral properties. This is used for schema
 * documentation, comparison, and runtime inspection.
 *
 * @example
 * ```typescript
 * const paragraphNode: SchemaSummaryNode = {
 *   name: 'paragraph',
 *   attrs: {
 *     id: { default: null, required: false },
 *     alignment: { default: 'left', required: false }
 *   },
 *   group: 'block',
 *   content: 'inline*',
 *   marks: '_'
 * };
 * ```
 */
export type SchemaSummaryNode = {
  /** The unique name of this node type */
  name: string;
  /** Map of attribute names to their specifications */
  attrs: Record<string, SchemaSummaryAttribute>;
  /** The group(s) this node belongs to (space-separated) */
  group?: string;
  /** The content expression defining what this node can contain */
  content?: string;
  /** Which marks are allowed on this node's content */
  marks?: string;
  /** Whether this node is inline (vs block) */
  inline?: boolean;
  /** Whether this node is atomic (cannot have cursor inside) */
  atom?: boolean;
  /** Whether this node can be selected as a whole */
  selectable?: boolean;
  /** Whether this node can be dragged */
  draggable?: boolean;
  /** Whether this node defines a boundary for structure */
  defining?: boolean;
  /** Whether this node isolates its content from surroundings */
  isolating?: boolean;
  /** Whether this node represents code */
  code?: boolean;
  /** The table role if this is a table-related node */
  tableRole?: string;
};

/**
 * Represents a mark type in a schema summary.
 *
 * Contains all relevant information about a ProseMirror mark type, including its
 * attributes and behavioral properties. Marks are used to add inline formatting
 * and annotations to content.
 *
 * @example
 * ```typescript
 * const boldMark: SchemaSummaryMark = {
 *   name: 'bold',
 *   attrs: {},
 *   group: 'formatting',
 *   inclusive: true,
 *   excludes: 'code'
 * };
 * ```
 */
export type SchemaSummaryMark = {
  /** The unique name of this mark type */
  name: string;
  /** Map of attribute names to their specifications */
  attrs: Record<string, SchemaSummaryAttribute>;
  /** The group(s) this mark belongs to (space-separated) */
  group?: string;
  /** Whether this mark includes newly typed text at its boundaries */
  inclusive?: boolean;
  /** Mark types that this mark excludes (cannot coexist with) */
  excludes?: string;
  /** Whether this mark spans across node boundaries */
  spanning?: boolean;
  /** Whether this mark represents code formatting */
  code?: boolean;
};

/**
 * Complete schema summary in JSON format.
 *
 * Represents a comprehensive snapshot of a ProseMirror schema, including all
 * node types, mark types, and metadata. This format is suitable for serialization,
 * version tracking, and schema comparison.
 *
 * @example
 * ```typescript
 * const summary: SchemaSummaryJSON = {
 *   version: '0.0.1',          // SuperEditor version
 *   schemaVersion: '1.0.0',    // Schema version
 *   topNode: 'doc',
 *   nodes: [
 *     { name: 'doc', attrs: {}, content: 'block+' },
 *     { name: 'paragraph', attrs: {}, group: 'block', content: 'inline*' }
 *   ],
 *   marks: [
 *     { name: 'bold', attrs: {}, inclusive: true }
 *   ]
 * };
 * ```
 */
export type SchemaSummaryJSON = {
  /** The SuperEditor application version that generated this summary */
  version: string;
  /** The semantic version of the schema being summarized */
  schemaVersion: string;
  /** The name of the top-level node type (typically 'doc') */
  topNode?: string;
  /** Array of all node type definitions in this schema */
  nodes: SchemaSummaryNode[];
  /** Array of all mark type definitions in this schema */
  marks: SchemaSummaryMark[];
};

/**
 * Parameters for requesting a schema summary.
 *
 * Options object for specifying which schema version to summarize. If no version
 * is provided, the latest available frozen schema version will be used.
 *
 * @example
 * ```typescript
 * // Request specific version
 * const params1: SchemaSummaryParams = { version: '1.0.0' };
 *
 * // Request latest version (implicit)
 * const params2: SchemaSummaryParams = {};
 *
 * // Usage with Editor API
 * const summary = await editor.getSchemaSummaryJSON({ version: '2.0.0' });
 * ```
 */
export type SchemaSummaryParams = {
  /** The semantic version of the frozen schema to summarize */
  version?: string;
};
