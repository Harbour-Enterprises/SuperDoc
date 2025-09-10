import { translator as w_br_translator } from './w/br/br-translator.js';
import { translator as w_tab_translator } from './w/tab/tab-translator.js';

/**
 * @typedef {Object} RegisteredHandlers
 */

export const registeredHandlers = Object.freeze({
  'w:br': w_br_translator,
  'w:tab': w_tab_translator,
});
