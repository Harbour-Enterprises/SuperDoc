import { autoPrefix, qn } from './index.js';

/**
 * Resolve the qualified name of a child element.
 * @param {Object} e - The element to resolve.
 * @param {string} contextTns - The current target namespace.
 * @param {Object} nsMap - The namespace map.
 * @returns {string|null} - The resolved qualified name or null if not found.
 */
export function resolveChildQName(e, contextTns, nsMap) {
  if (e.ref) {
    // Element reference
    if (e.ref.includes(':')) {
      const [pfx, local] = e.ref.split(':');
      const targetTns = Object.entries(nsMap).find(([, v]) => v === pfx)?.[0];
      if (!targetTns) return null;
      return qn(nsMap[targetTns], local);
    } else {
      // No prefix, assume same namespace
      return qn(nsMap[contextTns] || 'unknown', e.ref);
    }
  }

  if (e.name) {
    // Inline element - use context TNS or the element's own _contextTns
    const elementTns = e._contextTns || contextTns;
    const prefix = nsMap[elementTns] || autoPrefix(elementTns, nsMap);
    return qn(prefix, e.name);
  }

  return null;
}
