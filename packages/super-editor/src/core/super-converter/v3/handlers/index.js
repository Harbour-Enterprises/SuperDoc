// @ts-check
import { translator as mc_AlternateContent_translator } from './mc/altermateContent/alternate-content-translator.js';
import { translator as sd_pageReference_translator } from './sd/pageReference/pageReference-translator.js';
import { translator as sd_tableOfContents_translator } from './sd/tableOfContents/tableOfContents-translator.js';
import { translator as w_b_translator } from './w/b/b-translator.js';
import { translator as w_bidiVisual_translator } from './w/bidiVisual/bidiVisual-translator.js';
import { translator as w_bookmarkEnd_translator } from './w/bookmark-end/bookmark-end-translator.js';
import { translator as w_bookmarkStart_translator } from './w/bookmark-start/bookmark-start-translator.js';
import { translator as w_bottom_translator } from './w/bottom/bottom-translator.js';
import { translator as w_br_translator } from './w/br/br-translator.js';
import { translator as w_cantSplit_translator } from './w/cantSplit/cantSplit-translator.js';
import { translator as w_cnfStyle_translator } from './w/cnfStyle/cnfStyle-translator.js';
import { translator as w_color_translator } from './w/color/color-translator.js';
import { translator as w_divId_translator } from './w/divId/divId-translator.js';
import { translator as w_drawing_translator } from './w/drawing/drawing-translator.js';
import { translator as w_end_translator } from './w/end/end-translator.js';
import { translator as w_gridAfter_translator } from './w/gridAfter/gridAfter-translator.js';
import { translator as w_gridBefore_translator } from './w/gridBefore/gridBefore-translator.js';
import { translator as w_gridCol_translator } from './w/gridCol/gridCol-translator.js';
import { translator as w_hidden_translator } from './w/hidden/hidden-translator.js';
import { translator as w_highlight_translator } from './w/highlight/highlight-translator.js';
import { translator as w_hyperlink_translator } from './w/hyperlink/hyperlink-translator.js';
import { translator as w_i_translator } from './w/i/i-translator.js';
import { translator as w_insideH_translator } from './w/insideH/insideH-translator.js';
import { translator as w_insideV_translator } from './w/insideV/insideV-translator.js';
import { translator as w_jc_translator } from './w/jc/jc-translator.js';
import { translator as w_left_translator } from './w/left/left-translator.js';
import { translator as w_p_translator } from './w/p/p-translator.js';
import { translator as w_r_translator } from './w/r/r-translator.js';
import { translator as w_rFonts_translator } from './w/rFonts/rFonts-translator.js';
import { translator as w_rPr_translator } from './w/rpr/rpr-translator.js';
import { translator as w_rStyle_translator } from './w/rStyle/rstyle-translator.js';
import { translator as w_right_translator } from './w/right/right-translator.js';
import { translator as w_sdt_translator } from './w/sdt/sdt-translator.js';
import { translator as w_shd_translator } from './w/shd/shd-translator.js';
import { translator as w_start_translator } from './w/start/start-translator.js';
import { translator as w_strike_translator } from './w/strike/strike-translator.js';
import { translator as w_sz_translator } from './w/sz/sz-translator.js';
import { translator as w_szCs_translator } from './w/szcs/szcs-translator.js';
import { translator as w_tab_translator } from './w/tab/tab-translator.js';
import { translator as w_tbl_translator } from './w/tbl/tbl-translator.js';
import { translator as w_tblBorders_translator } from './w/tblBorders/tblBorders-translator.js';
import { translator as w_tblCaption_translator } from './w/tblCaption/tblCaption-translator.js';
import { translator as w_tblCellMar_translator } from './w/tblCellMar/tblCellMar-translator.js';
import { translator as w_tblCellSpacing_translator } from './w/tblCellSpacing/tblCellSpacing-translator.js';
import { translator as w_tblDescription_translator } from './w/tblDescription/tblDescription-translator.js';
import { translator as w_tblGrid_translator } from './w/tblGrid/tblGrid-translator.js';
import { translator as w_tblHeader_translator } from './w/tblHeader/tblHeader-translator.js';
import { translator as w_tblInd_translator } from './w/tblInd/tblInd-translator.js';
import { translator as w_tblLayout_translator } from './w/tblLayout/tblLayout-translator.js';
import { translator as w_tblLook_translator } from './w/tblLook/tblLook-translator.js';
import { translator as w_tblOverlap_translator } from './w/tblOverlap/tblOverlap-translator.js';
import { translator as w_tblPr_translator } from './w/tblPr/tblPr-translator.js';
import { translator as w_tblStyle_translator } from './w/tblStyle/tblStyle-translator.js';
import { translator as w_tblStyleColBandSize_translator } from './w/tblStyleColBandSize/tblStyleColBandSize-translator.js';
import { translator as w_tblStyleRowBandSize_translator } from './w/tblStyleRowBandSize/tblStyleRowBandSize-translator.js';
import { translator as w_tblW_translator } from './w/tblW/tblW-translator.js';
import { translator as w_tblpPr_translator } from './w/tblpPr/tblpPr-translator.js';
import { translator as w_tc_translator } from './w/tc/tc-translator.js';
import { translator as w_top_translator } from './w/top/top-translator.js';
import { translator as w_tr_translator } from './w/tr/tr-translator.js';
import { translator as w_trHeight_translator } from './w/trHeight/trHeight-translator.js';
import { translator as w_trPr_translator } from './w/trPr/trPr-translator.js';
import { translator as w_u_translator } from './w/u/u-translator.js';
import { translator as w_wAfter_translator } from './w/wAfter/wAfter-translator.js';
import { translator as w_wBefore_translator } from './w/wBefore/wBefore-translator.js';
import {
  commentRangeStartTranslator as w_commentRangeStart_translator,
  commentRangeEndTranslator as w_commentRangeEnd_translator,
} from './w/commentRange/comment-range-translator.js';
import { translator as wp_anchor_translator } from './wp/anchor/anchor-translator.js';
import { translator as wp_inline_translator } from './wp/inline/inline-translator.js';

