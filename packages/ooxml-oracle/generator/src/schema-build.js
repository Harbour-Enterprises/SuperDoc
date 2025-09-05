import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NS_MAP, PASS_THROUGH } from './constants.js';
import { arr, qn, parser, inlineCT, contentRoot } from './builder/index.js';
import { expandContent, resolveType, collectElements, autoPrefix, resolveChildQName } from './builder/index.js';

/**
 * Build a schema from a directory of XSD files.
 * @param {string} xsdDir - Directory containing .xsd files
 * @returns {import('./types/index.js').BuiltSchema} - Array of parsed XML schemas
 */
export function buildFromXsdDir(xsdDir) {
  const schemas = [];
  for (const f of readdirSync(xsdDir))
    if (f.endsWith('.xsd')) {
      const xml = readFileSync(join(xsdDir, f), 'utf8');
      const doc = parser.parse(xml);
      const schema = doc['xs:schema'] || doc['xsd:schema'] || doc['schema'];
      if (schema) {
        schema._filename = f; // for debugging
        schemas.push(schema);
      }
    }

  console.log(`Loaded ${schemas.length} XSD files`);

  /** @type {Record<string, string>} */
  const nsMap = NS_MAP;

  // First, collect all namespace mappings from import statements
  for (const s of schemas) {
    // Check for xs:import or xsd:import elements which define namespace mappings
    const imports = arr(s['xs:import']).concat(arr(s['xsd:import']));
    for (const imp of imports) {
      if (imp.namespace && !nsMap[imp.namespace]) {
        // Auto-assign prefix if we don't have one
        const prefix = 'g' + Object.keys(nsMap).length;
        nsMap[imp.namespace] = prefix;
      }
    }
  }

  const complexTypes = new Map(); // `${tns}::${name}` -> complexType
  const simpleTypes = new Map(); // `${tns}::${name}` -> simpleType (for tracking)
  const groups = new Map(); // `${tns}::${name}` -> group
  const attributeGroups = new Map(); // `${tns}::${name}` -> attributeGroup
  const elements = new Map(); // `${tns}::${name}` -> { tns,prefix,name,el }
  const elementRefs = new Map(); // Track element references to resolve later

  // First pass: collect all types, groups, and top-level elements
  for (const s of schemas) {
    const tns = s.targetNamespace;
    const prefix = autoPrefix(tns, nsMap);

    // Collect complex types and their nested elements
    for (const ct of arr(s['xs:complexType']).concat(arr(s['xsd:complexType']))) {
      if (ct.name) {
        complexTypes.set(`${tns}::${ct.name}`, ct);
        // Also collect any elements defined within this complex type
        collectElements(ct, tns, prefix, elements, elementRefs);
      }
    }

    // Collect simple types (for tracking, not for resolution)
    for (const st of arr(s['xs:simpleType']).concat(arr(s['xsd:simpleType']))) {
      if (st.name) {
        simpleTypes.set(`${tns}::${st.name}`, st);
      }
    }

    // Collect groups and their nested elements
    for (const g of arr(s['xs:group']).concat(arr(s['xsd:group']))) {
      if (g.name) {
        groups.set(`${tns}::${g.name}`, g);
        // Also collect any elements defined within this group
        collectElements(g, tns, prefix, elements, elementRefs);
      }
    }

    // Collect attribute groups
    for (const ag of arr(s['xs:attributeGroup']).concat(arr(s['xsd:attributeGroup']))) {
      if (ag.name) {
        attributeGroups.set(`${tns}::${ag.name}`, ag);
      }
    }

    // Collect top-level elements
    for (const el of arr(s['xs:element']).concat(arr(s['xsd:element']))) {
      if (el.name) {
        const key = `${tns}::${el.name}`;
        if (!elements.has(key)) {
          elements.set(key, { tns, prefix, name: el.name, el });
        }
      }
    }
  }

  // Resolve element references
  for (const [ref, { tns }] of elementRefs) {
    let targetTns, localName;
    if (ref.includes(':')) {
      const [refPrefix, local] = ref.split(':');
      localName = local;
      targetTns = Object.entries(nsMap).find(([, v]) => v === refPrefix)?.[0];
    } else {
      localName = ref;
      targetTns = tns;
    }

    if (targetTns && localName) {
      const key = `${targetTns}::${localName}`;
      if (!elements.has(key)) {
        const targetPrefix = nsMap[targetTns] || autoPrefix(targetTns, nsMap);
        // Create a synthetic element entry for the reference
        elements.set(key, {
          tns: targetTns,
          prefix: targetPrefix,
          name: localName,
          el: { name: localName, type: `${targetPrefix}:${localName}Type` },
        });
      }
    }
  }

  // Second pass: Check for complex types that imply elements (CT_ElementName pattern)
  for (const [key] of complexTypes) {
    const [tns, typeName] = key.split('::');

    // Common OOXML pattern: CT_P type implies a 'p' element
    if (typeName.startsWith('CT_')) {
      const elementName = typeName.substring(3);
      const elementKey = `${tns}::${elementName}`;

      if (!elements.has(elementKey)) {
        const prefix = nsMap[tns] || autoPrefix(tns, nsMap);
        // Check if this looks like a real element name (starts with uppercase or is short)
        if (elementName.length <= 10 && /^[A-Z]/.test(elementName)) {
          const lowerName = elementName.charAt(0).toLowerCase() + elementName.slice(1);
          const lowerKey = `${tns}::${lowerName}`;

          if (!elements.has(lowerKey)) {
            // Create synthetic element for this complex type
            elements.set(lowerKey, {
              tns,
              prefix,
              name: lowerName,
              el: { name: lowerName, type: typeName },
            });
          }
        }
      }
    }
  }

  console.log(
    `Found ${complexTypes.size} complex types, ${simpleTypes.size} simple types, ${groups.size} groups, ${attributeGroups.size} attribute groups, ${elements.size} elements`,
  );

  // Debug: show some key elements we expect to find
  const expectedElements = ['w:document', 'w:body', 'w:p', 'w:r', 'w:t', 'w:tbl'];
  const foundExpected = expectedElements.filter((qname) => {
    const [prefix, local] = qname.split(':');
    const tns = Object.entries(nsMap).find(([, v]) => v === prefix)?.[0];
    return tns && elements.has(`${tns}::${local}`);
  });
  if (foundExpected.length > 0) {
    console.log(`Found expected elements: ${foundExpected.join(', ')}`);
  }

  // Helper function to extract attributes from a node
  function extractDirectAttributes(node, attributes, tns) {
    // Direct attributes
    for (const attr of arr(node['xs:attribute']).concat(arr(node['xsd:attribute']))) {
      const name = attr.name;
      const ref = attr.ref;

      if (name) {
        const attrName = name.includes(':') ? name : `${nsMap[tns]}:${name}`;
        attributes[attrName] = {
          type: attr.type || 'xs:string',
          use: attr.use || 'optional',
          default: attr.default,
          fixed: attr.fixed,
        };
      } else if (ref) {
        // Resolve attribute reference
        const [refPrefix, refLocal] = ref.includes(':') ? ref.split(':') : [nsMap[tns], ref];
        const attrName = `${refPrefix}:${refLocal}`;
        attributes[attrName] = {
          type: 'referenced',
          ref: ref,
          use: attr.use || 'optional',
        };
      }
    }

    // Attribute groups
    for (const attrGroup of arr(node['xs:attributeGroup']).concat(arr(node['xsd:attributeGroup']))) {
      if (attrGroup.ref) {
        // Resolve attribute group
        let groupTns, groupName;
        if (attrGroup.ref.includes(':')) {
          const [prefix, local] = attrGroup.ref.split(':');
          groupName = local;
          groupTns = Object.entries(nsMap).find(([, v]) => v === prefix)?.[0];
        } else {
          groupName = attrGroup.ref;
          groupTns = tns;
        }

        if (groupTns) {
          const group = attributeGroups.get(`${groupTns}::${groupName}`);
          if (group) {
            // Recursively extract attributes from the group
            extractDirectAttributes(group, attributes, groupTns);
          }
        }
      }
    }

    // anyAttribute allows any attributes
    if (node['xs:anyAttribute'] || node['xsd:anyAttribute']) {
      attributes['@anyAttribute'] = true;
    }
  }

  // Helper function to extract all attributes including inherited
  function extractAttributesComplete(ct, tns) {
    const attributes = {};

    if (!ct) return attributes;

    // Handle inheritance first
    const complexContent = ct['xs:complexContent'] || ct['xsd:complexContent'];
    if (complexContent) {
      const extension = complexContent['xs:extension'] || complexContent['xsd:extension'];
      const restriction = complexContent['xs:restriction'] || complexContent['xsd:restriction'];

      const base = extension?.base || restriction?.base;
      if (base) {
        // Resolve base type and get its attributes
        const baseType = resolveType(base, tns, nsMap, complexTypes, simpleTypes);
        if (baseType) {
          const baseAttrs = extractAttributesComplete(baseType, tns);
          Object.assign(attributes, baseAttrs);
        }
      }

      // Process extension/restriction's own attributes
      const content = extension || restriction;
      if (content) {
        extractDirectAttributes(content, attributes, tns);
      }
    }

    // Simple content (often has attributes)
    const simpleContent = ct['xs:simpleContent'] || ct['xsd:simpleContent'];
    if (simpleContent) {
      const extension = simpleContent['xs:extension'] || simpleContent['xsd:extension'];
      const restriction = simpleContent['xs:restriction'] || simpleContent['xsd:restriction'];
      const content = extension || restriction;
      if (content) {
        extractDirectAttributes(content, attributes, tns);
      }
    }

    // Direct attributes on the complex type
    extractDirectAttributes(ct, attributes, tns);

    return attributes;
  }

  /** @type {Record<string, {children: string[], attributes: Record<string, any>}>} */
  const map = {}; // QName -> {children: [], attributes: {}}
  let processedCount = 0;
  let debugElements = ['w:p', 'w:r', 'w:pPr', 'w:rPr', 'w:tbl', 'w:document', 'w:body'];

  // Also check for elements that appear as references but aren't defined
  const referencedElements = new Set();

  for (const { tns, prefix, name, el } of elements.values()) {
    const qname = qn(prefix, name);
    const ct = inlineCT(el) || resolveType(el.type, tns, nsMap, complexTypes, simpleTypes);
    const childrenSet = new Set();
    let attributes = {};

    if (debugElements.includes(qname)) {
      console.log(`\n=== Processing ${qname} ===`);
      console.log(`Element type: ${el.type || 'inline'}`);
      console.log(`Has inline complexType: ${!!inlineCT(el)}`);
      console.log(`Resolved complexType: ${!!ct}`);
    }

    if (ct) {
      // Extract attributes
      attributes = extractAttributesComplete(ct, tns);

      const root = contentRoot(ct);
      if (debugElements.includes(qname)) {
        console.log(`Content root: ${!!root}`);
        console.log(`Attributes found: ${Object.keys(attributes).length}`);
      }

      if (root) {
        const parts = [];
        expandContent(root, parts, tns, 0, elements, nsMap, groups);

        if (debugElements.includes(qname)) {
          console.log(`Found ${parts.length} child elements in content model`);
        }

        for (const e of parts) {
          const childQName = resolveChildQName(e, tns, nsMap);
          if (childQName) {
            childrenSet.add(childQName);
            referencedElements.add(childQName); // Track that this element is referenced
            if (debugElements.includes(qname)) {
              console.log(`  Child: ${childQName} (from ${e.name || e.ref})`);
            }
          }
        }
      }
    } else if (debugElements.includes(qname)) {
      console.log(`No complex type found for ${qname}`);
    }

    // Add pass-through elements for content containers
    if (childrenSet.size > 0 || ['w:p', 'w:tc', 'w:body', 'w:document'].includes(qname)) {
      for (const pt of PASS_THROUGH) {
        childrenSet.add(pt);
      }
    }

    // Store both children and attributes
    map[qname] = {
      children: Array.from(childrenSet).sort(),
      attributes: attributes,
    };

    if (map[qname].children.length > 0) {
      processedCount++;
    }

    // Show final result for debug elements
    if (debugElements.includes(qname)) {
      console.log(`Final children for ${qname}: [${map[qname].children.join(', ')}]`);
      if (Object.keys(attributes).length > 0) {
        console.log(`Attributes for ${qname}: ${Object.keys(attributes).join(', ')}`);
      }
    }
  }

  // Add entries for referenced elements that weren't defined
  for (const refQName of referencedElements) {
    if (!map[refQName]) {
      // This element was referenced but not defined - add empty entry
      map[refQName] = {
        children: [],
        attributes: {},
      };

      // Also add pass-through elements for known containers
      if (['w:p', 'w:tc', 'w:body'].includes(refQName)) {
        map[refQName].children = Array.from(PASS_THROUGH).sort();
      }
    }
  }

  console.log(`Generated schema with ${processedCount} elements having children`);
  console.log(`Total elements in schema: ${Object.keys(map).length}`);

  return { namespaces: nsMap, elements: map };
}
