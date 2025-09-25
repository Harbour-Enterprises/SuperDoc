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

/**
 * @typedef {object} FldCharProcessResult
 * @property {Array} processedNodes - The list of nodes after processing.
 * @property {{instrText: string} | null} unpairedBegin - If a field 'begin' was found without a matching 'end'. Contains the current field data.
 * @property {boolean | null} unpairedEnd - If a field 'end' was found without a matching 'begin'.
 */

/**
 * Pre-processes nodes to combine nodes together where necessary (e.g., links).
 * This function recursively traverses the node tree to handle `w:fldChar` elements, which define fields like TOC, hyperlinks and page numbers.
 *
 * It operates as a state machine:
 * - On `begin` fldChar: starts collecting nodes.
 * - On `end` fldChar: processes the collected nodes.
 *
 * The function's recursive nature and state-passing through return values allow it to handle fields that span across multiple nodes or are nested.
 *
 * @param {Array} [nodes=[]] - The nodes to process.
 * @returns {FldCharProcessResult} The processed nodes and whether there were unpaired begin or end fldChar nodes.
 */
export const preProcessNodesForFldChar = (nodes = []) => {
  const processedNodes = [];
  let collectedNodesStack = [];
  let currentFieldStack = [];
  let unpairedEnd = null;
  let collecting = false;

  /**
   * Finalizes the current field. If collecting nodes, it processes them.
   * Otherwise, it means an unpaired fldCharType='end' was found which needs to be handled by a parent node.
   * @param {object} node - The node that triggers the finalization (e.g., with fldCharType='end').
   */
  const finalizeField = (node) => {
    if (collecting) {
      const collectedNodes = collectedNodesStack.pop();
      const currentField = currentFieldStack.pop();
      collectedNodes.push(node);
      const combined = processCombinedNodesForFldChar(collectedNodes, currentField.instrText.trim());
      if (collectedNodesStack.length === 0) {
        // We have completed a top-level field, add the combined nodes to the output.
        processedNodes.push(...combined);
      } else {
        // We are inside another field, so add the combined nodes to the parent collection.
        collectedNodesStack[collectedNodesStack.length - 1].push(...combined);
      }
    } else {
      // An unmatched 'end' indicates a field from a parent node is closing.
      processedNodes.push(node);
      unpairedEnd = true;
    }
  };

  for (const node of nodes) {
    const fldCharEl = node.elements?.find((el) => el.name === 'w:fldChar');
    const fldType = fldCharEl?.attributes?.['w:fldCharType'];
    const instrTextEl = node.elements?.find((el) => el.name === 'w:instrText');
    collecting = collectedNodesStack.length > 0;

    if (fldType === 'begin') {
      collectedNodesStack.push([node]);
      currentFieldStack.push({ instrText: '' });
      continue;
    }

    // If collecting, aggregate instruction text.
    if (instrTextEl && collecting && currentFieldStack.length > 0) {
      currentFieldStack[currentFieldStack.length - 1].instrText += (instrTextEl.elements?.[0]?.text || '') + ' ';
    }

    if (fldType === 'end') {
      finalizeField(node);
      continue;
    }

    // Recurse into child nodes for nodes that are not 'begin' or 'end' markers,
    // as they may contain nested fields too.
    const childResult = preProcessNodesForFldChar(node.elements);
    node.elements = childResult.processedNodes;

    if (childResult.unpairedBegin) {
      // A field started in the children, so this node is part of that field.
      currentFieldStack.push(childResult.unpairedBegin);
      collectedNodesStack.push([node]);
    } else if (childResult.unpairedEnd) {
      // A field from this level or higher ended in the children.
      finalizeField(node);
    } else if (collecting) {
      // This node is part of a field being collected at this level.
      collectedNodesStack[collectedNodesStack.length - 1].push(node);
    } else {
      // This node is not part of any field.
      processedNodes.push(node);
    }
  }

  let unpairedBegin = null;
  if (collectedNodesStack.length > 0) {
    // An unclosed field at this level. Pass all buffered nodes and field info up to the caller
    // and let them handle it.
    processedNodes.push(...collectedNodesStack.pop());
    unpairedBegin = currentFieldStack.pop();
  }

  return { processedNodes, unpairedBegin, unpairedEnd };
};

/**
 * Processes the combined nodes for fldChar.
 *
 * @param {Array} nodesToCombine - The nodes to combine.
 * @returns {Array} The processed nodes.
 */
export const processCombinedNodesForFldChar = (nodesToCombine = [], instrText) => {
  const instruction = instrText.split(' ')[0];
  let processedNodes = [];

  // If we have a page marker, we need to replace the last node with a page number node.
  if (instruction === 'PAGE') {
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
  else if (instruction === 'NUMPAGES') {
    const totalPageNumNode = {
      name: 'sd:totalPageNumber',
      type: 'element',
    };

    nodesToCombine.forEach((n) => {
      const rPrNode = n.elements.find((el) => el.name === 'w:rPr');
      if (rPrNode) totalPageNumNode.elements = [rPrNode];
    });
    processedNodes.push(totalPageNumNode);
  } else if (instruction === 'PAGEREF') {
    const textStart = nodesToCombine.findIndex((n) =>
      n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'separate'),
    );
    const textEnd = nodesToCombine.findIndex((n) =>
      n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'end'),
    );

    const textNodes = nodesToCombine.slice(textStart + 1, textEnd);
    const pageRefNode = {
      name: 'sd:pageReference',
      type: 'element',
      attributes: {
        instruction: instrText,
      },
      elements: [...(textNodes[0]?.elements || [])],
    };
    processedNodes.push(pageRefNode);
  }

  // If we have a hyperlink, we need to replace the last node with a link node.
  else if (instruction === 'HYPERLINK') {
    const urlMatch = instrText?.match(/HYPERLINK\s+"([^"]+)"/);
    let linkAttributes;
    if (urlMatch && urlMatch.length >= 2) {
      const url = urlMatch[1];
      linkAttributes = { 'w:anchor': url };
    } else {
      const availableSwitches = {
        'w:anchor': 'l "(?<value>.+)"',
        new_window: '\n',
        'w:tgtFrame': '\t "(?<value>.+)"',
        'w:tooltip': 'o "(?<value>.+)"',
      };

      const parsedSwitches = {};

      for (const [key, regex] of Object.entries(availableSwitches)) {
        const match = instrText?.match(new RegExp(regex));
        if (match) {
          parsedSwitches[key] = match.groups?.value || true;
        }
      }

      if (parsedSwitches.new_window) {
        parsedSwitches['w:tgtFrame'] = '_blank';
        delete parsedSwitches.new_window;
      }

      linkAttributes = { ...parsedSwitches };
    }

    const textStart = nodesToCombine.findIndex((n) =>
      n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'separate'),
    );
    const textEnd = nodesToCombine.findIndex((n) =>
      n.elements?.some((el) => el.name === 'w:fldChar' && el.attributes['w:fldCharType'] === 'end'),
    );

    const textNodes = nodesToCombine.slice(textStart + 1, textEnd);

    processedNodes.push({
      name: 'w:hyperlink',
      type: 'element',
      attributes: linkAttributes,
      elements: textNodes,
    });
  } else if (instruction === 'TOC') {
    processedNodes.push({
      name: 'sd:tableOfContents',
      type: 'element',
      attributes: {
        instruction: instrText,
      },
      elements: nodesToCombine,
    });
  } else {
    // Unknown field, just return all nodes as-is
    processedNodes = nodesToCombine;
  }

  return processedNodes;
};
