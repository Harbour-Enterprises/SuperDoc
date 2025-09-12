// @ts-check
import { NodeTranslator } from '@translator';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:trPr';

/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_ATTR_KEY = 'tableRowProperties';

/**
 * Encode the w:rPr element.
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params) => {
  const { nodes } = params;
  const node = nodes[0];
  const attributes = {
    cantSplit: false,
    hidden: false,
    repeatHeader: false,
  };

  // Index property translators by their XML names for quick lookup
  const propertyTranslatorsByXmlName = {};
  propertyTranslators.forEach((translator) => {
    propertyTranslatorsByXmlName[translator.xmlName] = translator;
  });

  // Process property translators
  node.elements.forEach((el) => {
    const translator = propertyTranslatorsByXmlName[el.name];
    if (translator) {
      const encodedAttr = translator.encode({ ...el.attributes, nodes: [el] });
      if (encodedAttr !== undefined && encodedAttr !== null) {
        attributes[translator.sdNodeOrKeyName] = encodedAttr;
      }
    }
  });

  return {
    type: NodeTranslator.translatorTypes.ATTRIBUTE,
    xmlName: XML_NODE_NAME,
    sdNodeOrKeyName: SD_ATTR_KEY,
    attributes,
  };
};

/**
 * Decode the tableRowProperties in the tableRow node back into OOXML <w:trPr>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { tableRowProperties = {} } = params.node.attrs || {};
  const elements = [];

  // Index property translators by their SuperDoc key names for quick lookup
  const propertyTranslatorsBySdName = {};
  propertyTranslators.forEach((translator) => {
    propertyTranslatorsBySdName[translator.sdNodeOrKeyName] = translator;
  });

  // Process property translators
  Object.entries(tableRowProperties).forEach(([key, value]) => {
    const translator = propertyTranslatorsBySdName[key];
    if (translator) {
      const attributes = translator.decode({ [key]: value });
      if (attributes) {
        if (typeof attributes === 'object') {
          elements.push({ name: translator.xmlName, attributes });
        } else if (typeof attributes === 'boolean') {
          elements.push({ name: translator.xmlName, attributes: {} });
        }
      }
    }
  });

  const newNode = {
    name: 'w:trPr',
    type: 'element',
    attributes: {},
    elements: elements,
  };

  return newNode;
};

/**
 * Helper to create simple attribute handlers with one-to-one mapping.
 * @param {string} xmlName The XML attribute name (with namespace).
 * @param {string|null} sdName The SuperDoc attribute name (without namespace). If null, it will be derived from xmlName.
 * @returns {import('@translator').AttrConfig} The attribute handler config with xmlName, sdName, encode, and decode functions.
 */
const _createAttributeHandler = (xmlName, sdName = null) => {
  if (!sdName) sdName = xmlName.split(':')[1];
  return {
    xmlName,
    sdName,
    encode: (attributes) => attributes[xmlName],
    decode: (attributes) => attributes[sdName],
  };
};

