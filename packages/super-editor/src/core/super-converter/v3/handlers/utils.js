/**
 * Generates a handler entity for a given node translator.
 * @param {string} handlerName - The name of the handler.
 * @param {import('../node-translator/').NodeTranslator} translator - The node translator object.
 * @returns { import("../../v2/importer/docxImporter").NodeHandlerEntry } The handler entity with the specified name.
 */
export const generateV2HandlerEntity = (handlerName, translator) => ({
  handlerName,
  handler: (params) => {
    const { nodes } = params;
    if (nodes.length === 0 || nodes[0].name !== translator.xmlName) {
      return { nodes: [], consumed: 0 };
    }
    const result = translator.encode(params);
    if (!result) return { nodes: [], consumed: 0 };
    return {
      nodes: Array.isArray(result) ? result : [result],
      consumed: 1,
    };
  },
});

/**
 * Helper to create simple property handlers with one-to-one mapping for properties with a single attribute (eg: 'w:val')
 * @param {string} xmlName The XML attribute name (with namespace).
 * @param {string|null} sdName The SuperDoc attribute name (without namespace). If null, it will be derived from xmlName.
 * @param {string} [attrName='w:val'] The specific attribute name to map to/from. Default is 'w:val'.
 * @param {function} [transformEncode=(v) => v] Optional transformation function to apply during encoding.
 * @param {function} [transformDecode=(v) => v] Optional transformation function to apply during decoding.
 * @returns {import('@translator').NodeTranslatorConfig} The attribute handler config with xmlName, sdName, encode, and decode functions.
 */
export function createSingleAttrPropertyHandler(
  xmlName,
  sdName = null,
  attrName = 'w:val',
  transformEncode = null,
  transformDecode = null,
) {
  if (!sdName) sdName = xmlName.split(':')[1];
  if (!transformEncode) transformEncode = (v) => v;
  if (!transformDecode) transformDecode = (v) => v;
  return {
    xmlName,
    sdNodeOrKeyName: sdName,
    encode: ({ nodes }) => {
      return transformEncode(nodes[0].attributes[attrName]) ?? undefined;
    },
    decode: ({ node }) => {
      const value = node.attrs?.[sdName] != null ? transformDecode(node.attrs[sdName]) : undefined;
      return value != null ? { [attrName]: value } : undefined;
    },
  };
}

/**
 * Helper to create property handlers for measurement attributes (CT_TblWidth => w:w and w:type)
 * @param {string} xmlName The XML attribute name (with namespace).
 * @param {string|null} sdName The SuperDoc attribute name (without namespace). If null, it will be derived from xmlName.
 * @returns {import('@translator').NodeTranslatorConfig} The attribute handler config with xmlName, sdName, encode, and decode functions.
 */
export function createMeasurementPropertyHandler(xmlName, sdName = null) {
  if (!sdName) sdName = xmlName.split(':')[1];
  return {
    xmlName,
    sdNodeOrKeyName: sdName,
    attributes: [
      createAttributeHandler('w:w', 'value', parseInteger, integerToString),
      createAttributeHandler('w:type'),
    ],
    encode: (_, encodedAttrs) => {
      return encodedAttrs['value'] != null ? encodedAttrs : undefined;
    },
    decode: function ({ node }) {
      const decodedAttrs = this.decodeAttributes({ node: { ...node, attrs: node.attrs[sdName] || {} } });
      return decodedAttrs['w:w'] != null ? decodedAttrs : undefined;
    },
  };
}

/**
 * Helper to create property handlers for border attributes (CT_Border xml type)
 * @param {string} [xmlName] The XML element name (with namespace).
 * @param {string|null} [sdName] The SuperDoc attribute name (without namespace). If null, it will be derived from xmlName.
 * @returns {import('@translator').NodeTranslatorConfig} The border property handler config with xmlName, sdName, encode, and decode functions.
 */
export function createBorderPropertyHandler(xmlName, sdName = null) {
  if (!sdName) sdName = xmlName.split(':')[1];
  return {
    xmlName,
    sdNodeOrKeyName: sdName,
    attributes: [
      createAttributeHandler('w:val'),
      createAttributeHandler('w:color'),
      createAttributeHandler('w:themeColor'),
      createAttributeHandler('w:themeTint'),
      createAttributeHandler('w:themeShade'),
      createAttributeHandler('w:sz', 'size', parseInteger, integerToString),
      createAttributeHandler('w:space', null, parseInteger, integerToString),
      createAttributeHandler('w:shadow', null, parseBoolean, booleanToString),
      createAttributeHandler('w:frame', null, parseBoolean, booleanToString),
    ],
    encode: (_, encodedAttrs) => {
      return Object.keys(encodedAttrs).length > 0 ? encodedAttrs : undefined;
    },
    decode: (_, decodedAttrs) => {
      return Object.keys(decodedAttrs).length > 0 ? decodedAttrs : undefined;
    },
  };
}

