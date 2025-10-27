import { NodeTranslator } from '@translator';
import { createSingleBooleanPropertyHandler } from '@converter/v3/handlers/utils';

/**
 * The NodeTranslator instance for the w:strike element.
 * @type {import('@translator').NodeTranslator}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 313
 */
export const translator = NodeTranslator.from(createSingleBooleanPropertyHandler('w:strike'));
