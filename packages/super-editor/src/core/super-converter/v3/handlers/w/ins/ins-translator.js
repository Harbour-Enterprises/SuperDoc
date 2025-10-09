import { NodeTranslator } from '@translator';
import { createTrackChangesPropertyHandler } from '@converter/v3/handlers/utils';

/**
 * The NodeTranslator instance for the w:ins element.
 * @type {import('@translator').NodeTranslator}
 * @see {@link https://ecma-international.org/publications-and-standards/standards/ecma-376/} "Fundamentals And Markup Language Reference", page 852
 */
export const translator = NodeTranslator.from(createTrackChangesPropertyHandler('w:ins'));
