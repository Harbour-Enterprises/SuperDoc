import { translator as w_br_translator } from './w/br/br-translator.js';
import { translator as w_tab_translator } from './w/tab/tab-translator.js';
import { translator as w_p_translator } from './w/p/p-translator.js';
import { translator as wp_anchor_translator } from './wp/anchor/anchor-translator.js';
import { translator as wp_inline_translator } from './wp/inline/inline-translator.js';

/**
 * @typedef {Object} RegisteredHandlers
 */

export const registeredHandlers = Object.freeze({
  'w:br': w_br_translator,
  'w:tab': w_tab_translator,
  'w:p': w_p_translator,
  'wp:anchor': wp_anchor_translator,
  'wp:inline': wp_inline_translator,
});
