// @ts-check
import { twipsToLines, twipsToPixels, twipsToPt } from '@converter/helpers.js';

/**
 * Gets the paragraph indentation.
 * @param {Object} inlineIndent - The inline indentation attributes.
 * @param {Object} docx - The DOCX document.
 * @param {string} styleId - The style ID.
 * @returns {Object} The paragraph indentation.
 */
export const getParagraphIndent = (inlineIndent, docx, styleId = '') => {
  const indent = {
    left: 0,
    right: 0,
    firstLine: 0,
    hanging: 0,
    explicitLeft: false,
    explicitRight: false,
    explicitFirstLine: false,
    explicitHanging: false,
  };

  const { indent: pDefaultIndent = {} } = getDefaultParagraphStyle(docx, styleId);

  const {
    left: inlineLeft,
    right: inlineRight,
    firstLine: inlineFirstLine,
    hanging: inlineHanging,
  } = inlineIndent || {};

  const leftIndent = inlineLeft ?? pDefaultIndent?.['w:left'];
  const rightIndent = inlineRight ?? pDefaultIndent?.['w:right'];
  const firstLine = inlineFirstLine ?? pDefaultIndent?.['w:firstLine'];
  const hanging = inlineHanging ?? pDefaultIndent?.['w:hanging'];

  if (leftIndent) {
    indent.left = twipsToPixels(leftIndent);
    indent.explicitLeft = inlineLeft !== undefined;
  }
  if (rightIndent) {
    indent.right = twipsToPixels(rightIndent);
    indent.explicitRight = inlineRight !== undefined;
  }
  if (firstLine) {
    indent.firstLine = twipsToPixels(firstLine);
    indent.explicitFirstLine = inlineFirstLine !== undefined;
  }
  if (hanging) {
    indent.hanging = twipsToPixels(hanging);
    indent.explicitHanging = inlineHanging !== undefined;
  }

  return indent;
};

/**
 * Gets the paragraph spacing.
 * @param {Object} inlineSpacing - The inline spacing attributes.
 * @param {Object} docx - The DOCX document.
 * @param {string} styleId - The style ID.
 * @param {Array} marks - The text style marks.
 * @returns {Object} The paragraph spacing.
 */
export const getParagraphSpacing = (inlineSpacing, docx, styleId = '', marks = [], options = {}) => {
  const { insideTable = false } = options;
  // Check if we have default paragraph styles to override
  const spacing = {};

  const { spacing: pDefaultSpacing = {}, spacingSource } = getDefaultParagraphStyle(docx, styleId);

  const hasInlineSpacing = !!inlineSpacing;

  const textStyleMark = marks.find((el) => el.type === 'textStyle');
  const fontSize = textStyleMark?.attrs?.fontSize;

  // These styles are taken in order of precedence
  // 1. Inline spacing
  // 2. Default style spacing
  // 3. Default paragraph spacing
  const lineSpacing = inlineSpacing?.line ?? pDefaultSpacing?.['w:line'];
  if (lineSpacing) spacing.line = twipsToLines(lineSpacing);

  const lineRule = inlineSpacing?.lineRule ?? pDefaultSpacing?.['w:lineRule'];
  if (lineRule) spacing.lineRule = lineRule;

  if (lineRule === 'exact' && lineSpacing) {
    spacing.line = `${twipsToPt(lineSpacing)}pt`;
  }

  const beforeSpacing = inlineSpacing?.before ?? pDefaultSpacing?.['w:before'];
  if (beforeSpacing) spacing.lineSpaceBefore = twipsToPixels(beforeSpacing);

  const beforeAutospacing = inlineSpacing?.beforeAutospacing;
  if (beforeAutospacing === '1' && fontSize) {
    spacing.lineSpaceBefore += Math.round((parseInt(fontSize) * 0.5 * 96) / 72);
  }

  const afterSpacing = inlineSpacing?.after ?? pDefaultSpacing?.['w:after'];
  if (afterSpacing) spacing.lineSpaceAfter = twipsToPixels(afterSpacing);

  const afterAutospacing = inlineSpacing?.afterAutospacing;
  if (afterAutospacing === '1' && fontSize) {
    spacing.lineSpaceAfter += Math.round((parseInt(fontSize) * 0.5 * 96) / 72);
  }

  if (insideTable && !hasInlineSpacing && spacingSource === 'docDefault') {
    // Word ignores doc-default spacing inside table cells unless explicitly set,
    // so drop the derived values when nothing is defined inline or via style.
    if (!hasInlineSpacing) {
      return undefined;
    }
  }

  return spacing;
};

