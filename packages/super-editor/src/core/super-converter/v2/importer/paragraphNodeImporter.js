import { twipsToInches, twipsToPixels, twipsToLines } from '../../helpers.js';
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
  const processedElements = preProcessNodesForFldChar(node.elements);
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
  if (styleTag) {
    schemaNode.attrs['styleId'] = styleTag.attributes['w:val'];
  }

  const indent = pPr?.elements?.find((el) => el.name === 'w:ind');
  if (indent && indent.attributes) {
    const { 'w:left': left, 'w:right': right, 'w:firstLine': firstLine } = indent?.attributes;

    if (schemaNode.attrs) {
      if (!schemaNode.attrs.indent) schemaNode.attrs.indent = {};
      if (left) schemaNode.attrs['indent'].left = twipsToPixels(left);
      if (right) schemaNode.attrs['indent'].right = twipsToPixels(right);
      if (firstLine) schemaNode.attrs['indent'].firstLine = twipsToPixels(firstLine);
    }

    const textIndentVal = left || firstLine || 0;
    schemaNode.attrs['textIndent'] = `${twipsToInches(textIndentVal)}in`;
  }

  const justify = pPr?.elements?.find((el) => el.name === 'w:jc');
  if (justify && justify.attributes) {
    schemaNode.attrs['textAlign'] = justify.attributes['w:val'];
  }

  if (docx) {
    const defaultStyleId = node.attributes?.['w:rsidRDefault'];
    schemaNode.attrs['spacing'] = getParagraphSpacing(node, docx);
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

export const getParagraphSpacing = (node, docx) => {
  // Check if we have default paragraph styles to override
  const spacing = {
    lineSpaceAfter: 0,
    lineSpaceBefore: 0,
    line: 0,
    lineRule: null,
  }

  const { spacing: pDefaultSpacing = {} } = getDefaultParagraphStyle(docx);
  let lineSpaceAfter, lineSpaceBefore, line, lineRuleStyle;

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  const inLineSpacingTag = pPr?.elements?.find((el) => el.name === 'w:spacing');
  const inLineSpacing = inLineSpacingTag?.attributes || {};

  // These styles are taken in order of precedence
  // 1. Inline spacing
  // 2. Default style spacing
  // 3. Default paragraph spacing
  const lineSpacing = inLineSpacing?.['w:line'] || line || pDefaultSpacing?.['w:line'];
  if (lineSpacing) spacing.line = twipsToLines(lineSpacing);

  const beforeSpacing = inLineSpacing?.['w:before'] || lineSpaceBefore || pDefaultSpacing?.['w:before'];
  if (beforeSpacing) spacing.lineSpaceBefore = twipsToPixels(beforeSpacing);

  const afterSpacing = inLineSpacing?.['w:after'] || lineSpaceAfter || pDefaultSpacing?.['w:after'];
  if (afterSpacing) spacing.lineSpaceAfter = twipsToPixels(afterSpacing);

  const lineRule = inLineSpacing?.['w:lineRule'] || lineRuleStyle || pDefaultSpacing?.['w:lineRule'];
  if (lineRule) spacing.lineRule = lineRule;

  return spacing;
};

const getDefaultParagraphStyle = (docx) => {
  const styles = docx['word/styles.xml'];
  if (!styles) {
    return {};
  }
  const defaults = styles.elements[0].elements?.find((el) => el.name === 'w:docDefaults');
  const pDefault = defaults.elements.find((el) => el.name === 'w:pPrDefault');
  const pPrDefault = pDefault?.elements?.find((el) => el.name === 'w:pPr');
  const pPrDefaultSpacingTag = pPrDefault?.elements?.find((el) => el.name === 'w:spacing') || {};
  const { attributes: pPrDefaultSpacingAttr } = pPrDefaultSpacingTag;

  return {
    spacing: pPrDefaultSpacingAttr,
  }
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
  const processedNodes = [];
  const nodesToCombine = [];
  let isCombiningNodes = false;
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
      const instrText = nodesToCombine.find((n) => n.elements?.some((el) => el.name === 'w:instrText'))?.elements[0]
        ?.elements[0].text;
      const urlMatch = instrText?.match(/HYPERLINK\s+"([^"]+)"/);

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
