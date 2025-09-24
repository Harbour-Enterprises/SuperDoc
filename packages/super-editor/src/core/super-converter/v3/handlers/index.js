// @ts-check
import { translator as w_br_translator } from './w/br/br-translator.js';
import { translator as w_cantSplit_translator } from './w/cantSplit/cantSplit-translator.js';
import { translator as w_cnfStyle_translator } from './w/cnfStyle/cnfStyle-translator.js';
import { translator as w_divId_translator } from './w/divId/divId-translator.js';
import { translator as w_gridAfter_translator } from './w/gridAfter/gridAfter-translator.js';
import { translator as w_gridBefore_translator } from './w/gridBefore/gridBefore-translator.js';
import { translator as w_hidden_translator } from './w/hidden/hidden-translator.js';
import { translator as w_hyperlink_translator } from './w/hyperlink/hyperlink-translator.js';
import { translator as w_jc_translator } from './w/jc/jc-translator.js';
import { translator as w_p_translator } from './w/p/p-translator.js';
import { translator as w_r_translator } from './w/r/r-translator.js';
import { translator as w_rPr_translator } from './w/rpr/rpr-translator.js';
import { translator as w_sdt_translator } from './w/sdt/sdt-translator.js';
import { translator as w_tab_translator } from './w/tab/tab-translator.js';
import { translator as w_tblCellSpacing_translator } from './w/tblCellSpacing/tblCellSpacing-translator.js';
import { translator as w_tblHeader_translator } from './w/tblHeader/tblHeader-translator.js';
import { translator as w_tc_translator } from './w/tc/tc-translator.js';
import { translator as w_tr_translator } from './w/tr/tr-translator.js';
import { translator as w_trHeight_translator } from './w/trHeight/trHeight-translator.js';
import { translator as w_trPr_translator } from './w/trPr/trPr-translator.js';
import { translator as w_wAfter_translator } from './w/wAfter/wAfter-translator.js';
import { translator as w_wBefore_translator } from './w/wBefore/wBefore-translator.js';
import { runPropertyTranslators } from './w/rpr/run-property-translators.js';
import { translator as wp_anchor_translator } from './wp/anchor/anchor-translator.js';
import { translator as wp_inline_translator } from './wp/inline/inline-translator.js';
import { translator as w_bookmark_start_translator } from './w/bookmark-start/bookmark-start-translator.js';
import { translator as w_bookmark_end_translator } from './w/bookmark-end/bookmark-end-translator.js';

/**
 * @typedef {Object} RegisteredHandlers
 */

const baseHandlers = {
  ...runPropertyTranslators,
  'w:br': w_br_translator,
  'w:cantSplit': w_cantSplit_translator,
  'w:cnfStyle': w_cnfStyle_translator,
  'w:divId': w_divId_translator,
  'w:gridAfter': w_gridAfter_translator,
  'w:gridBefore': w_gridBefore_translator,
  'w:hidden': w_hidden_translator,
  'w:hyperlink': w_hyperlink_translator,
  'w:jc': w_jc_translator,
  'w:p': w_p_translator,
  'w:r': w_r_translator,
  'w:rPr': w_rPr_translator,
  'w:sdt': w_sdt_translator,
  'w:tab': w_tab_translator,
  'w:tblCellSpacing': w_tblCellSpacing_translator,
  'w:tblHeader': w_tblHeader_translator,
  'w:tc': w_tc_translator,
  'w:tr': w_tr_translator,
  'w:trHeight': w_trHeight_translator,
  'w:trPr': w_trPr_translator,
  'w:wAfter': w_wAfter_translator,
  'w:wBefore': w_wBefore_translator,
  'wp:anchor': wp_anchor_translator,
  'wp:inline': wp_inline_translator,
  'w:bookmarkStart': w_bookmark_start_translator,
  'w:bookmarkEnd': w_bookmark_end_translator,
};

/** @type {RegisteredHandlers} */
export const registeredHandlers = Object.freeze(baseHandlers);
