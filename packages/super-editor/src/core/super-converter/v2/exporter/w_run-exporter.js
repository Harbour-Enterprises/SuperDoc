import { translator } from '../../v3/handlers/w/r/r-translator.js';

export const translateRunNode = (params) => {
  const result = translator.decode(params);
  return result;
};
