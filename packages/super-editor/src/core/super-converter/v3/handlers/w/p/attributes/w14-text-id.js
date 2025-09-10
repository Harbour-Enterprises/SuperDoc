// @ts-check

/**
 * Encoder for the 'w14:textId' attribute on the <w:p> element.
 * Maps to the 'textId' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding textId value in SuperDoc, or undefined if not applicable.
 */
export const w14TextIdEncoder = (attributes) => {
  return attributes['w14:textId'];
};

/**
 * Decoder for the 'w14:textId' attribute on the <w:p> element.
 * Maps to the 'textId' attribute in SuperDoc.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding textId value in OOXML, or undefined if not applicable.
 */
export const w14TextIdDecoder = (attrs) => {
  return attrs.textId;
};
