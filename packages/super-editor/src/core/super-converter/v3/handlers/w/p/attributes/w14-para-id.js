// @ts-check

/**
 * Encoder for the 'w14:paraId' attribute on the <w:p> element.
 * Maps to the 'paraId' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding paraId value in SuperDoc, or undefined if not applicable.
 */
export const w14ParaIdEncoder = (attributes) => {
  return attributes['w14:paraId'];
};

/**
 * Decoder for the 'w14:paraId' attribute on the <w:p> element.
 * Maps to the 'paraId' attribute in SuperDoc.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding paraId value in OOXML, or undefined if not applicable.
 */
export const w14ParaIdDecoder = (attrs) => {
  return attrs.paraId;
};
