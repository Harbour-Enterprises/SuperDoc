// @ts-check
import { createNumberingValidator } from './numbering/numbering-validator.js';

/**
 * @typedef {Object} XmlValidator
 * @property {import('../../types.js').XmlValidator} numberingValidator - Validator for numbering.xml file.
 */
export const XmlValidators = {
  numberingValidator: createNumberingValidator,
};
