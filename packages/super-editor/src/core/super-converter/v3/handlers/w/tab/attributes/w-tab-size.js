// @ts-check

/**
 * Encoder for the 'w:val' attribute on the <w:tab> element.
 * Maps to the 'tabSize' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding tab size in SuperDoc, or undefined if not applicable.
 */
export const tabSizeEncoder = (attributes) => {
  return attributes['w:val'];
};

/**
 * Decoder for the 'tabSize' attribute in SuperDoc.
 * Maps to the 'w:val' attribute in OOXML.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding tab size in OOXML, or undefined if not applicable.
 */
export const tabSizeDecoder = (attrs) => {
  const { tabSize } = attrs;
  return tabSize;
};
