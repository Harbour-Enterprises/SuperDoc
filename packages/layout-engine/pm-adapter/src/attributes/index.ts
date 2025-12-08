/**
 * Attributes Module
 *
 * Centralized exports for paragraph attribute normalization, computation, and conversion.
 */

// Border and shading
export {
  convertBorderSpec,
  convertTableBorderValue,
  extractTableBorders,
  extractCellBorders,
  extractCellPadding,
  normalizeParagraphBorders,
  normalizeParagraphShading,
  normalizeShadingColor,
  mapBorderStyle,
  normalizeBorderSide,
} from './borders.js';

// Spacing and indent
export {
  spacingPxToPt,
  indentPxToPt,
  spacingPtToPx,
  indentPtToPx,
  normalizeAlignment,
  normalizeParagraphSpacing,
  normalizeLineRule,
  normalizePxIndent,
  normalizeParagraphIndent,
} from './spacing-indent.js';

// Tab stops
export { normalizeOoxmlTabs, normalizeTabVal, normalizeTabLeader } from './tabs.js';

// BiDi text
export { mirrorIndentForRtl, ensureBidiIndentPx, DEFAULT_BIDI_INDENT_PX } from './bidi.js';

// Paragraph attributes
export {
  computeParagraphAttrs,
  mergeParagraphAttrs,
  convertListParagraphAttrs,
  cloneParagraphAttrs,
  buildStyleNodeFromAttrs,
  resolveParagraphBooleanAttr,
  hasPageBreakBefore,
  normalizeListRenderingAttrs,
  buildNumberingPath,
  computeWordLayoutForParagraph,
} from './paragraph.js';
