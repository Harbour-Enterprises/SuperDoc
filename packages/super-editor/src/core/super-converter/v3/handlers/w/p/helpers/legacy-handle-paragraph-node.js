import { carbonCopy } from '@core/utilities/carbonCopy.js';
import { mergeTextNodes } from '@converter/v2/importer/index.js';
import { resolveParagraphProperties } from '@converter/styles';
import { translator as w_pPrTranslator } from '@converter/v3/handlers/w/pPr';

function getTableStyleId(path) {
  const tbl = path.find((ancestor) => ancestor.name === 'w:tbl');
  if (!tbl) {
    return;
  }
  const tblPr = tbl.elements?.find((child) => child.name === 'w:tblPr');
  if (!tblPr) {
    return;
  }
  const tblStyle = tblPr.elements?.find((child) => child.name === 'w:tblStyle');
  if (!tblStyle) {
    return;
  }
  return tblStyle.attributes?.['w:val'];
}

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
  const tableStyleId = getTableStyleId(params.path || []);
  const resolvedParagraphProperties = resolveParagraphProperties(params, inlineParagraphProperties, insideTable, false, tableStyleId);

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
  schemaNode.type = 'paragraph';

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
  schemaNode.attrs.tabStops = resolvedParagraphProperties.tabStops;
  schemaNode.attrs.numberingProperties = resolvedParagraphProperties.numberingProperties;

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
