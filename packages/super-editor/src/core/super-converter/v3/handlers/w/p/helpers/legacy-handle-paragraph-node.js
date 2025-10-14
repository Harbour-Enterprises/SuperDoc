import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { mergeTextNodes, parseMarks } from '@converter/v2/importer/index.js';
import { resolveParagraphProperties } from '@converter/styles';
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';

/**
 * Paragraph node handler
 * @param {import('@translator').SCEncoderConfig} params
 * @returns {Object} Handler result
 */
export const handleParagraphNode = (params) => {
  const { nodes, nodeListHandler, filename } = params;

  const node = carbonCopy(nodes[0]);
  let schemaNode;

  const pPr = node.elements?.find((el) => el.name === 'w:pPr');
  let inlineParagraphProperties = {};
  if (pPr) {
    inlineParagraphProperties = w_pPrTranslator.encode({ ...params, nodes: [pPr] }) || {};
  }

  // Resolve paragraph properties according to styles hierarchy
  const insideTable = (params.path || []).some((ancestor) => ancestor.name === 'w:tc');
  const resolvedParagraphProperties = resolveParagraphProperties(params, inlineParagraphProperties, insideTable);

  // If it is a standard paragraph node, process normally
  const handleStandardNode = nodeListHandler.handlerEntities.find(
    (e) => e.handlerName === 'standardNodeHandler',
  )?.handler;
  if (!handleStandardNode) {
    console.error('Standard node handler not found');
    return null;
  }

  const updatedParams = {
    ...params,
    nodes: [node],
    extraParams: { ...params.extraParams, paragraphProperties: resolvedParagraphProperties },
  };
  const result = handleStandardNode(updatedParams);
  if (result.nodes.length === 1) {
    schemaNode = result.nodes[0];
  }

  // Parse direct run properties (w:rPr) inside w:pPr
  const nestedRPr = pPr?.elements?.find((el) => el.name === 'w:rPr');
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

  // Pull out some commonly used properties to top-level attrs
  schemaNode.attrs.paragraphProperties = inlineParagraphProperties;
  schemaNode.attrs.borders = resolvedParagraphProperties.borders;
  schemaNode.attrs.styleId = resolvedParagraphProperties.styleId;
  schemaNode.attrs.indent = resolvedParagraphProperties.indent;
  schemaNode.attrs.textAlign = resolvedParagraphProperties.justification;
  schemaNode.attrs.keepLines = resolvedParagraphProperties.keepLines;
  schemaNode.attrs.keepNext = resolvedParagraphProperties.keepNext;
  schemaNode.attrs.spacing = resolvedParagraphProperties.spacing;
  schemaNode.attrs.rsidRDefault = node.attributes?.['w:rsidRDefault'];
  schemaNode.attrs.filename = filename;
  schemaNode.attrs.tabStops = resolvedParagraphProperties.tabs;

  // Dropcap settings
  if (resolvedParagraphProperties.framePr && resolvedParagraphProperties.framePr.dropCap) {
    schemaNode.attrs.dropcap = {
      ...resolvedParagraphProperties.framePr,
      type: resolvedParagraphProperties.framePr.dropCap,
    };
    delete schemaNode.attrs.dropcap.dropCap;
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
    schemaNode.attrs.paragraphProperties.sectPr = sectPr;
    schemaNode.attrs.pageBreakSource = 'sectPr';
  }

  return schemaNode;
};
