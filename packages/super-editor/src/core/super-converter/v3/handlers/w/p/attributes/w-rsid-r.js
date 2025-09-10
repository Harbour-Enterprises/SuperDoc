// @ts-check

/**
 * Encoder for the 'w:rsidR' attribute on the <w:p> element.
 * Maps to the 'rsidR' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding rsidR value in SuperDoc, or undefined if not applicable.
 */
export const wRsidREncoder = (attributes) => {
  return attributes['w:rsidR'];
};

/**
 * Decoder for the 'w:rsidR' attribute on the <w:p> element.
 * Maps to the 'rsidR' attribute in SuperDoc.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding rsidR value in OOXML, or undefined if not applicable.
 */
export const wRsidRDecoder = (attrs) => {
  return attrs.rsidR;
};
