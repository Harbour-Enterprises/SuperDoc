import presetDefinitionsXml from '../definitions/presetShapeDefinitions.xml?raw';
import { DRAWINGML_NS } from './constants.js';
import { convertPresetShapes } from './converter.js';
import { ensureDomParser, stripBom } from './dom.js';

const STYLE_KEYS = ['fill', 'stroke', 'strokeWidth', 'fillRule', 'clipRule'];

/**
 * @typedef {Object} PresetAdjustment
 * @property {string} name Adjustment or guide identifier.
 * @property {string} [fmla] DrawingML formula string (e.g., "val 18750").
 * @property {number} [value] Numeric value that will be converted to a "val" formula.
 */

/**
 * Adjustment or guide overrides supplied as an array of descriptors or a record keyed by adjustment name.
 * When using the record form, each value can be a number or an object containing a formula.
 *
 * @typedef {PresetAdjustment[] | Record<string, number | { fmla: string }>} PresetAdjustmentInput
 */

/**
 * @typedef {Object} PresetPathStyle
 * @property {string} [fill]
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [fillRule]
 * @property {string} [clipRule]
 */

/**
 * @typedef {Object} PresetPath
 * @property {string} d SVG path data.
 * @property {string} [fill]
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [fillRule]
 * @property {string} [clipRule]
 */

/**
 * @typedef {PresetPathStyle | PresetPathStyle[] | ((path: PresetPath, index: number) => PresetPathStyle | null | undefined)} PresetStyleOverrideInput
 */

/**
 * @typedef {PresetPathStyle | null | undefined} NormalizedPathStyle
 */

/**
 * @typedef {Object} PresetShape
 * @property {string} preset Name of the preset definition that generated this shape.
 * @property {string} name Original element localName returned by the converter.
 * @property {string} viewBox SVG viewBox string.
 * @property {PresetPath[]} paths Ordered list of SVG path descriptors.
 */

/**
 * @typedef {Object} PresetShapeOptions
 * @property {string} [preset] Name of the preset shape, e.g. "triangle".
 * @property {number} [width] Desired width fed into the converter variable map.
 * @property {number} [height] Desired height fed into the converter variable map.
 * @property {PresetAdjustmentInput} [adjustments] Overrides for <a:avLst>.
 * @property {PresetAdjustmentInput} [guides] Overrides for <a:gdLst>.
 * @property {PresetStyleOverrideInput} [styleOverrides] Optional per-path style overrides.
 * @property {Element|null} [presetGeomElement] Resolved <a:prstGeom> node from the document.
 * @property {string} [definitionXml] Custom preset definition XML to look up instead of the bundled file.
 */

let registeredXml = null;
let registeredDoc = null;
const presetCache = new Map();

/**
 * Escapes characters in text content so the output remains valid XML.
 *
 * @param {string} text Raw text content.
 * @returns {string} Escaped text content.
 */
function escapeTextContent(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Escapes characters in attribute values.
 *
 * @param {string} value Raw attribute value.
 * @returns {string} Escaped value.
 */
function escapeAttributeValue(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Serializes a DOM node into an XML string with minimal dependencies.
 *
 * @param {Node} node Node to serialize.
 * @returns {string} XML string representation.
 */
function serializeNode(node) {
  if (!node) return '';
  switch (node.nodeType) {
    case 1: {
      const element = /** @type {Element} */ (node);
      const tagName = element.tagName || element.nodeName;
      const attrPairs = [];
      if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i += 1) {
          const attr = element.attributes.item(i);
          if (!attr) continue;
          attrPairs.push(`${attr.name}="${escapeAttributeValue(attr.value)}"`);
        }
      }
      const attrString = attrPairs.length ? ` ${attrPairs.join(' ')}` : '';
      const childNodes = element.childNodes ? Array.from(element.childNodes) : [];
      if (!childNodes.length) {
        return `<${tagName}${attrString}/>`;
      }
      const childMarkup = childNodes.map((child) => serializeNode(child)).join('');
      return `<${tagName}${attrString}>${childMarkup}</${tagName}>`;
    }
    case 3:
      return escapeTextContent(node.nodeValue || '');
    case 4:
      return `<![CDATA[${node.nodeValue || ''}]]>`;
    case 8:
      return `<!--${node.nodeValue || ''}-->`;
    case 9:
      return serializeNode(/** @type {Document} */ (node).documentElement);
    default:
      return '';
  }
}

