import { translator as w_br_translator } from './w/br/br-translator.js';
import { translator as w_tab_translator } from './w/tab/tab-translator.js';
import { translator as w_p_translator } from './w/p/p-translator.js';
import { translator as w_r_translator } from './w/r/r-translator.js';
import { runPropertyTranslators } from './w/rpr/run-property-translators.js';

/**
 * @typedef {Object} RegisteredHandlers
 */

const baseHandlers = {
  ...runPropertyTranslators,
  'w:br': w_br_translator,
  'w:tab': w_tab_translator,
  'w:p': w_p_translator,
  'w:r': w_r_translator,
};

export const registeredHandlers = Object.freeze(baseHandlers);
