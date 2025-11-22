import type { Schema } from 'prosemirror-model';
import { Schema as ExtensionSchema } from '../Schema.js';
import { getLatestFrozenSchemaVersion, hasFrozenSchema, loadFrozenSchema } from './schema-loader.js';
import type { SchemaSummaryJSON, SchemaSummaryParams, SchemaSummaryAttribute } from '../types/EditorSchema.js';
import type { AttributeValue } from '../Attribute.js';
import type { EditorExtension } from '../types/EditorConfig.js';
import type { Editor } from '../Editor.js';

declare const __APP_VERSION__: string | undefined;
declare const version: string | undefined;

const summaryVersion =
  (typeof __APP_VERSION__ === 'string' && __APP_VERSION__) ||
  (typeof version === 'string' && version) ||
  '0.0.0';

const nodeKeys = [
  'group',
  'content',
  'marks',
  'inline',
  'atom',
  'selectable',
  'draggable',
  'defining',
  'isolating',
  'code',
  'tableRole',
] as const;

const markKeys = ['group', 'inclusive', 'excludes', 'spanning', 'code'] as const;

/**
 * Maps ProseMirror attribute specifications to schema summary attribute format.
 *
 * Transforms the raw attribute specifications from a ProseMirror node or mark spec
 * into a simplified format suitable for schema summaries, extracting default values
 * and determining whether each attribute is required.
 *
 * @param attrs - The attributes object from a ProseMirror node or mark spec
 * @returns A record mapping attribute names to their summary representation
 *
 * @example
 * ```typescript
 * const attrs = {
 *   id: { default: null },
 *   level: { default: 1 },
 *   label: {} // no default, so required
 * };
 * const mapped = mapAttributes(attrs);
 * // Returns:
 * // {
 * //   id: { default: null, required: false },
 * //   level: { default: 1, required: false },
 * //   label: { default: null, required: true }
 * // }
 * ```
 */
function mapAttributes(
  attrs: Record<string, { default?: unknown }> | null | undefined,
): Record<string, SchemaSummaryAttribute> {
  if (!attrs) return {};
  return Object.fromEntries(
    Object.entries(attrs).map(([name, attrSpec]) => {
      const defaultValue = attrSpec?.default as AttributeValue | undefined;
      return [
        name,
        {
          default: defaultValue ?? null,
          required: defaultValue === undefined,
        },
      ];
    }),
  ) as Record<string, SchemaSummaryAttribute>;
}

/**
 * Extracts specified fields from a ProseMirror spec object.
 *
 * Filters a spec object to only include the fields listed in the keys array,
 * omitting any fields with undefined values. This is used to extract relevant
 * schema properties while excluding implementation details.
 *
 * @param spec - The ProseMirror node or mark specification object
 * @param keys - Array of field names to extract from the spec
 * @returns A partial object containing only the specified fields with defined values
 *
 * @example
 * ```typescript
 * const spec = { group: 'block', content: 'inline*', code: true, other: undefined };
 * const picked = pickSpecFields(spec, ['group', 'content', 'code', 'other']);
 * // Returns: { group: 'block', content: 'inline*', code: true }
 * ```
 */
function pickSpecFields(
  spec: Record<string, unknown>,
  keys: readonly string[],
): Partial<SchemaSummaryJSON['nodes'][number]> | Partial<SchemaSummaryJSON['marks'][number]> {
  return Object.fromEntries(keys.map((key) => [key, spec[key]]).filter(([, value]) => value !== undefined));
}

/**
 * Builds a comprehensive schema summary from a ProseMirror schema.
 *
 * Extracts and formats all nodes and marks from the schema into a JSON-serializable
 * summary format that includes node/mark names, attributes, and relevant properties.
 * This summary is useful for schema documentation, validation, and version tracking.
 *
 * @param schema - The ProseMirror schema to summarize
 * @param schemaVersion - The version identifier for this schema (e.g., "1.0.0")
 * @returns A complete schema summary object
 * @throws {Error} If schema is null, undefined, or invalid
 * @throws {Error} If schemaVersion is not a valid semver string
 *
 * @example
 * ```typescript
 * const editor = new Editor({ ... });
 * const summary = buildSchemaSummary(editor.schema, '1.0.0');
 * console.log(summary);
 * // {
 * //   version: '0.0.1',
 * //   schemaVersion: '1.0.0',
 * //   topNode: 'doc',
 * //   nodes: [{ name: 'doc', attrs: {}, ... }, ...],
 * //   marks: [{ name: 'bold', attrs: {}, ... }, ...]
 * // }
 * ```
 */
