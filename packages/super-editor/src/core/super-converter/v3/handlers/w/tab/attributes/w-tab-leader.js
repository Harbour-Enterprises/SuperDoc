// @ts-check

/**
 * Encoder for the 'w:leader' attribute on the <w:tab> element.
 * Maps to the 'tabLeader' attribute in SuperDoc.
 * @param {Object} attributes - The attributes from the OOXML element.
 * @returns {string|undefined} The corresponding leader value in SuperDoc, or undefined if not applicable.
 */
export const tabLeaderEncoder = (attributes) => {
  return attributes['w:leader'];
};

/**
 * Decoder for the 'tabLeader' attribute in SuperDoc.
 * Maps to the 'w:leader' attribute in OOXML.
 * @param {Object} attrs - The attributes from the SuperDoc element.
 * @returns {string|undefined} The corresponding leader value in OOXML, or undefined if not applicable.
 */
export const tabLeaderDecoder = (attrs) => {
  const { tabLeader } = attrs;
  return tabLeader;
};
