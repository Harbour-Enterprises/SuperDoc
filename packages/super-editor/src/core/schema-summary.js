const summaryVersion =
  (typeof globalThis.__APP_VERSION__ === 'string' && globalThis.__APP_VERSION__) ||
  (typeof globalThis.version === 'string' && globalThis.version) ||
  '0.0.0';

const nodeKeys = ['group', 'content', 'marks', 'inline', 'atom', 'defining', 'code', 'tableRole', 'summary'];

const markKeys = ['group', 'inclusive', 'excludes', 'spanning', 'code'];

function mapAttributes(attrs) {
  if (!attrs) return {};

  return Object.fromEntries(
    Object.entries(attrs).map(([name, attrSpec]) => {
      const defaultValue = attrSpec?.default;
      return [
        name,
        {
          default: defaultValue ?? null,
          required: defaultValue === undefined,
        },
      ];
    }),
  );
}

function pickSpecFields(spec, keys) {
  return Object.fromEntries(keys.map((key) => [key, spec[key]]).filter(([, value]) => value !== undefined));
}

export function buildSchemaSummary(schema, schemaVersion) {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Invalid schema: schema must be a valid ProseMirror Schema object.');
  }

  const resolvedSchemaVersion = schemaVersion || 'current';

  const nodes = [];
  schema.spec.nodes.forEach((name, spec) => {
    nodes.push({
      name,
      attrs: mapAttributes(spec.attrs),
      ...pickSpecFields(spec, nodeKeys),
    });
  });

  const marks = [];
  schema.spec.marks.forEach((name, spec) => {
    marks.push({
      name,
      attrs: mapAttributes(spec.attrs),
      ...pickSpecFields(spec, markKeys),
    });
  });

  return {
    version: summaryVersion,
    schemaVersion: resolvedSchemaVersion,
    topNode: schema.topNodeType?.name,
    nodes,
    marks,
  };
}
