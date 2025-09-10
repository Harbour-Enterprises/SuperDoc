// @ts-check

/**
 * Encoder for the 'w:rsidDel' attribute on the <w:p> element.
 * Maps to the 'rsidDel' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding rsidDel value in SuperDoc, or undefined if not applicable.
 */
export const wRsidDelEncoder = (attributes) => {
  return attributes['w:rsidDel'];
};

/**
 * Decoder for the 'w:rsidDel' attribute on the <w:p> element.
 * Maps to the 'rsidDel' attribute in SuperDoc.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding rsidDel value in OOXML, or undefined if not applicable.
 */
export const wRsidDelDecoder = (attrs) => {
  return attrs.rsidDel;
};
