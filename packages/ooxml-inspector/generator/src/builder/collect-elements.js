import { arr } from './index.js';

/** @type {number} */
const MAX_XSD_DEPTH = 10;

/**
 * Recursively collect elements from a given node. Most nodes seem to max out around 7 levels
 * so 10 seems like a sufficient max.
 *
 * @param {Object} node - The XML node to collect elements from.
 * @param {string} tns - The target namespace.
 * @param {string} prefix - The namespace prefix.
 * @param {Map} elements - The map to collect elements.
 * @param {Map} elementRefs - The map to collect element references.
 * @param {number} depth - The current depth in the XML structure.
 */
export function collectElements(node, tns, prefix, elements, elementRefs, depth = 0) {
  if (!node || depth > MAX_XSD_DEPTH) return;

  // Direct elements
  const els = arr(node['xs:element']).concat(arr(node['xsd:element']));
  for (const el of els) {
    if (el.name) {
      const key = `${tns}::${el.name}`;
      if (!elements.has(key)) {
        elements.set(key, { tns, prefix, name: el.name, el });
      }
    } else if (el.ref) {
      // Track element reference for later resolution
      elementRefs.set(el.ref, { tns, prefix });
    }
  }

  // Recurse into sequences, choices, alls
  const containers = []
    .concat(arr(node['xs:sequence']), arr(node['xsd:sequence']))
    .concat(arr(node['xs:choice']), arr(node['xsd:choice']))
    .concat(arr(node['xs:all']), arr(node['xsd:all']));

  for (const container of containers) {
    collectElements(container, tns, prefix, elements, elementRefs, depth + 1);
  }

  // Recurse into complex content
  const complexContent = node['xs:complexContent'] || node['xsd:complexContent'];
  if (complexContent) {
    const ext = complexContent['xs:extension'] || complexContent['xsd:extension'];
    const res = complexContent['xs:restriction'] || complexContent['xsd:restriction'];
    if (ext) collectElements(ext, tns, prefix, elements, elementRefs, depth + 1);
    if (res) collectElements(res, tns, prefix, elements, elementRefs, depth + 1);
  }

  // Recurse into simple content (might have attributes that are elements)
  const simpleContent = node['xs:simpleContent'] || node['xsd:simpleContent'];
  if (simpleContent) {
    const ext = simpleContent['xs:extension'] || simpleContent['xsd:extension'];
    const res = simpleContent['xs:restriction'] || simpleContent['xsd:restriction'];
    if (ext) collectElements(ext, tns, prefix, elements, elementRefs, depth + 1);
    if (res) collectElements(res, tns, prefix, elements, elementRefs, depth + 1);
  }
}