export function buildSchemaSummary(schema: Schema, schemaVersion: string): SchemaSummaryJSON {
  // Validate inputs
  if (!schema || typeof schema !== 'object') {
    throw new Error('Invalid schema: schema must be a valid ProseMirror Schema object.');
  }

  if (!schemaVersion || typeof schemaVersion !== 'string') {
    throw new Error('Invalid schemaVersion: must be a non-empty string.');
  }

  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+].+)?$/.test(schemaVersion)) {
    throw new Error(
      `Invalid schemaVersion format: "${schemaVersion}". Expected semver format (e.g., "1.0.0" or "1.0.0-beta.1").`,
    );
  }

  const nodes: SchemaSummaryJSON['nodes'] = [];
  schema.spec.nodes.forEach((name, spec) => {
    nodes.push({
      name,
      attrs: mapAttributes(spec.attrs),
      ...pickSpecFields(spec as Record<string, unknown>, nodeKeys),
    });
  });

  const marks: SchemaSummaryJSON['marks'] = [];
  schema.spec.marks.forEach((name, spec) => {
    marks.push({
      name,
      attrs: mapAttributes(spec.attrs),
      ...pickSpecFields(spec as Record<string, unknown>, markKeys),
    });
  });

  return {
    version: summaryVersion,
    schemaVersion,
    topNode: schema.topNodeType?.name,
    nodes,
    marks,
  };
}

/**
 * Builds a schema summary from a frozen schema version.
 *
 * Loads a frozen schema from the schema management system, extracts its extensions,
 * creates a ProseMirror schema from those extensions, and generates a comprehensive
 * summary. This is the primary method for generating schema documentation from
 * frozen/versioned schemas without instantiating a full editor.
 *
 * @param editor - The Editor instance used for schema creation context
 * @param schemaVersionOrOptions - Either a version string or options object with version
 * @returns A promise resolving to the complete schema summary
 * @throws {Error} If no frozen schemas are available
 * @throws {Error} If the requested schema version is not available
 * @throws {Error} If the frozen schema doesn't expose getStarterExtensions()
 * @throws {Error} If the extensions array is empty or invalid
 *
 * @example
 * ```typescript
 * const editor = new Editor({ isHeadless: true, ... });
 *
 * // Get summary for latest frozen schema
 * const summary1 = await buildSchemaSummaryFromFrozen(editor);
 *
 * // Get summary for specific version
 * const summary2 = await buildSchemaSummaryFromFrozen(editor, '1.0.0');
 *
 * // Get summary with options object
 * const summary3 = await buildSchemaSummaryFromFrozen(editor, { version: '1.0.0' });
 * ```
 */
export async function buildSchemaSummaryFromFrozen(
  editor: Editor,
  schemaVersionOrOptions?: string | SchemaSummaryParams,
): Promise<SchemaSummaryJSON> {
  const requestedVersion = typeof schemaVersionOrOptions === 'string' ? schemaVersionOrOptions : schemaVersionOrOptions?.version;
  const targetVersion = requestedVersion || getLatestFrozenSchemaVersion();
  if (!targetVersion) {
    throw new Error('No frozen schemas are available to summarize.');
  }

  if (!hasFrozenSchema(targetVersion)) {
    const fallback = getLatestFrozenSchemaVersion();
    const note = fallback ? `Latest available version: ${fallback}` : 'No versions present.';
    throw new Error(`Schema version "${targetVersion}" is not available. ${note}`);
  }

  const frozenModule = await loadFrozenSchema(targetVersion);
  const getStarterExtensions = (frozenModule as { getStarterExtensions?: () => EditorExtension[] }).getStarterExtensions;
  if (typeof getStarterExtensions !== 'function') {
    throw new Error(`Frozen schema version "${targetVersion}" does not expose getStarterExtensions().`);
  }

  const extensions = getStarterExtensions();

  // Validate extensions array
  if (!Array.isArray(extensions) || extensions.length === 0) {
    throw new Error(
      `Invalid extensions from frozen schema "${targetVersion}": expected non-empty array, got ${
        Array.isArray(extensions) ? 'empty array' : typeof extensions
      }.`,
    );
  }

  const pmSchema = ExtensionSchema.createSchemaByExtensions(extensions, editor);
  return buildSchemaSummary(pmSchema, targetVersion);
}
