import { arr, autoPrefix } from './index.js';

/**
 * Collect elements from a given node.
 * Recursively collect xs:element nodes from sequences/choices/alls/groups
 * Also collects element definitions found along the way
 * @param {Object} node - The XML node to collect elements from.
 * @param {Array} outEls - The output array to collect elements into.
 * @param {string} contextTns - The current target namespace.
 * @param {number} depth - The current depth in the XML structure.
 * @param {Map} elementsMap - A map of known elements.
 * @param {Record<string, string>} nsMap - A map of namespace prefixes.
 * @param {Map} groups - A map of group definitions.
 * @returns {void}
 */
export function expandContent(node, outEls, contextTns, depth = 0, elementsMap, nsMap, groups) {
  if (!node || depth > 10) return; // prevent infinite recursion

  // Direct elements
  const els = arr(node['xs:element']).concat(arr(node['xsd:element']));
  for (const e of els) {
    outEls.push({ ...e, _contextTns: contextTns });

    // Also track this as a known element if it has a name
    if (e.name) {
      const elKey = `${contextTns}::${e.name}`;
      const elPrefix = nsMap[contextTns] || autoPrefix(contextTns, nsMap);
      if (!elementsMap.has(elKey)) {
        elementsMap.set(elKey, {
          tns: contextTns,
          prefix: elPrefix,
          name: e.name,
          el: e,
        });
      }
    } else if (e.ref) {
      // Track element reference
      let refTns, refName;
      if (e.ref.includes(':')) {
        const [refPrefix, local] = e.ref.split(':');
        refName = local;
        refTns = Object.entries(nsMap).find(([, v]) => v === refPrefix)?.[0];
      } else {
        refName = e.ref;
        refTns = contextTns;
      }

      if (refTns && refName) {
        const elKey = `${refTns}::${refName}`;
        const elPrefix = nsMap[refTns] || autoPrefix(refTns, nsMap);
        if (!elementsMap.has(elKey)) {
          elementsMap.set(elKey, {
            tns: refTns,
            prefix: elPrefix,
            name: refName,
            el: { name: refName, type: `CT_${refName.charAt(0).toUpperCase() + refName.slice(1)}` },
          });
        }
      }
    }
  }

  // Nested content models
  const nests = []
    .concat(arr(node['xs:sequence']), arr(node['xsd:sequence']))
    .concat(arr(node['xs:choice']), arr(node['xsd:choice']))
    .concat(arr(node['xs:all']), arr(node['xsd:all']));

  for (const n of nests) {
    expandContent(n, outEls, contextTns, depth + 1, elementsMap, nsMap, groups);
  }

  // Group references
  const gs = arr(node['xs:group']).concat(arr(node['xsd:group']));
  for (const g of gs) {
    if (g.name) {
      // Inline group definition
      const groupContent =
        g['xs:sequence'] || g['xs:choice'] || g['xs:all'] || g['xsd:sequence'] || g['xsd:choice'] || g['xsd:all'];
      if (groupContent) {
        expandContent(groupContent, outEls, contextTns, depth + 1, elementsMap, nsMap, groups);
      }
      continue;
    }

    const ref = g.ref;
    if (!ref) continue;

    let groupTns, localName;
    if (ref.includes(':')) {
      const [pfx, local] = ref.split(':');
      localName = local;
      groupTns = Object.entries(nsMap).find(([, v]) => v === pfx)?.[0];
    } else {
      localName = ref;
      groupTns = contextTns;
    }

    if (!groupTns) continue;

    const groupDef = groups.get(`${groupTns}::${localName}`);
    if (!groupDef) continue;

    const groupContent =
      groupDef['xs:sequence'] ||
      groupDef['xs:choice'] ||
      groupDef['xs:all'] ||
      groupDef['xsd:sequence'] ||
      groupDef['xsd:choice'] ||
      groupDef['xsd:all'];
    if (groupContent) {
      expandContent(groupContent, outEls, groupTns, depth + 1, elementsMap, nsMap, groups);
    }
  }
}
