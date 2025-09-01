import { XMLParser } from 'fast-xml-parser';

/** XML parser instance for parsing XSD files. */
export const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

/**
 * Converts a value to an array.
 * @param {any} x - The value to convert.
 * @returns {Array<any>} - The converted array.
 */
export const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/**
 * Generates a qualified name (QName) from a prefix and local name.
 * @param {string} pfx - The namespace prefix.
 * @param {string} local - The local name.
 * @returns {string} - The qualified name.
 */
export const qn = (pfx, local) => `${pfx}:${local}`;

/**
 * Resolves an inline complex type definition.
 * @param {Object} el - The element to resolve.
 * @returns {Object|null} - The resolved complex type or null if not found.
 */
export function inlineCT(el) {
  return el['xs:complexType'] || el['xsd:complexType'] || null;
}

/**
 * Get the content model for a complex type.
 * @param {Object} complexType - The complex type definition.
 * @returns {Object|null} - The content model or null if not found.
 */
export function contentRoot(complexType) {
  // Check for complex content extensions first
  const complexContent = complexType['xs:complexContent'] || complexType['xsd:complexContent'];
  if (complexContent) {
    const ext = complexContent['xs:extension'] || complexContent['xsd:extension'];
    if (ext) {
      return (
        ext['xs:sequence'] ||
        ext['xs:choice'] ||
        ext['xs:all'] ||
        ext['xsd:sequence'] ||
        ext['xsd:choice'] ||
        ext['xsd:all']
      );
    }
  }

  // Direct content model
  return (
    complexType['xs:sequence'] ||
    complexType['xs:choice'] ||
    complexType['xs:all'] ||
    complexType['xsd:sequence'] ||
    complexType['xsd:choice'] ||
    complexType['xsd:all'] ||
    null
  );
}