import { runPropertyTranslators } from './w/rpr/run-property-translators.js';
import { translator as w_vMerge_translator } from './w/vMerge/vMerge-translator.js';
import { translator as w_gridSpan_translator } from './w/gridSpan/gridSpan-translator.js';
import { translator as w_vAlign_translator } from './w/vAlign/vAlign-translator.js';
import { translator as w_noWrap_translator } from './w/noWrap/noWrap-translator.js';
import { translator as w_tcFitText_translator } from './w/tcFitText/tcFitText-translator.js';
import { translator as w_tcW_translator } from './w/tcW/tcW-translator.js';
import { translator as w_hideMark_translator } from './w/hideMark/hideMark-translator.js';
import { translator as w_textDirection_translator } from './w/textDirection/textDirection-translator.js';
import { translator as w_tl2br_translator } from './w/tl2br/tl2br-translator.js';
import { translator as w_tr2bl_translator } from './w/tr2bl/tr2bl-translator.js';
import { translator as w_header_translator } from './w/header/header-translator.js';
import { translator as w_headers_translator } from './w/headers/headers-translator.js';
import { translator as w_tcBorders_translator } from './w/tcBorders/tcBorders-translator.js';
import { translator as w_tcMar_translator } from './w/tcMar/tcMar-translator.js';
import { translator as w_tcPr_translator } from './w/tcPr/tcPr-translator.js';

/**
 * @typedef {Object} RegisteredHandlers
 */