// Property translators for w:trPr child elements
// Each translator handles a specific property of the table row
/** @type {import('@translator').NodeTranslatorConfig[]} */
const propertyTranslators = [
  // ECMA page 377
  {
    xmlName: 'w:cantSplit',
    sdNodeOrKeyName: 'cantSplit',
    encode: (attributes) => ['1', 'true'].includes(attributes['w:val'] ?? '1'),
    decode: (attrs) => attrs?.cantSplit,
  },
  // ECMA page 379
  {
    xmlName: 'w:cnfStyle',
    sdNodeOrKeyName: 'cnfStyle',
    attributes: [
      'w:evenHBand',
      'w:evenVBand',
      'w:firstColumn',
      'w:firstRow',
      'w:firstRowFirstColumn',
      'w:firstRowLastColumn',
      'w:lastColumn',
      'w:lastRow',
      'w:lastRowFirstColumn',
      'w:lastRowLastColumn',
      'w:oddHBand',
      'w:oddVBand',
      'w:val',
    ].map((attr) => _createAttributeHandler(attr)),
    encode: (_, encodedAttrs) => {
      // Convert '1'/'0' and 'true'/'false' to boolean
      Object.keys(encodedAttrs).forEach((key) => {
        encodedAttrs[key] = ['1', 'true'].includes(encodedAttrs[key]);
      });
      return Object.keys(encodedAttrs).length > 0 ? encodedAttrs : undefined;
    },
    decode: (attrs) => {
      if (!attrs?.cnfStyle) return;
      const cnfStyleAttrs = {};
      Object.entries(attrs.cnfStyle).forEach(([key, value]) => {
        cnfStyleAttrs[`w:${key}`] = value ? '1' : '0';
      });
      return Object.keys(cnfStyleAttrs).length > 0 ? cnfStyleAttrs : undefined;
    },
  },
  // ECMA page 391
  {
    xmlName: 'w:divId',
    sdNodeOrKeyName: 'divId',
    encode: (attributes) => attributes['w:val'] || undefined,
    decode: (attrs) => (attrs?.divId ? { 'w:val': attrs.divId } : undefined),
  },
  // ECMA page 395
  {
    xmlName: 'w:gridAfter',
    sdNodeOrKeyName: 'gridAfter',
    encode: (attributes) => {
      const val = attributes['w:val'];
      return val ? parseInt(val, 10) : undefined;
    },
    decode: (attrs) =>
      typeof attrs?.gridAfter === 'number' && !isNaN(attrs.gridAfter)
        ? { 'w:val': String(attrs.gridAfter) }
        : undefined,
  },
  // ECMA page 396
  {
    xmlName: 'w:gridBefore',
    sdNodeOrKeyName: 'gridBefore',
    encode: (attributes) => {
      const val = attributes['w:val'];
      return val ? parseInt(val, 10) : undefined;
    },
    decode: (attrs) =>
      typeof attrs?.gridBefore === 'number' && !isNaN(attrs.gridBefore)
        ? { 'w:val': String(attrs.gridBefore) }
        : undefined,
  },
  // ECMA page 405
  {
    xmlName: 'w:hidden',
    sdNodeOrKeyName: 'hidden',
    encode: (attributes) => ['1', 'true'].includes(attributes['w:val'] ?? '1'),
    decode: (attrs) => attrs?.hidden,
  },
  // ECMA page 411
  {
    xmlName: 'w:jc',
    sdNodeOrKeyName: 'jc',
    encode: (attributes) => attributes['w:val'] || undefined,
    decode: (attrs) => (attrs?.jc ? { 'w:val': attrs.jc } : undefined),
  },
  // ECMA page 427
  {
    xmlName: 'w:tblCellSpacing',
    sdNodeOrKeyName: 'tblCellSpacing',
    attributes: [_createAttributeHandler('w:w', 'value'), _createAttributeHandler('w:type')],
    encode: (_, encodedAttrs) => {
      if (typeof encodedAttrs.value === 'string') {
        encodedAttrs.value = parseInt(encodedAttrs.value, 10);
      }
      return Object.keys(encodedAttrs).length > 0 ? encodedAttrs : undefined;
    },
    decode: (attrs) => {
      if (!attrs?.tblCellSpacing) return;
      const spacingAttrs = {};
      if (typeof attrs.tblCellSpacing.value === 'number' && !isNaN(attrs.tblCellSpacing.value)) {
        spacingAttrs['w:w'] = String(attrs.tblCellSpacing.value);
      }
      if (attrs.tblCellSpacing.type) {
        spacingAttrs['w:type'] = attrs.tblCellSpacing.type;
      }
      return Object.keys(spacingAttrs).length > 0 ? spacingAttrs : undefined;
    },
  },
  // ECMA page 433
  {
    xmlName: 'w:tblHeader',
    sdNodeOrKeyName: 'repeatHeader',
    encode: (attributes) => ['1', 'true'].includes(attributes['w:val'] ?? '1'),
    decode: (attrs) => attrs?.repeatHeader,
  },
  // ECMA page 474
  {
    xmlName: 'w:trHeight',
    sdNodeOrKeyName: 'rowHeight',
    encode: (attributes) => {
      const heightAttrs = {};
      const val = attributes['w:val'];
      if (val) {
        heightAttrs['value'] = parseInt(val, 10);
      }
      const rule = attributes['w:hRule'];
      if (rule) {
        heightAttrs['rule'] = rule;
      }
      return Object.keys(heightAttrs).length > 0 ? heightAttrs : undefined;
    },
    decode: (attrs) => {
      if (!attrs?.rowHeight) return;
      const heightAttrs = {};
      if (typeof attrs.rowHeight.value === 'number' && !isNaN(attrs.rowHeight.value)) {
        heightAttrs['w:val'] = String(attrs.rowHeight.value);
      }
      if (attrs.rowHeight.rule) {
        heightAttrs['w:hRule'] = attrs.rowHeight.rule;
      }
      return Object.keys(heightAttrs).length > 0 ? heightAttrs : undefined;
    },
  },
  // ECMA page 481
  {
    xmlName: 'w:wAfter',
    sdNodeOrKeyName: 'wAfter',
    encode: (attributes) => {
      const wAfterAttrs = {};
      const val = attributes['w:w'];
      if (val) {
        wAfterAttrs['value'] = parseInt(val, 10);
      }
      const type = attributes['w:type'];
      if (type) {
        wAfterAttrs['type'] = type;
      }
      return Object.keys(wAfterAttrs).length > 0 ? wAfterAttrs : undefined;
    },
    decode: (attrs) => {
      if (!attrs?.wAfter) return;
      const wAfterAttrs = {};
      if (typeof attrs.wAfter.value === 'number' && !isNaN(attrs.wAfter.value)) {
        wAfterAttrs['w:w'] = String(attrs.wAfter.value);
      }
      if (attrs.wAfter.type) {
        wAfterAttrs['w:type'] = attrs.wAfter.type;
      }
      return Object.keys(wAfterAttrs).length > 0 ? wAfterAttrs : undefined;
    },
  },
  // ECMA page 482
  {
    xmlName: 'w:wBefore',
    sdNodeOrKeyName: 'wBefore',
    encode: (attributes) => {
      const wBeforeAttrs = {};
      const val = attributes['w:w'];
      if (val) {
        wBeforeAttrs['value'] = parseInt(val, 10);
      }
      const type = attributes['w:type'];
      if (type) {
        wBeforeAttrs['type'] = type;
      }
      return Object.keys(wBeforeAttrs).length > 0 ? wBeforeAttrs : undefined;
    },
    decode: (attrs) => {
      if (!attrs?.wBefore) return;
      const wBeforeAttrs = {};
      if (typeof attrs.wBefore.value === 'number' && !isNaN(attrs.wBefore.value)) {
        wBeforeAttrs['w:w'] = String(attrs.wBefore.value);
      }
      if (attrs.wBefore.type) {
        wBeforeAttrs['w:type'] = attrs.wBefore.type;
      }
      return Object.keys(wBeforeAttrs).length > 0 ? wBeforeAttrs : undefined;
    },
  },
].map(NodeTranslator.from);

/** @type {import('@translator').NodeTranslatorConfig} */
const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_ATTR_KEY,
  type: NodeTranslator.translatorTypes.ATTRIBUTE,
  encode,
  decode,
};

/**
 * The NodeTranslator instance for the w:trPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(config);
