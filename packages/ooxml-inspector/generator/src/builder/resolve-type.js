/**
 * Resolves a complex type by its name.
 * @param {string} typeName - The name of the complex type.
 * @param {string} contextTns - The current target namespace.
 * @param {Object} nsMap - The namespace map.
 * @param {Object} complexTypes - The map of complex types.
 * @param {Object} simpleTypes - The map of simple types.
 * @returns {Object|null} - The resolved complex type or null if not found.
 */
export function resolveType(typeName, contextTns, nsMap, complexTypes, simpleTypes) {
  if (!typeName) return null;

  let targetTns, localName;
  if (typeName.includes(':')) {
    const [pfx, local] = typeName.split(':');
    localName = local;

    // Handle XSD built-in types - these are simple types, not complex types
    if (pfx === 'xsd' || pfx === 'xs') {
      return null; // XSD built-in types don't have child elements
    }

    // Find TNS from prefix - check the context schema's namespace declarations
    targetTns = Object.entries(nsMap).find(([, v]) => v === pfx)?.[0];
    if (!targetTns) {
      console.warn(`Unknown prefix '${pfx}' in type: ${typeName}`);
      return null;
    }
  } else {
    // No prefix, use context TNS
    localName = typeName;
    targetTns = contextTns;
  }

  const key = `${targetTns}::${localName}`;
  const resolved = complexTypes.get(key);

  if (!resolved) {
    // Check if it's a simple type (which we don't need to resolve for child elements)
    if (simpleTypes.has(key)) {
      // This is a simple type - no warning needed
      return null;
    }

    // Only warn if it's not a known simple type or XSD type
    if (!typeName.startsWith('xsd:') && !typeName.startsWith('xs:')) {
      console.warn(`Could not resolve complex type: ${typeName} in context ${contextTns}`);
    }
  }

  return resolved || null;
}
