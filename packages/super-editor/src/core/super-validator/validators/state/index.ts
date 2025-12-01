import { createImageNodeValidator } from './nodes/image/image-validator.js';
import { createLinkMarkValidator } from './nodes/link/link-validator.js';
import type { ValidatorFunction } from '../../types.js';
import type { Editor } from '@core/Editor.js';
import type { ValidatorLogger } from '../../types.js';

interface StateValidatorsType {
  imageNodeValidator: (params: { editor: Editor; logger: ValidatorLogger }) => ValidatorFunction;
  linkMarkValidator: (params: { editor: Editor; logger: ValidatorLogger }) => ValidatorFunction;
}

export const StateValidators: StateValidatorsType = {
  imageNodeValidator: createImageNodeValidator,
  linkMarkValidator: createLinkMarkValidator,
};
