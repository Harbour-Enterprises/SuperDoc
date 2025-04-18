import { twipsToInches, twipsToLines, twipsToPixels, twipsToPt } from '../../helpers.js';
import { testForList } from './listImporter.js';
import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { mergeTextNodes } from './mergeTextNodes.js';
import { parseMarks } from './markImporter.js';
import { kebabCase } from '@harbour-enterprises/common';

/**
 * Special cases of w:p based on paragraph properties
 *
 * If we detect a list node, we need to get all nodes that are also lists and process them together
 * in order to combine list item nodes into list nodes.
 *
 * @type {import("docxImporter").NodeHandler}
 */
export const handleParagraphNode = (params) => {
  const { nodes, docx, nodeListHandler, filename } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:p') {
    return { nodes: [], consumed: 0 };
  }

  const node = carbonCopy(nodes[0]);

  let schemaNode;

  // We need to pre-process paragraph nodes to combine various possible elements we will find ie: lists, links.
  // Also older MS word versions store auto page numbers here
  let processedElements = preProcessNodesForFldChar(node.elements);
  node.elements = processedElements;

  // Check if this paragraph node is a list
  if (testForList(node)) {
    return { nodes: [], consumed: 0 };
  }

  // If it is a standard paragraph node, process normally
  const handleStandardNode = nodeListHandler.handlerEntities.find(
    (e) => e.handlerName === 'standardNodeHandler',
  )?.handler;
  if (!handleStandardNode) {
    console.error('Standard node handler not found');
    return { nodes: [], consumed: 0 };
  }

  const updatedParams = {...params, nodes: [node]};
  const result = handleStandardNode(updatedParams);
  if (result.nodes.length === 1) {
    schemaNode = result.nodes[0];
  }

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const styleTag = pPr?.elements?.find((el) => el.name === 'w:pStyle');
  const nestedRPr = pPr?.elements?.find((el) => el.name === 'w:rPr');
  
  if (nestedRPr) {
    schemaNode.attrs.marksAttrs = parseMarks(nestedRPr, []);
  }
  
  if (styleTag) {
    schemaNode.attrs['styleId'] = styleTag.attributes['w:val'];
  }
  
  if (docx) {
    const indent = getParagraphIndent(node, docx, schemaNode.attrs['styleId']);

    if (!schemaNode.attrs.indent) {
      schemaNode.attrs.indent = {};
    }

    if (indent.left) {
      schemaNode.attrs.indent.left = indent.left;
    }
    if (indent.right) {
      schemaNode.attrs.indent.right = indent.right;
    }
    if (indent.firstLine) {
      schemaNode.attrs.indent.firstLine = indent.firstLine;
    }
    if (indent.hanging) {
      schemaNode.attrs.indent.hanging = indent.hanging;
    }
    if (indent.textIndent) {
      schemaNode.attrs.textIndent = `${indent.textIndent}in`;
    }
  }

  const justify = pPr?.elements?.find((el) => el.name === 'w:jc');
  if (justify && justify.attributes) {
    schemaNode.attrs['textAlign'] = justify.attributes['w:val'];
  }
  
  const keepLines = pPr?.elements?.find((el) => el.name === 'w:keepLines');
  if (keepLines && keepLines.attributes) {
    schemaNode.attrs['keepLines'] = keepLines.attributes['w:val'];
  }

  const keepNext = pPr?.elements?.find((el) => el.name === 'w:keepNext');
  if (keepNext && keepNext.attributes) {
    schemaNode.attrs['keepNext'] = keepNext.attributes['w:val'];
  }

  if (docx) {
    const defaultStyleId = node.attributes?.['w:rsidRDefault'];
    schemaNode.attrs['spacing'] = getParagraphSpacing(node, docx, schemaNode.attrs['styleId'], schemaNode.attrs.marksAttrs);
    schemaNode.attrs['rsidRDefault'] = defaultStyleId;
  }

  schemaNode.attrs['filename'] = filename;

  // Normalize text nodes.
  if (schemaNode && schemaNode.content) {
    schemaNode = {
      ...schemaNode,
      content: mergeTextNodes(schemaNode.content),
    };
  }

  return { nodes: schemaNode ? [schemaNode] : [], consumed: 1 };
};

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