// Additional translator registrations keyed by OOXML element name.
const additionalHandlers = Object.freeze({
  'mc:AlternateContent': mc_AlternateContent_translator,
  'sd:pageReference': sd_pageReference_translator,
  'sd:tableOfContents': sd_tableOfContents_translator,
  'w:b': w_b_translator,
  'w:bidiVisual': w_bidiVisual_translator,
  'w:bookmarkEnd': w_bookmarkEnd_translator,
  'w:bookmarkStart': w_bookmarkStart_translator,
  'w:bottom': w_bottom_translator,
  'w:br': w_br_translator,
  'w:cantSplit': w_cantSplit_translator,
  'w:cnfStyle': w_cnfStyle_translator,
  'w:color': w_color_translator,
  'w:divId': w_divId_translator,
  'w:drawing': w_drawing_translator,
  'w:end': w_end_translator,
  'w:gridAfter': w_gridAfter_translator,
  'w:gridBefore': w_gridBefore_translator,
  'w:gridCol': w_gridCol_translator,
  'w:hidden': w_hidden_translator,
  'w:highlight': w_highlight_translator,
  'w:hyperlink': w_hyperlink_translator,
  'w:i': w_i_translator,
  'w:insideH': w_insideH_translator,
  'w:insideV': w_insideV_translator,
  'w:jc': w_jc_translator,
  'w:left': w_left_translator,
  'w:p': w_p_translator,
  'w:r': w_r_translator,
  'w:rFonts': w_rFonts_translator,
  'w:rPr': w_rPr_translator,
  'w:rStyle': w_rStyle_translator,
  'w:right': w_right_translator,
  'w:sdt': w_sdt_translator,
  'w:shd': w_shd_translator,
  'w:start': w_start_translator,
  'w:strike': w_strike_translator,
  'w:sz': w_sz_translator,
  'w:szCs': w_szCs_translator,
  'w:tab': w_tab_translator,
  'w:tbl': w_tbl_translator,
  'w:tblBorders': w_tblBorders_translator,
  'w:tblCaption': w_tblCaption_translator,
  'w:tblCellMar': w_tblCellMar_translator,
  'w:tblCellSpacing': w_tblCellSpacing_translator,
  'w:tblDescription': w_tblDescription_translator,
  'w:tblGrid': w_tblGrid_translator,
  'w:tblHeader': w_tblHeader_translator,
  'w:tblInd': w_tblInd_translator,
  'w:tblLayout': w_tblLayout_translator,
  'w:tblLook': w_tblLook_translator,
  'w:tblOverlap': w_tblOverlap_translator,
  'w:tblPr': w_tblPr_translator,
  'w:tblStyle': w_tblStyle_translator,
  'w:tblStyleColBandSize': w_tblStyleColBandSize_translator,
  'w:tblStyleRowBandSize': w_tblStyleRowBandSize_translator,
  'w:tblW': w_tblW_translator,
  'w:tblpPr': w_tblpPr_translator,
  'w:tc': w_tc_translator,
  'w:top': w_top_translator,
  'w:tr': w_tr_translator,
  'w:trHeight': w_trHeight_translator,
  'w:trPr': w_trPr_translator,
  'w:u': w_u_translator,
  'w:wAfter': w_wAfter_translator,
  'w:wBefore': w_wBefore_translator,
  'wp:anchor': wp_anchor_translator,
  'wp:inline': wp_inline_translator,
  'w:commentRangeStart': w_commentRangeStart_translator,
  'w:commentRangeEnd': w_commentRangeEnd_translator,
  'w:vMerge': w_vMerge_translator,
  'w:gridSpan': w_gridSpan_translator,
  'w:vAlign': w_vAlign_translator,
  'w:noWrap': w_noWrap_translator,
  'w:tcFitText': w_tcFitText_translator,
  'w:tcW': w_tcW_translator,
  'w:hideMark': w_hideMark_translator,
  'w:textDirection': w_textDirection_translator,
  'w:tl2br': w_tl2br_translator,
  'w:tr2bl': w_tr2bl_translator,
  'w:header': w_header_translator,
  'w:headers': w_headers_translator,
  'w:tcBorders': w_tcBorders_translator,
  'w:tcMar': w_tcMar_translator,
  'w:tcPr': w_tcPr_translator,
});

const baseHandlers = {
  ...runPropertyTranslators,
  ...additionalHandlers,
};

/** @type {RegisteredHandlers} */
export const registeredHandlers = Object.freeze(baseHandlers);
