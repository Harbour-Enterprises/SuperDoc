import { createNumberingValidator } from './numbering/numbering-validator.js';
import { createRelationshipsValidator } from './relationships/relationships-validator.js';
import type { Editor } from '../../../Editor.js';
import type { ValidatorLogger, ValidationResult } from '../../types.js';

interface XmlValidatorsType {
  numberingValidator: (params: { editor: Editor; logger: ValidatorLogger }) => () => ValidationResult;
  relationshipsValidator: (params: { editor: Editor; logger: ValidatorLogger }) => () => ValidationResult;
}

export const XmlValidators: XmlValidatorsType = {
  numberingValidator: createNumberingValidator,
  relationshipsValidator: createRelationshipsValidator,
};
