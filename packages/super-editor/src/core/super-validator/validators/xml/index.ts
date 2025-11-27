import { createNumberingValidator } from './numbering/numbering-validator.js';
import { createRelationshipsValidator } from './relationships/relationships-validator.js';
import type { XmlValidator } from '../../types.js';

interface XmlValidatorsType {
  numberingValidator: (params: { editor: unknown; logger: unknown }) => XmlValidator;
  relationshipsValidator: (params: { editor: unknown; logger: unknown }) => XmlValidator;
}

export const XmlValidators: XmlValidatorsType = {
  numberingValidator: createNumberingValidator,
  relationshipsValidator: createRelationshipsValidator,
};
