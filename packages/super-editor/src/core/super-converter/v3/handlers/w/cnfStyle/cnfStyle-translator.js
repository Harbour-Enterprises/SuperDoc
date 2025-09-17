import { NodeTranslator } from '@translator';
import { createAttributeHandler } from '@converter/v3/handlers/utils.js';

/**
 * The NodeTranslator instance for the cnfStyle element.
 * @type {import('@translator').NodeTranslator}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 379
 *
 */
export const translator = NodeTranslator.from({
  xmlName: 'w:cnfStyle',
  sdNodeOrKeyName: 'cnfStyle',
  attributes: [
    'w:evenHBand',
    'w:evenVBand',
    'w:firstColumn',
    'w:firstRow',
    'w:firstRowFirstColumn',
    'w:firstRowLastColumn',
    'w:lastColumn',
    'w:lastRow',
    'w:lastRowFirstColumn',
    'w:lastRowLastColumn',
    'w:oddHBand',
    'w:oddVBand',
    'w:val',
  ].map((attr) => createAttributeHandler(attr)),
  encode: (_, encodedAttrs) => {
    // Convert '1'/'0' and 'true'/'false' to boolean
    Object.keys(encodedAttrs).forEach((key) => {
      encodedAttrs[key] = ['1', 'true'].includes(encodedAttrs[key]);
    });
    return Object.keys(encodedAttrs).length > 0 ? encodedAttrs : undefined;
  },
  decode: ({ node }) => {
    if (!node.attrs?.cnfStyle) return;
    const cnfStyleAttrs = {};
    Object.entries(node.attrs.cnfStyle).forEach(([key, value]) => {
      cnfStyleAttrs[`w:${key}`] = value ? '1' : '0';
    });
    return Object.keys(cnfStyleAttrs).length > 0 ? { attributes: cnfStyleAttrs } : undefined;
  },
});