/**
 * Helper to create simple attribute handlers with one-to-one mapping.
 * @param {string} [xmlName] The XML attribute name (with namespace).
 * @param {string|null} [sdName] The SuperDoc attribute name (without namespace). If null, it will be derived from xmlName.
 * @returns {import('@translator').AttrConfig} The attribute handler config with xmlName, sdName, encode, and decode functions.
 */
export const createAttributeHandler = (xmlName, sdName = null, transformEncode = null, transformDecode = null) => {
  if (!transformEncode) transformEncode = (v) => v;
  if (!transformDecode) transformDecode = (v) => v;
  if (!sdName) sdName = xmlName.split(':')[1];
  return {
    xmlName,
    sdName,
    encode: (attributes) => transformEncode(attributes[xmlName]),
    decode: (attributes) => transformDecode(attributes[sdName]),
  };
};

/**
 * Encodes properties of a node using provided translators and adds them to the attributes object.
 * @param {object} [node] The node containing elements to be encoded.
 * @param {object} [translatorsByXmlName] A mapping of XML names to their corresponding translators.
 * @param {boolean} [asArray=false] If true, encodes attributes as an array of objects; otherwise, as a single object.
 * @returns {object|Array} The encoded attributes as an object or array based on the asArray flag.
 */
export function encodeProperties(node, translatorsByXmlName, asArray = false) {
  if (!node?.elements || node.elements.length === 0) {
    return asArray ? [] : {};
  }
  const attributes = asArray ? [] : {};
  node.elements.forEach((el) => {
    const translator = translatorsByXmlName[el.name];
    if (translator) {
      const encodedAttr = translator.encode({ nodes: [el] });
      if (encodedAttr != null) {
        if (asArray) {
          attributes.push({ [translator.sdNodeOrKeyName]: encodedAttr });
        } else {
          attributes[translator.sdNodeOrKeyName] = encodedAttr;
        }
      }
    }
  });
  return attributes;
}

/** Decodes properties from a given properties object using provided translators and adds them to the elements array.
 * @param {object} [node] The node being processed.
 * @param {object} [translatorsBySdName] A mapping of SuperDoc names to their corresponding translators.
 * @param {object} [properties] The properties object containing attributes to be decoded.
 * @returns {Array} An array of decoded elements.
 */
export function decodeProperties(translatorsBySdName, properties) {
  if (!properties || typeof properties !== 'object') {
    return [];
  }
  const elements = [];
  Object.keys(properties).forEach((key) => {
    const translator = translatorsBySdName[key];
    if (translator) {
      const attributes = translator.decode({ node: { attrs: { [key]: properties[key] } } });
      if (attributes != null) {
        elements.push({ name: translator.xmlName, attributes });
      }
    }
  });
  return elements;
}

/**
 * Parses a string value to determine its boolean representation.
 * Considers '1' and 'true' (case-sensitive) as true; all other values are false.
 * @param {string} value The string value to parse.
 * @returns {boolean} The boolean representation of the input string.
 */
export const parseBoolean = (value) => ['1', 'true'].includes(value);

/**
 * Converts a boolean value to its string representation.
 * Returns '1' for true and '0' for false.
 * @param {boolean} value The boolean value to convert.
 * @returns {string} The string representation of the boolean value.
 */
export const booleanToString = (value) => (value ? '1' : '0');

/**
 * Parses a value to an integer.
 * Returns undefined if the value is undefined, null, or cannot be parsed to a valid integer.
 * @param {any} value The value to parse.
 * @returns {number|undefined} The parsed integer or undefined.
 */
export const parseInteger = (value) => {
  if (value == null) return undefined;
  const intValue = parseInt(value, 10);
  return isNaN(intValue) ? undefined : intValue;
};

/**
 * Converts a value to an integer string.
 * Returns undefined if the value is undefined, null, or cannot be parsed to a valid integer.
 * @param {any} value The value to convert.
 * @returns {string|undefined} The integer string or undefined.
 */
export const integerToString = (value) => {
  const intValue = parseInteger(value);
  return intValue != undefined ? String(intValue) : undefined;
};
