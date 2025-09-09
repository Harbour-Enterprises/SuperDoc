// @ts-check

/**
 * Encoder for the 'w:pos' attribute on the <w:tab> element.
 * Maps to the 'tabPosition' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding position value in SuperDoc, or undefined if not applicable.
 */
export const tabPositionEncoder = (attributes) => {
  return attributes['w:pos'];
};

/**
 * Decoder for the 'tabPosition' attribute in SuperDoc.
 * Maps to the 'w:pos' attribute in OOXML.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding position value in OOXML, or undefined if not applicable.
 */
export const tabPositionDecoder = (attrs) => {
  const { tabPosition } = attrs;
  return tabPosition;
};
