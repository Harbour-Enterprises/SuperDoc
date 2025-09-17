import { NodeTranslator } from '@translator';
import { parseBoolean } from '@converter/v3/handlers/utils';

/**
 * The NodeTranslator instance for the hidden element.
 * @type {import('@translator').NodeTranslator}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 405
 */
export const translator = NodeTranslator.from({
  xmlName: 'w:hidden',
  sdNodeOrKeyName: 'hidden',
  encode: ({ nodes }) => parseBoolean(nodes[0].attributes?.['w:val'] ?? '1'),
  decode: ({ node }) => (node.attrs.hidden ? {} : undefined),
});
