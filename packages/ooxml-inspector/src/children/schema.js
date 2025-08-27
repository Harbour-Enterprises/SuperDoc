import schemaJson from '../../dist/schema.transitional.json' with { type: 'json' };

let CACHE = null;

/** Return the OOXML schema (bundled JSON). */
export function getSchema() {
  return (CACHE ??= schemaJson);
}

/** Legacy sync loader: just return the bundled JSON in runtime. */
export function loadSchemaSync() {
  return getSchema();
}
