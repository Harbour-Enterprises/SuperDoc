import { translator as w_br_translator } from './w/br/br-translator.js';
import { translator as w_tab_translator } from './w/tab/tab-translator.js';
import { translator as w_p_translator } from './w/p/p-translator.js';
import { translator as w_r_translator } from './w/r/r-translator.js';
import { translator as w_b_translator } from './w/b/b-translator.js';
import { translator as w_i_translator } from './w/i/i-translator.js';
import { translator as w_u_translator } from './w/u/u-translator.js';
import { translator as w_color_translator } from './w/color/color-translator.js';
import { translator as w_highlight_translator } from './w/highlight/highlight-translator.js';
import { translator as w_rFonts_translator } from './w/rFonts/rFonts-translator.js';
import { translator as w_rStyle_translator } from './w/rStyle/rstyle-translator.js';
import { translator as w_sz_translator } from './w/sz/sz-translator.js';
import { translator as w_szcs_translator } from './w/szcs/szcs-translator.js';
import { translator as w_tc_translator } from './w/tc/tc-translator';
import { translator as w_rpr_translator } from './w/rpr/rpr-translator.js';
import { translator as w_strike_translator } from './w/strike/strike-translator.js';

/**
 * @typedef {Object} RegisteredHandlers
 */

export const registeredHandlers = Object.freeze({
  'w:br': w_br_translator,
  'w:tab': w_tab_translator,
  'w:p': w_p_translator,
  'w:r': w_r_translator,
  'w:b': w_b_translator,
  'w:i': w_i_translator,
  'w:u': w_u_translator,
  'w:color': w_color_translator,
  'w:highlight': w_highlight_translator,
  'w:rFonts': w_rFonts_translator,
  'w:rStyle': w_rStyle_translator,
  'w:sz': w_sz_translator,
  'w:szCs': w_szcs_translator,
  'w:tc': w_tc_translator,
  'w:rPr': w_rpr_translator,
  'w:strike': w_strike_translator,
});
