// @ts-check
import { twipsToInches, twipsToLines, twipsToPixels, twipsToPt, eighthPointsToPixels } from '@converter/helpers.js';

/**
 * Parses the borders of a paragraph.
 * @param {Object} pBdr - The paragraph border element.
 * @returns An object representing the parsed border properties.
 */
export const parseParagraphBorders = (pBdr) => {
  if (!pBdr || !pBdr.elements) return {};
  // These are the possible sides
  const sides = ['top', 'bottom', 'left', 'right'];
  const result = {};

  sides.forEach((side) => {
    const el = pBdr.elements.find((e) => e.name === `w:${side}`);
    if (!el || !el.attributes) return;

    const { attributes: a } = el;
    if (a['w:val'] === 'nil' || a['w:val'] === undefined) return;

    // Set size of border
    let sizePx;
    if (a['w:sz'] !== undefined) sizePx = eighthPointsToPixels(a['w:sz']);

    // Track space of border
    let spacePx;
    if (a['w:space'] !== undefined) spacePx = eighthPointsToPixels(a['w:space']);

    result[side] = {
      val: a['w:val'],
      size: sizePx,
      space: spacePx,
      color: a['w:color'] ? `#${a['w:color']}` : '#000000',
    };
  });

  return result;
};

/**
 * Gets the paragraph indentation.
 * @param {Object} node - The paragraph node.
 * @param {Object} docx - The DOCX document.
 * @param {string} styleId - The style ID.
 * @returns {Object} The paragraph indentation.
 */
export const getParagraphIndent = (node, docx, styleId = '') => {
  const indent = {
    left: 0,
    right: 0,
    firstLine: 0,
    hanging: 0,
    textIndent: 0,
    explicitLeft: false,
    explicitRight: false,
    explicitFirstLine: false,
    explicitHanging: false,
  };

  const { indent: pDefaultIndent = {} } = getDefaultParagraphStyle(docx, styleId);

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const inLineIndentTag = pPr?.elements?.find((el) => el.name === 'w:ind');
  const inLineIndent = inLineIndentTag?.attributes || {};

  const inlineLeft = inLineIndent?.['w:left'];
  const inlineRight = inLineIndent?.['w:right'];
  const inlineFirstLine = inLineIndent?.['w:firstLine'];
  const inlineHanging = inLineIndent?.['w:hanging'];

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

  const textIndentValue = leftIndent - parseInt(hanging || 0) || 0;

  if (textIndentValue) {
    indent.textIndent = twipsToInches(textIndentValue);
  }

  return indent;
};

/**
 * Gets the paragraph spacing.
 * @param {Object} node - The paragraph node.
 * @param {Object} docx - The DOCX document.
 * @param {string} styleId - The style ID.
 * @param {Array} marks - The text style marks.
 * @returns {Object} The paragraph spacing.
 */
export const getParagraphSpacing = (node, docx, styleId = '', marks = [], options = {}) => {
  const { insideTable = false } = options;
  // Check if we have default paragraph styles to override
  const spacing = {};

  const { spacing: pDefaultSpacing = {}, spacingSource } = getDefaultParagraphStyle(docx, styleId);
  let lineSpaceAfter, lineSpaceBefore, line, lineRuleStyle;

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const inLineSpacingTag = pPr?.elements?.find((el) => el.name === 'w:spacing');
  const inLineSpacing = inLineSpacingTag?.attributes || {};
  const hasInlineSpacing = !!Object.keys(inLineSpacing).length;

  const textStyleMark = marks.find((el) => el.type === 'textStyle');
  const fontSize = textStyleMark?.attrs?.fontSize;

  // These styles are taken in order of precedence
  // 1. Inline spacing
  // 2. Default style spacing
  // 3. Default paragraph spacing
  const lineSpacing = inLineSpacing?.['w:line'] || line || pDefaultSpacing?.['w:line'];
  if (lineSpacing) spacing.line = twipsToLines(lineSpacing);

  const lineRule = inLineSpacing?.['w:lineRule'] || lineRuleStyle || pDefaultSpacing?.['w:lineRule'];
  if (lineRule) spacing.lineRule = lineRule;

  if (lineRule === 'exact' && lineSpacing) {
    spacing.line = `${twipsToPt(lineSpacing)}pt`;
  }
  if (lineRule === 'atLeast' || lineRule === 'exactly') {
    // Interpret w:line as a pt value
    // See: http://officeopenxml.com/WPspacing.php
    spacing.line = twipsToPt(lineSpacing);
    // Prevent values less than 1pt to avoid squashed text
    spacing.line = Math.max(spacing.line, 1);
  }

  const beforeSpacing = inLineSpacing?.['w:before'] || lineSpaceBefore || pDefaultSpacing?.['w:before'];
  if (beforeSpacing) spacing.lineSpaceBefore = twipsToPixels(beforeSpacing);

  const beforeAutospacing = inLineSpacing?.['w:beforeAutospacing'];
  if (beforeAutospacing === '1' && fontSize) {
    spacing.lineSpaceBefore += Math.round((parseInt(fontSize) * 0.5 * 96) / 72);
  }

  const afterSpacing = inLineSpacing?.['w:after'] || lineSpaceAfter || pDefaultSpacing?.['w:after'];
  if (afterSpacing) spacing.lineSpaceAfter = twipsToPixels(afterSpacing);

  const afterAutospacing = inLineSpacing?.['w:afterAutospacing'];
  if (afterAutospacing === '1' && fontSize) {
    spacing.lineSpaceAfter += Math.round((parseInt(fontSize) * 0.5 * 96) / 72);
  }

  if (insideTable && !hasInlineSpacing && spacingSource === 'docDefault') {
    // Word ignores doc-default spacing inside table cells unless explicitly set,
    // so drop the derived values when nothing is defined inline or via style.
    const hasExplicitSpacing = Object.keys(inLineSpacing).length > 0;
    if (!hasExplicitSpacing) {
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
