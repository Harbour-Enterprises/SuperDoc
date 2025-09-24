import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { mergeTextNodes, parseMarks } from '@converter/v2/importer/index.js';
import { twipsToPixels } from '@converter/helpers.js';
import {
  getParagraphIndent,
  getParagraphSpacing,
  getDefaultParagraphStyle,
  preProcessNodesForFldChar,
  parseParagraphBorders,
} from './index.js';

/**
 * Paragraph node handler
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
export const handleParagraphNode = (params) => {
  const { nodes, docx, nodeListHandler, filename } = params;

  const node = carbonCopy(nodes[0]);
  let schemaNode;

  // We need to pre-process paragraph nodes to combine various possible elements we will find ie: lists, links.
  // Also older MS word versions store auto page numbers here
  let processedElements = preProcessNodesForFldChar(node.elements);
  node.elements = processedElements;

  // If it is a standard paragraph node, process normally
  const handleStandardNode = nodeListHandler.handlerEntities.find(
    (e) => e.handlerName === 'standardNodeHandler',
  )?.handler;
  if (!handleStandardNode) {
    console.error('Standard node handler not found');
    return null;
  }

  const updatedParams = { ...params, nodes: [node] };
  const result = handleStandardNode(updatedParams);
  if (result.nodes.length === 1) {
    schemaNode = result.nodes[0];
  }

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  // Extract paragraph borders if present
  const pBdr = pPr?.elements?.find((el) => el.name === 'w:pBdr');
  if (pBdr) {
    const borders = parseParagraphBorders(pBdr);
    if (Object.keys(borders).length) {
      schemaNode.attrs.borders = borders;
    }
  }
  const styleTag = pPr?.elements?.find((el) => el.name === 'w:pStyle');
  const nestedRPr = pPr?.elements?.find((el) => el.name === 'w:rPr');
  const framePr = pPr?.elements?.find((el) => el.name === 'w:framePr');

  if (nestedRPr) {
    let marks = parseMarks(nestedRPr, []);

    if (!schemaNode.content?.length) {
      let highlightIndex = marks?.findIndex((i) => i.type === 'highlight');
      if (highlightIndex !== -1) {
        marks.splice(highlightIndex, 1);
      }
    }

    schemaNode.attrs.marksAttrs = marks;
  }

  let styleId;
  if (styleTag) {
    styleId = styleTag.attributes['w:val'];
    schemaNode.attrs['styleId'] = styleId;
  }

  if (docx) {
    const indent = getParagraphIndent(node, docx, styleId);

    if (!schemaNode.attrs.indent) {
      schemaNode.attrs.indent = {};
    }

    if (indent.left || indent.left === 0) {
      schemaNode.attrs.indent.left = indent.left;
    }
    if (indent.right || indent.right === 0) {
      schemaNode.attrs.indent.right = indent.right;
    }
    if (indent.firstLine || indent.firstLine === 0) {
      schemaNode.attrs.indent.firstLine = indent.firstLine;
    }
    if (indent.hanging || indent.hanging === 0) {
      schemaNode.attrs.indent.hanging = indent.hanging;
    }
    if (indent.textIndent || indent.textIndent === 0) {
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
    const insideTable = (params.path || []).some((ancestor) => ancestor.name === 'w:tc');
    const spacing = getParagraphSpacing(node, docx, styleId, schemaNode.attrs.marksAttrs, {
      insideTable,
    });
    if (spacing) {
      schemaNode.attrs['spacing'] = spacing;
    }
    schemaNode.attrs['rsidRDefault'] = defaultStyleId;
  }

  if (docx) {
    const { justify } = getDefaultParagraphStyle(docx, styleId);
    if (justify) {
      schemaNode.attrs.justify = {
        val: justify['w:val'],
      };
    }
  }

  if (framePr && framePr.attributes['w:dropCap']) {
    schemaNode.attrs.dropcap = {
      type: framePr.attributes['w:dropCap'],
      lines: framePr.attributes['w:lines'],
      wrap: framePr.attributes['w:wrap'],
      hAnchor: framePr.attributes['w:hAnchor'],
      vAnchor: framePr.attributes['w:vAnchor'],
    };
  }

  schemaNode.attrs['filename'] = filename;

  // Parse tab stops
  const tabs = pPr?.elements?.find((el) => el.name === 'w:tabs');
  if (tabs && tabs.elements) {
    const tabStops = tabs.elements
      .filter((el) => el.name === 'w:tab')
      .map((tab) => {
        let val = tab.attributes['w:val'] || 'start';
        // Test files continue to contain "left" and "right" rather than "start" and "end"
        if (val == 'left') {
          val = 'start';
        } else if (val == 'right') {
          val = 'end';
        }
        const rawPos = tab.attributes['w:pos'];
        const tabStop = {
          val,
          pos: twipsToPixels(rawPos),
        };
        if (rawPos !== undefined) {
          tabStop.originalPos = rawPos;
        }

        // Add leader if present
        if (tab.attributes['w:leader']) {
          tabStop.leader = tab.attributes['w:leader'];
        }

        return tabStop;
      });

    if (tabStops.length > 0) {
      schemaNode.attrs.tabStops = tabStops;
    }
  }

  // Normalize text nodes.
  if (schemaNode && schemaNode.content) {
    schemaNode = {
      ...schemaNode,
      content: mergeTextNodes(schemaNode.content),
    };
  }

  // Pass through this paragraph's sectPr, if any
  const sectPr = pPr?.elements?.find((el) => el.name === 'w:sectPr');
  if (sectPr) {
    if (!schemaNode.attrs.paragraphProperties) schemaNode.attrs.paragraphProperties = {};
    schemaNode.attrs.paragraphProperties.sectPr = sectPr;
    schemaNode.attrs.pageBreakSource = 'sectPr';
  }

  return schemaNode;
};
