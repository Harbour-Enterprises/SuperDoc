/**
 * Creates a validator for Word document relationships (word/_rels/document.xml.rels)
 *
 * This validator ensures the relationships file is properly structured and contains
 * valid relationship entries that reference existing files and follow Word's conventions.
 *
 * @typedef {import('../../../types.js').Editor} Editor
 * @typedef {import('../../../types.js').ValidatorLogger} ValidatorLogger
 * @param {Object} params - Validator parameters
 * @param {Editor} params.editor - The editor instance containing the document
 * @param {ValidatorLogger} params.logger - Logger for validation messages
 * @returns {Function} Validator function that returns {results: string[], modified: boolean}
 */
export function createRelationshipsValidator({ editor, logger }) {
  return () => {
    const results = [];
    let modified = false;

    // Get the converted XML structure from the editor's converter
    // Normalizes relationships file location to canonical path
    const convertedXml = editor?.converter?.convertedXml;
    if (!convertedXml || typeof convertedXml !== 'object') {
      return { results, modified };
    }
    const candidateKeys = [
      'word/_rels/document.xml.rels',
      'word/document.xml.rels',
      '_rels/document.xml.rels',
      'document.xml.rels',
    ];

    // Find the first existing relationships file
    let relsKey = candidateKeys.find((k) => convertedXml?.[k]?.elements);
    if (!relsKey) {
      return { results, modified };
    }

    // Normalize the relationships file to the canonical location
    const canonicalKey = 'word/_rels/document.xml.rels';
    if (relsKey !== canonicalKey) {
      convertedXml[canonicalKey] = convertedXml[relsKey];
      delete convertedXml[relsKey];
      results.push(`Normalized relationships location to ${canonicalKey} (was ${relsKey})`);
      relsKey = canonicalKey;
      modified = true;
    }

    const relsTree = convertedXml[relsKey];
    let root = relsTree?.elements?.[0];

    // Validates XML structure and namespace
    if (!root || root.type !== 'element') {
      results.push(`${relsKey} is not a valid xml`);
      return { results, modified };
    }

    const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
    if (root.name !== 'Relationships') {
      root.name = 'Relationships';
      results.push(`Fixed relationships root element name to "Relationships"`);
      modified = true;
    }
    root.attributes = root.attributes || {};
    if (root.attributes.xmlns !== RELS_NS) {
      root.attributes.xmlns = RELS_NS;
      results.push(`Set relationships xmlns to ${RELS_NS}`);
      modified = true;
    }

    // Clean up the root element's children to ensure only valid Relationship elements
    const nextChildren = [];
    for (const child of Array.isArray(root.elements) ? root.elements : []) {
      if (!child || child.type !== 'element') {
        modified = true;
        continue;
      }
      if (child.name !== 'Relationship') {
        modified = true;
        continue;
      }
      nextChildren.push(child);
    }
    if (root.elements !== nextChildren) {
      root.elements = nextChildren;
    }

    // extract numeric ID from relationship ID (e.g., "rId5" -> 5)
    const ridNum = (id) => {
      const m = /^rId(\d+)$/.exec(String(id || ''));
      return m ? parseInt(m[1], 10) : null;
    };

    // identify relationship types
    const isType = (type, tail) => typeof type === 'string' && new RegExp(`/relationships/${tail}$`, 'i').test(type);
    const isHyperlinkType = (type) => isType(type, 'hyperlink');
    const isImageType = (type) => isType(type, 'image');

    // determine if a target URL is external (HTTP/HTTPS or mailto)
    const looksExternal = (target) => /^https?:\/\//i.test(target || '') || /^mailto:/i.test(target || '');

    //  Ensures relationship IDs are unique and properly formatted
    const usedIds = new Set();
    let maxRid = 0;
    for (const el of root.elements) {
      el.attributes = el.attributes || {};
      const id = el.attributes.Id;
      const n = ridNum(id);
      if (Number.isInteger(n)) maxRid = Math.max(maxRid, n);
      if (typeof id === 'string' && id) {
        usedIds.add(id);
      }
    }

    let ridCounter = maxRid;
    const allocateId = (preferred) => {
      if (preferred && !usedIds.has(preferred)) {
        usedIds.add(preferred);
        return preferred;
      }
      let newId;
      do {
        ridCounter += 1;
        newId = `rId${ridCounter}`;
      } while (usedIds.has(newId));
      usedIds.add(newId);
      return newId;
    };

    const binMediaTargets = new Set();
    const seenIds = new Set();
    const filtered = [];

    // Validates relationship types and targets
    for (const rel of root.elements) {
      rel.attributes = rel.attributes || {};
      const attrs = rel.attributes;

      let id = typeof attrs.Id === 'string' ? attrs.Id.trim() : '';
      const type = typeof attrs.Type === 'string' ? attrs.Type.trim() : '';
      let target = typeof attrs.Target === 'string' ? attrs.Target.trim() : '';
      let targetMode = typeof attrs.TargetMode === 'string' ? attrs.TargetMode.trim() : '';

      if (!target) {
        modified = true;
        results.push(`Removed relationship "${id}" without Target`);
        continue;
      }

      // Fix hyperlink TargetMode for external URLs
      if (isHyperlinkType(type) && looksExternal(target) && targetMode.toLowerCase() !== 'external') {
        attrs.TargetMode = 'External';
        targetMode = 'External';
        results.push(`Set TargetMode="External" for hyperlink ${id}`);
        modified = true;
      }

      // Handle image relationships - collect .bin media files for Content_Types.xml
      if (isImageType(type)) {
        const relPath = `word/${target.replace(/^\.?\//, '')}`;
        if (/^media\/.+\.bin$/i.test(target) && relPath in convertedXml) {
          binMediaTargets.add(`/${relPath}`);
        }
      }

      // Validate internal target files exist
      if (targetMode.toLowerCase() !== 'external' && !looksExternal(target)) {
        const likelyPath = `word/${target.replace(/^\.?\//, '')}`;
        if (!(likelyPath in convertedXml)) {
          if (!isImageType(type)) {
            modified = true;
            results.push(`Removed relationship ${id} with missing target: ${target}`);
            continue;
          } else {
            results.push(`Warning: image relationship ${id} target not found: ${target}.`);
          }
        }
      }

      // Assign missing IDs
      if (!id) {
        const newId = allocateId(null);
        attrs.Id = newId;
        results.push(`Assigned missing Id "${newId}"`);
        modified = true;
        id = newId;
      }

      // Check for duplicate relationship IDs (only within this processing loop)
      if (seenIds.has(id)) {
        modified = true;
        results.push(`Removed duplicate relationship with ID "${id}"`);
        continue;
      }
      seenIds.add(id);
      filtered.push(rel);
    }

    if (root.elements !== filtered) {
      root.elements = filtered;
    }

    const filteredIds = new Set();
    for (const rel of root.elements) {
      const id = rel.attributes?.Id;
      if (typeof id === 'string' && id) {
        filteredIds.add(id);
      }
    }

    // Process document.xml to fix missing relationship references
    const documentPath = 'word/document.xml';
    const document = convertedXml[documentPath];

    if (document && document.elements?.length) {
      const documentRoot = document.elements[0];
      if (documentRoot && documentRoot.type === 'element') {
        const missingRefs = [];
        processDocumentForMissingRefs(documentRoot, filteredIds, missingRefs);

        if (missingRefs.length) {
          modified = true;
          results.push(`Fixed ${missingRefs.length} missing relationship references`);
          logger?.debug?.(`Fixed ${missingRefs.length} missing relationship references in document`);
        }
      }
    }

    // fix [Content_Types].xml for media .bin entries so Word recognizes them as images.
    const contentTypesKey = '[Content_Types].xml';
    const contentTypesXml = convertedXml[contentTypesKey];

    // ensure a Default entry exists for a file extension
    const ensureDefault = (xmlString, ext, contentType) => {
      const defRe = new RegExp(`<Default\\s+Extension="${ext}"\\b`, 'i');
      if (defRe.test(xmlString)) return xmlString;
      const opening = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
      return xmlString.replace(opening, `${opening}<Default Extension="${ext}" ContentType="${contentType}"/>`);
    };

    // ensure an Override entry exists for a specific file
    const ensureOverride = (xmlString, partName, contentType) => {
      const esc = partName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const ovRe = new RegExp(`<Override\\s+PartName="${esc}"\\b`, 'i');
      if (ovRe.test(xmlString)) return xmlString;
      const opening = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
      return xmlString.replace(opening, `${opening}<Override PartName="${partName}" ContentType="${contentType}" />`);
    };

    if (typeof contentTypesXml === 'string') {
      let updated = contentTypesXml;
      // even if binMediaTargets is empty (no media files), the document still needs
      // these basic content type defaults to function properly in Word.
      updated = ensureDefault(updated, 'rels', 'application/vnd.openxmlformats-package.relationships+xml');
      updated = ensureDefault(updated, 'xml', 'application/xml');
      for (const partName of binMediaTargets) {
        updated = ensureOverride(updated, partName, 'image/png');
        results.push(`Added Content Types Override for "${partName}" as image/png`);
        modified = true;
      }
      if (updated !== contentTypesXml) {
        convertedXml[contentTypesKey] = updated;
      }
    } else if (contentTypesXml?.elements?.length) {
      const typesRoot = contentTypesXml.elements.find((el) => el.name === 'Types') || contentTypesXml.elements[0];
      typesRoot.elements = typesRoot.elements || [];
      const hasDefault = (ext) =>
        typesRoot.elements.some((el) => el.name === 'Default' && el.attributes?.Extension === ext);
      const addDefault = (ext, ct) => {
        typesRoot.elements.unshift({
          type: 'element',
          name: 'Default',
          attributes: { Extension: ext, ContentType: ct },
        });
      };
      const hasOverride = (part) =>
        typesRoot.elements.some((el) => el.name === 'Override' && el.attributes?.PartName === part);
      const addOverride = (part, ct) => {
        typesRoot.elements.unshift({
          type: 'element',
          name: 'Override',
          attributes: { PartName: part, ContentType: ct },
        });
      };
      // even if binMediaTargets is empty (no media files), the document still needs
      // these basic content type defaults to function properly in Word.
      if (!hasDefault('rels')) addDefault('rels', 'application/vnd.openxmlformats-package.relationships+xml');
      if (!hasDefault('xml')) addDefault('xml', 'application/xml');
      let added = 0;
      for (const partName of binMediaTargets) {
        if (!hasOverride(partName)) {
          addOverride(partName, 'image/png');
          results.push(`Added Content Types Override for "${partName}" as image/png`);
          added += 1;
        }
      }
      if (added > 0) modified = true;
    } else {
      results.push('[Content_Types].xml not found or not parseable. Skipped content types patch.');
    }
    return { results, modified };
  };
}

/**
 * Recursively processes document.xml to find and fix missing relationship references.
 *
 * @param {any} node - XML node to process (can be element, text, etc.)
 * @param {Set<string>} usedIds - Set of valid relationship IDs from the relationships file
 * @param {string[]} fixed - Array to collect descriptions of fixes made
 */
function processDocumentForMissingRefs(node, usedIds, fixed) {
  if (!node?.elements?.length) return;

  for (const element of node.elements) {
    if (element?.type !== 'element') continue;

    const rIdValue = element.attributes?.['r:id'];
    if (typeof rIdValue === 'string' && !usedIds.has(rIdValue)) {
      delete element.attributes['r:id'];
      fixed.push(`Removed invalid r:id="${rIdValue}"`);
    }

    processDocumentForMissingRefs(element, usedIds, fixed);
  }
}