export const getParagraphSpacing = (node, docx, styleId = '', marks = []) => {
  // Check if we have default paragraph styles to override
  const spacing = {
    lineSpaceAfter: 0,
    lineSpaceBefore: 0,
    line: 0,
    lineRule: null,
  }
  
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
    spacing.lineSpaceBefore += Math.round((parseInt(fontSize) * 0.5) * 96 / 72);
  }

  const afterSpacing = inLineSpacing?.['w:after'] || lineSpaceAfter || pDefaultSpacing?.['w:after'];
  if (afterSpacing) spacing.lineSpaceAfter = twipsToPixels(afterSpacing);

  const afterAutospacing = inLineSpacing?.['w:afterAutospacing'];
  if (afterAutospacing === '1' && fontSize) {
    spacing.lineSpaceAfter += Math.round((parseInt(fontSize) * 0.5) * 96 / 72);
  }

  return spacing;
};

const getDefaultParagraphStyle = (docx, styleId = '') => {
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
  const stylesNormal = styles.elements[0].elements?.find((el) => el.name === 'w:style' && el.attributes['w:styleId'] === 'Normal');
  const pPrNormal = stylesNormal?.elements?.find((el) => el.name === 'w:pPr');
  const pPrNormalSpacingTag = pPrNormal?.elements?.find((el) => el.name === 'w:spacing') || {};
  const pPrNormalIndentTag = pPrNormal?.elements?.find((el) => el.name === 'w:ind') || {};
  
  // Styles based on styleId
  let pPrStyleIdSpacingTag = {};
  let pPrStyleIdIndentTag = {};
  if (styleId) {
    const stylesById = styles.elements[0].elements?.find((el) => el.name === 'w:style' && el.attributes['w:styleId'] === styleId);
    const pPrById = stylesById?.elements?.find((el) => el.name === 'w:pPr');
    pPrStyleIdSpacingTag = pPrById?.elements?.find((el) => el.name === 'w:spacing') || {};
    pPrStyleIdIndentTag = pPrById?.elements?.find((el) => el.name === 'w:ind') || {};
  }
  
  const { attributes: pPrDefaultSpacingAttr } = pPrDefaultSpacingTag;
  const { attributes: pPrNormalSpacingAttr } = pPrNormalSpacingTag;
  const { attributes: pPrByIdSpacingAttr } = pPrStyleIdSpacingTag;

  const { attributes: pPrDefaultIndentAttr } = pPrDefaultIndentTag;
  const { attributes: pPrNormalIndentAttr } = pPrNormalIndentTag;
  const { attributes: pPrByIdIndentAttr } = pPrStyleIdIndentTag;

  return {
    spacing: pPrByIdSpacingAttr || pPrDefaultSpacingAttr || pPrNormalSpacingAttr,
    indent: pPrByIdIndentAttr || pPrDefaultIndentAttr || pPrNormalIndentAttr,
  };
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const paragraphNodeHandlerEntity = {
  handlerName: 'paragraphNodeHandler',
  handler: handleParagraphNode,
};

/**
 * @param {string} defaultStyleId
 * @param {ParsedDocx} docx
 */
export function getDefaultStyleDefinition(defaultStyleId, docx) {
  const result = { lineSpaceBefore: null, lineSpaceAfter: null };
  if (!defaultStyleId) return result;

  const styles = docx['word/styles.xml'];
  if (!styles) return result;

  const { elements } = styles.elements[0];
  const elementsWithId = elements.filter((el) => {
    const { attributes } = el;
    return attributes && attributes['w:styleId'] === defaultStyleId;
  });

  const firstMatch = elementsWithId[0];
  if (!firstMatch) return result;

  const qFormat = elementsWithId.find((el) => {
    const qFormat = el.elements.find((innerEl) => innerEl.name === 'w:qFormat');
    return qFormat;
  });

  const name = elementsWithId.find(el =>
    el.elements.some(inner => inner.name === 'w:name')
  )?.elements.find(inner => inner.name === 'w:name')?.attributes['w:val'];

  // pPr
  const pPr = firstMatch.elements.find((el) => el.name === 'w:pPr');
  const spacing = pPr?.elements?.find((el) => el.name === 'w:spacing');
  const justify = pPr?.elements?.find((el) => el.name === 'w:jc');
  const indent = pPr?.elements?.find((el) => el.name === 'w:ind');

  let lineSpaceBefore, lineSpaceAfter, line;
  if (spacing) {
    lineSpaceBefore = twipsToPixels(spacing?.attributes['w:before']);
    lineSpaceAfter = twipsToPixels(spacing?.attributes['w:after']);
    line = twipsToLines(spacing?.attributes['w:line']);
  };

  let textAlign, leftIndent, rightIndent, firstLine;
  if (indent) {
    textAlign = justify?.attributes['w:val'];
    leftIndent = twipsToPixels(indent?.attributes['w:left']);
    rightIndent = twipsToPixels(indent?.attributes['w:right']);
    firstLine = twipsToPixels(indent?.attributes['w:firstLine']);
  };

  const keepNext = pPr?.elements?.find((el) => el.name === 'w:keepNext');
  const keepLines = pPr?.elements?.find((el) => el.name === 'w:keepLines');

  const outlineLevel = pPr?.elements?.find((el) => el.name === 'w:outlineLvl');
  const outlineLvlValue = outlineLevel?.attributes['w:val'];

  const pageBreakBefore = pPr?.elements?.find((el) => el.name === 'w:pageBreakBefore');
  let pageBreakBeforeVal = 0;
  if (pageBreakBefore) {
     if (!pageBreakBefore.attributes?.['w:val']) pageBreakBeforeVal = 1;
     else pageBreakBeforeVal = Number(pageBreakBefore?.attributes?.['w:val'])
  };
  const pageBreakAfter = pPr?.elements?.find((el) => el.name === 'w:pageBreakAfter');
  let pageBreakAfterVal;
  if (pageBreakAfter) {
    if (!pageBreakAfter.attributes?.['w:val']) pageBreakAfterVal = 1;
    else pageBreakAfterVal = Number(pageBreakAfter?.attributes?.['w:val'])
 };

  const parsedAttrs = {
    name,
    qFormat: qFormat ? true : false,
    keepNext: keepNext ? true : false,
    keepLines: keepLines ? true : false,
    outlineLevel: outlineLevel ? parseInt(outlineLvlValue) : null,
    pageBreakBefore: pageBreakBeforeVal ? true : false,
    pageBreakAfter: pageBreakAfterVal ? true : false,
  };

  // rPr
  const rPr = firstMatch.elements.find((el) => el.name === 'w:rPr');
  const parsedMarks = parseMarks(rPr, [], docx) || {};
  const parsedStyles = {
    spacing: { lineSpaceAfter, lineSpaceBefore, line },
    textAlign,
    indent: { leftIndent, rightIndent, firstLine },
  };

  parsedMarks.forEach((mark) => {
    const { type, attrs } = mark;
    if (type === 'textStyle') {
      Object.entries(attrs).forEach(([key, value]) => {
        parsedStyles[kebabCase(key)] = value
      });
      return;
    };

    parsedStyles[type] = attrs;
  });

  // pPr marks 
  return {
    attrs: parsedAttrs,
    styles: parsedStyles,
  };
}

/**
 * We need to pre-process nodes in a paragraph to combine nodes together where necessary ie: links
 * TODO: Likely will find more w:fldChar to deal with.
 *
 * @param {XmlNode[]} nodes
 * @returns
 */
export function preProcessNodesForFldChar(nodes) {
  let processedNodes = [];
  const nodesToCombine = [];
  let isCombiningNodes = false;
  let hasPageMarker = false;
  nodes?.forEach((n) => {
    const fldChar = n.elements?.find((el) => el.name === 'w:fldChar');
    if (fldChar) {
      const fldType = fldChar.attributes['w:fldCharType'];
      if (fldType === 'begin') {
        isCombiningNodes = true;
        nodesToCombine.push(n);
      } else if (fldType === 'end') {
        nodesToCombine.push(n);
        isCombiningNodes = false;
      }
    } else {
      processedNodes.push(n);
    }

    if (isCombiningNodes) {
      nodesToCombine.push(n);
    } else if (!isCombiningNodes && nodesToCombine.length) {
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
      const instrText = instrTextNode.elements[0].text;

      if (!hasPageMarker) hasPageMarker = instrText?.includes('PAGE');
      const urlMatch = instrText?.match(/HYPERLINK\s+"([^"]+)"/);

      // If we have a page marker, we need to replace the last node with a page number node.
      if (hasPageMarker) {
        processedNodes = processedNodes.filter((n) => n.name !== 'w:r');
        processedNodes.push({
          name: 'sd:autoPageNumber',
          type: 'element',
        });
        return [];
      }

      if (!urlMatch || urlMatch?.length < 2) return [];
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
  });

  return processedNodes;
}