/**
 * Gets the default paragraph style.
 * @param {Object} docx - The DOCX document.
 * @param {string} styleId - The style ID.
 * @returns {Object} The default paragraph style.
 */
export const getDefaultParagraphStyle = (docx, styleId = '') => {
  const styles = docx['word/styles.xml'];
  const rootElements = styles?.elements?.[0]?.elements;
  if (!rootElements?.length) {
    return {};
  }
  const defaults = rootElements.find((el) => el.name === 'w:docDefaults');
  const pDefault = defaults?.elements?.find((el) => el.name === 'w:pPrDefault') || {};
  const pPrDefault = pDefault?.elements?.find((el) => el.name === 'w:pPr');
  const pPrDefaultSpacingTag = pPrDefault?.elements?.find((el) => el.name === 'w:spacing') || {};
  const pPrDefaultIndentTag = pPrDefault?.elements?.find((el) => el.name === 'w:ind') || {};

  // Paragraph 'Normal' styles
  const stylesNormal = rootElements.find((el) => el.name === 'w:style' && el.attributes['w:styleId'] === 'Normal');
  const pPrNormal = stylesNormal?.elements?.find((el) => el.name === 'w:pPr');
  const pPrNormalSpacingTag = pPrNormal?.elements?.find((el) => el.name === 'w:spacing') || {};
  const pPrNormalIndentTag = pPrNormal?.elements?.find((el) => el.name === 'w:ind') || {};
  const isNormalAsDefault = stylesNormal?.attributes?.['w:default'] === '1';

  // Styles based on styleId
  let pPrStyleIdSpacingTag = {};
  let pPrStyleIdIndentTag = {};
  let pPrStyleJc = {};
  if (styleId) {
    const stylesById = rootElements.find((el) => el.name === 'w:style' && el.attributes['w:styleId'] === styleId);
    const pPrById = stylesById?.elements?.find((el) => el.name === 'w:pPr');
    pPrStyleIdSpacingTag = pPrById?.elements?.find((el) => el.name === 'w:spacing') || {};
    pPrStyleIdIndentTag = pPrById?.elements?.find((el) => el.name === 'w:ind') || {};
    pPrStyleJc = pPrById?.elements?.find((el) => el.name === 'w:jc') || {};
  }

  const { attributes: pPrDefaultSpacingAttr } = pPrDefaultSpacingTag;
  const { attributes: pPrNormalSpacingAttr } = pPrNormalSpacingTag;
  const { attributes: pPrByIdSpacingAttr } = pPrStyleIdSpacingTag;
  const { attributes: pPrByIdJcAttr } = pPrStyleJc;

  const { attributes: pPrDefaultIndentAttr } = pPrDefaultIndentTag;
  const { attributes: pPrNormalIndentAttr } = pPrNormalIndentTag;
  const { attributes: pPrByIdIndentAttr } = pPrStyleIdIndentTag;

  const spacingRest = isNormalAsDefault
    ? pPrNormalSpacingAttr || pPrDefaultSpacingAttr
    : pPrDefaultSpacingAttr || pPrNormalSpacingAttr;

  const indentRest = isNormalAsDefault
    ? pPrNormalIndentAttr || pPrDefaultIndentAttr
    : pPrDefaultIndentAttr || pPrNormalIndentAttr;

  let spacingToUse = pPrByIdSpacingAttr || spacingRest;
  let spacingSource = 'docDefault';
  if (pPrByIdSpacingAttr) {
    spacingSource = 'style';
  } else if (spacingRest === pPrNormalSpacingAttr && pPrNormalSpacingAttr) {
    spacingSource = isNormalAsDefault ? 'docDefault' : 'normal';
  } else if (spacingRest === pPrDefaultSpacingAttr && pPrDefaultSpacingAttr) {
    spacingSource = 'docDefault';
  }

  let indentToUse = pPrByIdIndentAttr || indentRest;

  return {
    spacing: spacingToUse,
    spacingSource,
    indent: indentToUse,
    justify: pPrByIdJcAttr,
  };
};
