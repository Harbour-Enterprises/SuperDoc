// @ts-check
import { twipsToInches, twipsToLines, twipsToPixels, twipsToPt, eigthPointsToPixels } from '@converter/helpers.js';

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
    if (a['w:sz'] !== undefined) sizePx = eigthPointsToPixels(a['w:sz']);

    // Track space of border
    let spacePx;
    if (a['w:space'] !== undefined) spacePx = eigthPointsToPixels(a['w:space']);

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
  };

  const { indent: pDefaultIndent = {} } = getDefaultParagraphStyle(docx, styleId);

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const inLineIndentTag = pPr?.elements?.find((el) => el.name === 'w:ind');
  const inLineIndent = inLineIndentTag?.attributes || {};

  const leftIndent = inLineIndent?.['w:left'] || pDefaultIndent?.['w:left'];
  const rightIndent = inLineIndent?.['w:right'] || pDefaultIndent?.['w:right'];
  const firstLine = inLineIndent?.['w:firstLine'] || pDefaultIndent?.['w:firstLine'];
  const hanging = inLineIndent?.['w:hanging'] || pDefaultIndent?.['w:hanging'];

  if (leftIndent) {
    indent.left = twipsToPixels(leftIndent);
  }
  if (rightIndent) {
    indent.right = twipsToPixels(rightIndent);
  }
  if (firstLine) {
    indent.firstLine = twipsToPixels(firstLine);
  }
  if (hanging) {
    indent.hanging = twipsToPixels(hanging);
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
export const getParagraphSpacing = (node, docx, styleId = '', marks = []) => {
  // Check if we have default paragraph styles to override
  const spacing = {};

  const { spacing: pDefaultSpacing = {} } = getDefaultParagraphStyle(docx, styleId);
  let lineSpaceAfter, lineSpaceBefore, line, lineRuleStyle;

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const inLineSpacingTag = pPr?.elements?.find((el) => el.name === 'w:spacing');
  const inLineSpacing = inLineSpacingTag?.attributes || {};

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
  if (!styles) {
    return {};
  }
  const defaults = styles.elements[0].elements?.find((el) => el.name === 'w:docDefaults');
  const pDefault = defaults.elements.find((el) => el.name === 'w:pPrDefault');
  const pPrDefault = pDefault?.elements?.find((el) => el.name === 'w:pPr');
  const pPrDefaultSpacingTag = pPrDefault?.elements?.find((el) => el.name === 'w:spacing') || {};
  const pPrDefaultIndentTag = pPrDefault?.elements?.find((el) => el.name === 'w:ind') || {};

  // Paragraph 'Normal' styles
  const stylesNormal = styles.elements[0].elements?.find(
    (el) => el.name === 'w:style' && el.attributes['w:styleId'] === 'Normal',
  );
  const pPrNormal = stylesNormal?.elements?.find((el) => el.name === 'w:pPr');
  const pPrNormalSpacingTag = pPrNormal?.elements?.find((el) => el.name === 'w:spacing') || {};
  const pPrNormalIndentTag = pPrNormal?.elements?.find((el) => el.name === 'w:ind') || {};
  const isNormalAsDefault = stylesNormal?.attributes?.['w:default'] === '1';

  // Styles based on styleId
  let pPrStyleIdSpacingTag = {};
  let pPrStyleIdIndentTag = {};
  let pPrStyleJc = {};
  if (styleId) {
    const stylesById = styles.elements[0].elements?.find(
      (el) => el.name === 'w:style' && el.attributes['w:styleId'] === styleId,
    );
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

  return {
    spacing: pPrByIdSpacingAttr || spacingRest,
    indent: pPrByIdIndentAttr || indentRest,
    justify: pPrByIdJcAttr,
  };
};

/**
 * Pre-processes nodes in a paragraph to combine nodes together where necessary (e.g., links).
 *
 * @param {Array} nodes - The nodes to process.
 * @returns {Array} The processed nodes.
 */
export const preProcessNodesForFldChar = (nodes = []) => {
  const processedNodes = [];
  let buffer = [];
  let collecting = false;

  for (const node of nodes) {
    const fldCharEl = node.elements?.find((el) => el.name === 'w:fldChar');
    const fldType = fldCharEl?.attributes?.['w:fldCharType'];

    if (fldType === 'begin') {
      buffer = [node];
      collecting = true;
      continue;
    }

    if (fldType === 'separate' && collecting) {
      buffer.push(node);
      continue;
    }

    if (fldType === 'end' && collecting) {
      buffer.push(node);
      processedNodes.push(...processCombinedNodesForFldChar(buffer));
      buffer = [];
      collecting = false;
      continue;
    }

    if (collecting) {
      buffer.push(node);
    } else {
      processedNodes.push(node);
    }
  }

  // In case of unclosed field
  if (buffer.length) {
    processedNodes.push(...buffer);
  }

  return processedNodes;
};

/**
 * Processes the combined nodes for fldChar.
 *
 * @param {Array} nodesToCombine - The nodes to combine.
 * @returns {Array} The processed nodes.
 */
export const processCombinedNodesForFldChar = (nodesToCombine = []) => {
  let processedNodes = [];
  let hasPageMarker = false;
  let isNumPages = false;

  // Need to extract all nodes between 'separate' and 'end' fldChar nodes
  const textStart = nodesToCombine.findIndex((n) =>
    n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'separate'),
  );
  const textEnd = nodesToCombine.findIndex((n) =>
    n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'end'),
  );

  const textNodes = nodesToCombine.slice(textStart + 1, textEnd);
  const instrTextContainer = nodesToCombine.find((n) => n.elements?.some((el) => el.name === 'w:instrText'));
  const instrTextNode = instrTextContainer?.elements?.find((el) => el.name === 'w:instrText');
  const instrText = instrTextNode?.elements[0].text;

  if (!hasPageMarker) hasPageMarker = instrText?.trim().startsWith('PAGE');
  if (!isNumPages) isNumPages = instrText?.trim().startsWith('NUMPAGES');
  const urlMatch = instrText?.match(/HYPERLINK\s+"([^"]+)"/);

  // If we have a page marker, we need to replace the last node with a page number node.
  if (hasPageMarker) {
    const pageNumNode = {
      name: 'sd:autoPageNumber',
      type: 'element',
    };

    nodesToCombine.forEach((n) => {
      const rPrNode = n.elements.find((el) => el.name === 'w:rPr');
      if (rPrNode) pageNumNode.elements = [rPrNode];
    });

    processedNodes.push(pageNumNode);
  }

  // If we have a NUMPAGES marker, we need to replace the last node with a total page number node.
  else if (isNumPages) {
    const totalPageNumNode = {
      name: 'sd:totalPageNumber',
      type: 'element',
    };

    nodesToCombine.forEach((n) => {
      const rPrNode = n.elements.find((el) => el.name === 'w:rPr');
      if (rPrNode) totalPageNumNode.elements = [rPrNode];
    });
    processedNodes.push(totalPageNumNode);
  }

  // If we have a hyperlink, we need to replace the last node with a link node.
  else if (urlMatch && urlMatch?.length >= 2) {
    const url = urlMatch[1];

    const textMarks = [];
    textNodes.forEach((n) => {
      const rPr = n.elements.find((el) => el.name === 'w:rPr');
      if (!rPr) return;

      const { elements } = rPr;
      elements.forEach((el) => {
        textMarks.push(el);
      });
    });

    // Create a rPr and replace all nodes with the updated node.
    const linkMark = { name: 'link', attributes: { href: url } };
    const rPr = { name: 'w:rPr', type: 'element', elements: [linkMark, ...textMarks] };
    processedNodes.push({
      name: 'w:r',
      type: 'element',
      elements: [rPr, ...textNodes],
    });
  }

  return processedNodes;
};