/**
 * Serializes an element, falling back to manual serialization in Node.js.
 *
 * @param {Element} element Element to serialize.
 * @returns {string} Serialized XML markup.
 */
function serializeElement(element) {
  if (!element) return '';
  if (typeof element.outerHTML === 'string') {
    return element.outerHTML;
  }
  const serializerCtor = typeof globalThis !== 'undefined' ? globalThis.XMLSerializer : undefined;
  if (typeof serializerCtor === 'function') {
    return new serializerCtor().serializeToString(element);
  }
  return serializeNode(element);
}

/**
 * Normalizes adjustment or guide override input into an array of descriptors.
 *
 * @param {PresetAdjustmentInput|null|undefined} input Raw override input.
 * @returns {PresetAdjustment[]} Normalized entries.
 */
function normalizeAdjustmentInput(input) {
  if (!input) return [];

  const normalizeEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const name = entry.name;
    if (!name) return null;
    if (typeof entry.fmla === 'string' && entry.fmla.trim() !== '') {
      return { name, fmla: entry.fmla.trim() };
    }
    if (entry.value !== undefined) {
      const numeric = Number(entry.value);
      if (Number.isFinite(numeric)) {
        return { name, value: numeric };
      }
    }
    return null;
  };

  if (Array.isArray(input)) {
    return input.map(normalizeEntry).filter(Boolean);
  }

  if (typeof input === 'object') {
    return Object.entries(input)
      .map(([name, value]) => {
        if (value && typeof value === 'object' && 'fmla' in value) {
          const formula = typeof value.fmla === 'string' ? value.fmla.trim() : '';
          return formula ? { name, fmla: formula } : null;
        }
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return { name, value: numeric };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
}

/**
 * Applies adjustment overrides by updating or creating <a:gd> nodes inside <a:avLst>.
 *
 * @param {Element} element Preset shape element.
 * @param {PresetAdjustment[]} adjustments Adjustment overrides.
 */
function applyAdjustmentOverrides(element, adjustments = []) {
  const normalized = normalizeAdjustmentInput(adjustments);
  if (!normalized.length) return;

  const doc = element.ownerDocument;
  let avList = element.getElementsByTagNameNS(DRAWINGML_NS, 'avLst')[0];
  if (!avList) {
    avList = doc.createElementNS(DRAWINGML_NS, 'avLst');
    element.insertBefore(avList, element.firstChild);
  }

  normalized.forEach(({ name, fmla, value }) => {
    if (!name) return;
    const formula = fmla || (value != null ? `val ${value}` : null);
    if (!formula) return;
    let target = null;
    const nodes = avList.getElementsByTagNameNS(DRAWINGML_NS, 'gd');
    for (const node of nodes) {
      if (node.getAttribute('name') === name) {
        target = node;
        break;
      }
    }
    if (!target) {
      target = doc.createElementNS(DRAWINGML_NS, 'gd');
      target.setAttribute('name', name);
      avList.appendChild(target);
    }
    target.setAttribute('fmla', formula);
  });
}

/**
 * Applies guide overrides by updating or creating <a:gd> nodes inside <a:gdLst>.
 *
 * @param {Element} element Preset shape element.
 * @param {PresetAdjustment[]} guides Guide overrides.
 */
function applyGuideOverrides(element, guides = []) {
  const normalized = normalizeAdjustmentInput(guides);
  if (!normalized.length) return;

  const doc = element.ownerDocument;
  let gdList = element.getElementsByTagNameNS(DRAWINGML_NS, 'gdLst')[0];
  if (!gdList) {
    gdList = doc.createElementNS(DRAWINGML_NS, 'gdLst');
    element.appendChild(gdList);
  }

  normalized.forEach(({ name, fmla, value }) => {
    if (!name) return;
    const formula = fmla || (value != null ? `val ${value}` : null);
    if (!formula) return;
    let target = null;
    const nodes = gdList.getElementsByTagNameNS(DRAWINGML_NS, 'gd');
    for (const node of nodes) {
      if (node.getAttribute('name') === name) {
        target = node;
        break;
      }
    }
    if (!target) {
      target = doc.createElementNS(DRAWINGML_NS, 'gd');
      target.setAttribute('name', name);
      gdList.appendChild(target);
    }
    target.setAttribute('fmla', formula);
  });
}

/**
 * Extracts supported style overrides from a candidate object.
 *
 * @param {Object} overrides Candidate overrides.
 * @returns {NormalizedPathStyle} Filtered overrides or null when no supported keys are present.
 */
function filterStyleOverrides(overrides) {
  if (!overrides) return null;
  const filtered = {};
  STYLE_KEYS.forEach((key) => {
    if (overrides[key] !== undefined) {
      filtered[key] = overrides[key];
    }
  });
  return Object.keys(filtered).length ? filtered : null;
}

/**
 * Applies style overrides to the converted path list.
 *
 * @param {Array<Object>} paths Converted shape paths.
 * @param {PresetStyleOverrideInput} overrides Style overrides.
 * @returns {PresetPath[]} Paths with overrides applied.
 */
function applyStyleOverrides(paths, overrides) {
  if (!overrides) return paths;

  const resolveOverrides = (index, path) => {
    if (typeof overrides === 'function') {
      return filterStyleOverrides(overrides(path, index));
    }
    if (Array.isArray(overrides)) {
      return filterStyleOverrides(overrides[index]);
    }
    return filterStyleOverrides(overrides);
  };

  return paths.map((path, index) => {
    const extras = resolveOverrides(index, path);
    if (!extras) return path;
    return { ...path, ...extras };
  });
}

/**
 * Parses a preset definitions XML string into the internal cache.
 *
 * @param {string} xml Preset definitions XML.
 */
function parseLibrary(xml) {
  const parser = ensureDomParser();
  const source = stripBom(xml);
  const doc = parser.parseFromString(source, 'application/xml');
  registeredXml = source;
  registeredDoc = doc;
  presetCache.clear();

  if (!doc || !doc.documentElement) {
    throw new Error('Invalid preset definitions XML.');
  }

  const children = Array.from(doc.documentElement.children).filter((node) => node.nodeType === 1);
  children.forEach((child) => {
    presetCache.set(child.localName, child);
  });
}

/**
 * Ensures a preset library is loaded, optionally using a provided XML string.
 *
 * @param {string} [xml] Optional XML string to register.
 */
function ensureLibrary(xml) {
  if (xml) {
    parseLibrary(xml);
    return;
  }
  if (!registeredDoc) {
    parseLibrary(presetDefinitionsXml);
  }
}

/**
 * Clones a preset definition element by name.
 *
 * @param {string} name Preset shape name.
 * @returns {Element|null} Cloned preset element.
 */
function clonePresetDefinition(name) {
  const base = presetCache.get(name);
  if (!base) return null;
  return base.cloneNode(true);
}

/**
 * Finds and clones a preset definition from a custom XML blob.
 *
 * @param {string} xml Preset definitions XML.
 * @param {string} name Preset shape name.
 * @returns {Element|null} Cloned preset element.
 */
function findPresetInXml(xml, name) {
  const parser = ensureDomParser();
  const doc = parser.parseFromString(stripBom(xml), 'application/xml');
  const children = Array.from(doc.documentElement?.children || []).filter((node) => node.nodeType === 1);
  const target = children.find((child) => child.localName === name);
  return target ? target.cloneNode(true) : null;
}

/**
 * Registers a preset definitions XML blob for subsequent lookups.
 *
 * @param {string} [xml] XML string containing the preset definitions. If omitted, the bundled defaults are used.
 */
export function setPresetDefinitionsXml(xml) {
  ensureLibrary(xml);
}

/**
 * Returns the XML string currently backing the preset library.
 *
 * @returns {string|null}
 */
export function getPresetDefinitionsXml() {
  ensureLibrary();
  return registeredXml;
}

/**
 * Lists the preset names available in the active preset library.
 *
 * @returns {string[]}
 */
export function listPresetNames() {
  ensureLibrary();
  return Array.from(presetCache.keys());
}

/**
 * Creates an SVG-ready preset shape using the packaged preset definitions.
 *
 * @param {PresetShapeOptions} [options] Shape creation options.
 * @param {string} [options.preset] Name of the preset shape (e.g., 'triangle').
 * @param {number} [options.width] Desired width for the generated viewBox.
 * @param {number} [options.height] Desired height for the generated viewBox.
 * @param {PresetAdjustmentInput} [options.adjustments] Adjustment overrides (a:avLst).
 * @param {PresetAdjustmentInput} [options.guides] Guide overrides (a:gdLst).
 * @param {PresetStyleOverrideInput} [options.styleOverrides] Optional path style overrides.
 * @param {Element|null} [options.presetGeomElement] A DOM element representing an <a:prstGeom> node with overrides.
 * @param {string} [options.definitionXml] Custom preset definitions XML to use instead of the packaged defaults.
 * @returns {PresetShape|null} Shape description compatible with the editor renderer.
 */
export function createPresetShape(options = /** @type {PresetShapeOptions} */ ({})) {
  const { preset, width, height, adjustments, guides, styleOverrides, presetGeomElement, definitionXml } = options;

  const targetPreset = preset || presetGeomElement?.getAttribute?.('prst');
  if (!targetPreset) {
    throw new Error('createPresetShape requires a preset name or presetGeomElement with a prst attribute.');
  }

  let shapeElement = null;
  if (definitionXml) {
    shapeElement = findPresetInXml(definitionXml, targetPreset);
  } else {
    ensureLibrary();
    shapeElement = clonePresetDefinition(targetPreset);
  }

  if (!shapeElement) {
    return null;
  }

  let presetAdjustments = [];
  let presetGuides = [];
  if (presetGeomElement && typeof presetGeomElement.getElementsByTagNameNS === 'function') {
    const overridesAv = presetGeomElement.getElementsByTagNameNS(DRAWINGML_NS, 'avLst');
    const overridesGd = presetGeomElement.getElementsByTagNameNS(DRAWINGML_NS, 'gdLst');

    if (overridesAv?.length) {
      const avChildren = overridesAv[0] ? Array.from(overridesAv[0].getElementsByTagNameNS(DRAWINGML_NS, 'gd')) : [];
      presetAdjustments = avChildren.map((node) => ({
        name: node.getAttribute('name'),
        fmla: node.getAttribute('fmla'),
      }));
    }
    if (overridesGd?.length) {
      const gdChildren = overridesGd[0] ? Array.from(overridesGd[0].getElementsByTagNameNS(DRAWINGML_NS, 'gd')) : [];
      presetGuides = gdChildren.map((node) => ({
        name: node.getAttribute('name'),
        fmla: node.getAttribute('fmla'),
      }));
    }
  }

  if (presetAdjustments.length) {
    applyAdjustmentOverrides(shapeElement, presetAdjustments);
  }

  if (adjustments) {
    applyAdjustmentOverrides(shapeElement, adjustments);
  }

  if (presetGuides.length) {
    applyGuideOverrides(shapeElement, presetGuides);
  }

  if (guides) {
    applyGuideOverrides(shapeElement, guides);
  }

  const container = `<presetRoot xmlns:a="${DRAWINGML_NS}">${serializeElement(shapeElement)}</presetRoot>`;
  const [shape] = convertPresetShapes(container, { width, height });
  if (!shape) return null;

  const mergedPaths = applyStyleOverrides(shape.paths, styleOverrides);

  return {
    ...shape,
    preset: targetPreset,
    paths: mergedPaths,
  };
}
