// @ts-check

/**
 * Encoder for the 'w:rsidRPr' attribute on the <w:p> element.
 * Maps to the 'rsidRPr' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding rsidRPr value in SuperDoc, or undefined if not applicable.
 */
export const wRsidRPrEncoder = (attributes) => {
  return attributes['w:rsidRPr'];
};

/**
 * Decoder for the 'w:rsidRPr' attribute on the <w:p> element.
 * Maps to the 'rsidRPr' attribute in SuperDoc.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding rsidRPr value in OOXML, or undefined if not applicable.
 */
export const wRsidRPrDecoder = (attrs) => {
  return attrs.rsidRPr;
};
