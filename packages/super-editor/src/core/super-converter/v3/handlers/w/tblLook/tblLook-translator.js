import { NodeTranslator } from '@translator';
import { createAttributeHandler, parseBoolean, booleanToString } from '../../utils.js';

/**
 * The NodeTranslator instance for the tblLook element.
 * @type {import('@translator').NodeTranslator}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 438
 */
export const translator = NodeTranslator.from({
  xmlName: 'w:tblLook',
  sdNodeOrKeyName: 'tblLook',
  attributes: ['w:firstColumn', 'w:firstRow', 'w:lastColumn', 'w:lastRow', 'w:noHBand', 'w:noVBand']
    .map((attr) => createAttributeHandler(attr, null, parseBoolean, booleanToString))
    .concat([createAttributeHandler('w:val')]),
  encode: (params, encodedAttrs) => {
    void params;
    return Object.keys(encodedAttrs).length > 0 ? encodedAttrs : undefined;
  },
  decode: function ({ node }, context) {
    void context;
    const decodedAttrs = this.decodeAttributes({ node: { ...node, attrs: node.attrs.tblLook || {} } });
    return Object.keys(decodedAttrs).length > 0 ? { attributes: decodedAttrs } : undefined;
  },
});
