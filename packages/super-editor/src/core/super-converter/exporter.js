import he from 'he';
import { DOMParser as PMDOMParser } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { SuperConverter } from './SuperConverter.js';
import { toKebabCase } from '@harbour-enterprises/common';
import {
  emuToPixels,
  inchesToTwips,
  linesToTwips,
  pixelsToEightPoints,
  pixelsToEmu,
  pixelsToTwips,
} from './helpers.js';
import { generateDocxRandomId } from '@helpers/generateDocxRandomId.js';
import { DEFAULT_DOCX_DEFS } from './exporter-docx-defs.js';
import { TrackDeleteMarkName, TrackInsertMarkName, TrackFormatMarkName } from '@extensions/track-changes/constants.js';
import { translateCommentNode } from './v2/exporter/commentsExporter.js';
import { marks } from 'prosemirror-schema-basic';

/**
 * @typedef {Object} ExportParams
 * @property {Object} node JSON node to translate (from PM schema)
 * @property {Object} bodyNode The stored body node to restore, if available
 * @property {Object[]} relationships The relationships to add to the document
 */

/**
 * @typedef {Object} SchemaNode
 * @property {string} type The name of this node from the prose mirror schema
 * @property {Array<SchemaNode>} content The child nodes
 * @property {Object} attrs The node attributes
 * /

/**
 * @typedef {Object} XmlReadyNode
 * @property {string} name The XML tag name
 * @property {Array<XmlReadyNode>} elements The child nodes
 * @property {Object} attributes The node attributes
 */

/**
 * @typedef {Object.<string, *>} SchemaAttributes
 * Key value pairs representing the node attributes from prose mirror
 */

/**
 * @typedef {Object.<string, *>} XmlAttributes
 * Key value pairs representing the node attributes to export to XML format
 */

/**
 * @typedef {Object} MarkType
 * @property {string} type The mark type
 * @property {Object} attrs Any attributes for this mark
 */

/**
 * Main export function. It expects the prose mirror data as JSON (ie: a doc node)
 *
 * @param {ExportParams} params - The parameters object, containing a node and possibly a body node
 * @returns {XmlReadyNode} The complete document node in XML-ready format
 */
export function exportSchemaToJson(params) {
  // console.debug('\nExporting schema to JSON:', params.node, '\n');
  const { type } = params.node || {};

  // Node handlers for each node type that we can export
  const router = {
    doc: translateDocumentNode,
    body: translateBodyNode,
    paragraph: translateParagraphNode,
    text: translateTextNode,
    bulletList: translateList,
    orderedList: translateList,
    lineBreak: translateLineBreak,
    table: translateTable,
    tableRow: translateTableRow,
    tableCell: translateTableCell,
    bookmarkStart: translateBookmarkStart,
    fieldAnnotation: translateFieldAnnotation,
    tab: translateTab,
    image: translateImageNode,
    hardBreak: translateHardBreak,
    commentRangeStart: () => translateCommentNode(params, 'Start'),
    commentRangeEnd: () => translateCommentNode(params, 'End'),
    commentReference: () => null,
  };

  if (!router[type]) {
    console.error('No translation function found for node type:', type);
    return null;
  }

  // Call the handler for this node type
  return router[type](params);
}

/**
 * There is no body node in the prose mirror schema, so it is stored separately
 * and needs to be restored here.
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} JSON of the XML-ready body node
 */
function translateBodyNode(params) {
  const sectPr = params.bodyNode?.elements.find((n) => n.name === 'w:sectPr') || {};

  if (params.converter) {
    const newMargins = params.converter.pageStyles.pageMargins;
    const sectPrMargins = sectPr.elements.find((n) => n.name === 'w:pgMar');
    const { attributes } = sectPrMargins;
    Object.entries(newMargins).forEach(([key, value]) => {
      const convertedValue = inchesToTwips(value);
      attributes[`w:${key}`] = convertedValue;
    });
    sectPrMargins.attributes = attributes;
  };

  const elements = translateChildNodes(params);
  return {
    name: 'w:body',
    elements: [...elements, sectPr],
  };
}

/**
 * Translate a paragraph node
 *
 * @param {ExportParams} node A prose mirror paragraph node
 * @returns {XmlReadyNode} JSON of the XML-ready paragraph node
 */
export function translateParagraphNode(params) {
  const elements = translateChildNodes(params);

  // Replace current paragraph with content of html annotation
  const htmlAnnotationChild = elements.find((element) => element.name === 'htmlAnnotation');
  if (elements.length === 1 && htmlAnnotationChild) {
    return htmlAnnotationChild.elements;
  }

  // Insert paragraph properties at the beginning of the elements array
  const pPr = generateParagraphProperties(params.node);
  if (pPr) elements.unshift(pPr);

  let attributes = {};
  if (params.node.attrs?.rsidRDefault) {
    attributes['w:rsidRDefault'] = params.node.attrs.rsidRDefault;
  }

  return {
    name: 'w:p',
    elements,
    attributes,
  };
}

/**
 * Generate the w:pPr props for a paragraph node
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The paragraph properties node
 */
function generateParagraphProperties(node) {
  const { attrs = {} } = node;

  const pPrElements = [];

  const { styleId } = attrs;
  if (styleId) pPrElements.push({ name: 'w:pStyle', attributes: { 'w:val': styleId } });

  const { spacing, indent, textAlign } = attrs;
  if (spacing) {
    const { lineSpaceBefore, lineSpaceAfter, line, lineRule } = spacing;

    const attributes = {};

    // Zero values have to be considered in export to maintain accurate line height
    if (lineSpaceBefore >= 0) attributes['w:before'] = pixelsToTwips(lineSpaceBefore);
    if (lineSpaceAfter >= 0) attributes['w:after'] = pixelsToTwips(lineSpaceAfter);
    if (line) attributes['w:line'] = linesToTwips(line);
    attributes['w:lineRule'] = lineRule || "auto";

    const spacingElement = {
      name: 'w:spacing',
      attributes,
    };
    pPrElements.push(spacingElement);
  }

  if (indent) {
    const { left, right, firstLine } = indent;
    const attributes = {};
    if (left || left === 0) attributes['w:left'] = pixelsToTwips(left);
    if (right || right === 0) attributes['w:right'] = pixelsToTwips(right);
    if (firstLine || firstLine === 0) attributes['w:firstLine'] = pixelsToTwips(firstLine);

    const indentElement = {
      name: 'w:ind',
      attributes,
    };
    pPrElements.push(indentElement);
  }

  if (textAlign) {
    const textAlignElement = {
      name: 'w:jc',
      attributes: { 'w:val': textAlign },
    };
    pPrElements.push(textAlignElement);
  }
  
  if (!pPrElements.length) return null;
  
  return {
    name: 'w:pPr',
    elements: pPrElements,
  };
}

/**
 * Translate a document node
 *
 * @param {ExportParams} params The parameters object
 * @returns {XmlReadyNode} JSON of the XML-ready document node
 */
function translateDocumentNode(params) {
  const bodyNode = {
    type: 'body',
    content: params.node.content,
  };

  const translatedBodyNode = exportSchemaToJson({ ...params, node: bodyNode });
  const node = {
    name: 'w:document',
    elements: [translatedBodyNode],
    attributes: DEFAULT_DOCX_DEFS,
  };

  return [node, params];
}

/**
 * The attributes to flatten and prepare for XML
 *
 * @param {SchemaAttributes} attrs
 * @returns {XmlAttributes} The processed attributes
 */
function processAttributes(attrs) {
  let processedAttrs = {};
  if (!attrs) return processedAttrs;

  Object.keys(attrs).forEach((key) => {
    const value = attrs[key];
    if (!value) return;

    let newAttr = {};
    if (value instanceof Object) newAttr = processAttributes(value);
    else newAttr[toKebabCase(key)] = value;
    processedAttrs = { ...processedAttrs, ...newAttr };
  });
  return processedAttrs;
}

/**
 * Process child nodes, ignoring any that are not valid
 *
 * @param {SchemaNode[]} nodes The input nodes
 * @returns {XmlReadyNode[]} The processed child nodes
 */
function translateChildNodes(params) {
  const { content: nodes } = params.node;
  if (!nodes) return [];

  const translatedNodes = [];
  nodes.forEach((node) => {
    const translatedNode = exportSchemaToJson({ ...params, node });
    if (translatedNode instanceof Array) translatedNodes.push(...translatedNode);
    else translatedNodes.push(translatedNode);
  });

  // Filter out any null nodes
  return translatedNodes.filter((n) => n);
}

/**
 * Helper function to be used for text node translation
 * Also used for transforming text annotations for the final submit
 *
 * @param {String} text Text node's content
 * @param {Object[]} marks The marks to add to the run properties
 * @returns {XmlReadyNode} The translated text node
 */

function getTextNodeForExport(text, marks) {
  const hasLeadingOrTrailingSpace = /^\s|\s$/.test(text);
  const space = hasLeadingOrTrailingSpace ? 'preserve' : null;
  const nodeAttrs = space ? { 'xml:space': space } : null;

  const outputMarks = processOutputMarks(marks);
  const textNode = {
    name: 'w:t',
    elements: [{ text, type: 'text' }],
    attributes: nodeAttrs,
  };
  
  return wrapTextInRun(textNode, outputMarks);
}

/**
 * Translate a text node or link node.
 * Link nodes look the same as text nodes but with a link attr.
 * Also, tracked changes are text marks so those need to be separated here.
 * We need to check here and re-route as necessary
 *
 * @param {ExportParams} params The text node to translate
 * @param {SchemaNode} params.node The text node from prose mirror
 * @returns {XmlReadyNode} The translated text node
 */
function translateTextNode(params) {
  const { node } = params;

  // Separate tracked changes from regular text
  const trackedMarks = [TrackInsertMarkName, TrackDeleteMarkName];
  const isTrackedNode = node.marks?.some((m) => trackedMarks.includes(m.type));
  if (isTrackedNode) return translateTrackedNode(params);

  // Separate links from regular text
  const isLinkNode = node.marks?.some((m) => m.type === 'link');
  if (isLinkNode) return translateLinkNode(params);

  const { text, marks = [] } = node;

  return getTextNodeForExport(text, marks);
}

function createTrackStyleMark(marks) {
  const trackStyleMark = marks.find((mark) => mark.type === TrackFormatMarkName);
  if (trackStyleMark) {
    const markElement = {
      type: 'element',
      name: 'w:rPrChange',
      attributes: {
        'w:id': trackStyleMark.attrs.id,
        'w:author': trackStyleMark.attrs.author,
        'w:authorEmail': trackStyleMark.attrs.authorEmail,
        'w:date': trackStyleMark.attrs.date,
      },
      elements: trackStyleMark.attrs.before.map((mark) => processOutputMarks(mark)).filter((r) => r !== undefined),
    };
    return markElement;
  }
  return undefined;
}

function translateTrackedNode(params) {
  const { node } = params;
  const marks = node.marks;
  const trackingMarks = [TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName];
  const trackedMark = marks.find((m) => trackingMarks.includes(m.type));
  const isInsert = trackedMark.type === TrackInsertMarkName;

  // Remove marks that we aren't exporting and add style mark if present
  const trackStyleMark = createTrackStyleMark(marks);
  node.marks = marks.filter((m) => !trackingMarks.includes(m.type));
  if (trackStyleMark) {
    node.marks.push(trackStyleMark);
  }

  const translatedTextNode = exportSchemaToJson({ ...params, node });

  // If this is not an insert, we need to change the text node name
  if (!isInsert) {
    const textNode = translatedTextNode.elements.find((n) => n.name === 'w:t');
    textNode.name = 'w:delText';
  }

  const trackedNode = {
    name: isInsert ? 'w:ins' : 'w:del',
    type: 'element',
    attributes: {
      'w:id': trackedMark.attrs.id,
      'w:author': trackedMark.attrs.author,
      'w:authorEmail': trackedMark.attrs.authorEmail,
      'w:date': trackedMark.attrs.date,
    },
    elements: [translatedTextNode],
  };

  return trackedNode;
}

/**
 * Wrap a text node in a run
 *
 * @param {XmlReadyNode} node
 * @returns {XmlReadyNode} The wrapped run node
 */
function wrapTextInRun(node, marks) {
  const elements = [node];
  if (marks && marks.length) elements.unshift(generateRunProps(marks));
  return {
    name: 'w:r',
    elements,
  };
}

/**
 * Generate a w:rPr node (run properties) from marks
 *
 * @param {Object[]} marks The marks to add to the run properties
 * @returns
 */
function generateRunProps(marks = []) {
  return {
    name: 'w:rPr',
    elements: marks,
  };
}

/**
 * Get all marks as a list of MarkType objects
 *
 * @param {MarkType[]} marks
 * @returns
 */
function processOutputMarks(marks = []) {
  return marks.flatMap((mark) => {
    if (mark.type === 'textStyle') {
      return Object.entries(mark.attrs)
        .filter(([key, value]) => value)
        .map(([key, value]) => {
          const unwrappedMark = { type: key, attrs: mark.attrs };
          return translateMark(unwrappedMark);
        });
    } else {
      return translateMark(mark);
    }
  });
}

/**
 * Translate link node. This is a special case because it requires adding a new relationship.
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated link node
 */
function translateLinkNode(params) {
  const { node } = params;

  const linkMark = node.marks.find((m) => m.type === 'link');
  const link = linkMark.attrs.href;
  let rId = linkMark.attrs.rId;
  if (!rId) {
    rId = addNewLinkRelationship(params, link);
  }

  node.marks = node.marks.filter((m) => m.type !== 'link');
  const outputNode = exportSchemaToJson({ ...params, node });
  const newNode = {
    name: 'w:hyperlink',
    type: 'element',
    attributes: {
      'r:id': rId,
    },
    elements: [outputNode],
  };

  return newNode;
}

/**
 * Create a new link relationship and add it to the relationships array
 *
 * @param {ExportParams} params
 * @param {string} link The URL of this link
 * @returns {string} The new relationship ID
 */
function addNewLinkRelationship(params, link) {
  const newId = 'rId' + generateDocxRandomId();
  params.relationships.push({
    type: 'element',
    name: 'Relationship',
    attributes: {
      Id: newId,
      Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
      Target: link,
      TargetMode: 'External',
    },
  });
  return newId;
}

/**
 * Create a new image relationship and add it to the relationships array
 *
 * @param {ExportParams} params
 * @param {string} imagePath The path to the image
 * @returns {string} The new relationship ID
 */
function addNewImageRelationship(params, imagePath) {
  const newId = 'rId' + generateDocxRandomId();
  params.relationships.push({
    type: 'element',
    name: 'Relationship',
    attributes: {
      Id: newId,
      Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      Target: imagePath,
    },
  });
  return newId;
}

/**
 * Translate a list node
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated list node
 */
function translateList(params) {
  const { content, type } = params.node;
  const flatContent = flattenContent(content);

  const listNodes = [];
  flatContent.forEach((listNode) => {
    const { content, level } = listNode;
    content.forEach((contentNode) => {
      // Get paragraph attributes which were attached to list item node
      const paragraphNode = Object.assign({}, contentNode);
      paragraphNode.attrs = {
        ...paragraphNode.attrs,
        ...listNode.attrs
      };
      
      const outputNode = exportSchemaToJson({ ...params, node: paragraphNode });
      const propsElementIndex = outputNode.elements.findIndex((e) => e.name === 'w:pPr');
      
      const listProps = getListParagraphProperties(listNode, level, type, propsElementIndex > -1);
      const content = outputNode.elements.filter((e) => e.name !== 'w:pPr');
      
      if (!content.length) {
        // Some empty nodes could have spacing defined
        const spacingProp = outputNode.elements[propsElementIndex]?.elements.find((e) => e.name === 'w:spacing');
        const elements = spacingProp ? [{
          name: 'w:pPr',
          type: 'element',
          elements: [spacingProp],
        }] : [];

        const spacer = { 
          name: 'w:p',
          type: 'element',
          elements
        };
        return listNodes.push(spacer);
      }
      if (propsElementIndex === -1) {
        outputNode.elements.unshift(listProps);
      } else {
        outputNode.elements[propsElementIndex].elements.push(listProps);
      }
      
      listNodes.push(outputNode);
    });
  });
  
  return listNodes;
}

/**
 * Get the paragraph properties for a list
 *
 * @param {SchemaNode} node The list node
 * @param {number} level The list level
 * @param {string} type The list type
 * @param {boolean} hasParentProps Does output node already have pPr
 * @returns {XmlReadyNode} The list paragraph properties node
 */
function getListParagraphProperties(node, level, type, hasParentProps) {
  let listType = type === 'bulletList' ? 1 : 2;

  // numbering.xml reference
  if (node.attrs.numId) listType = node.attrs.numId;
  
  const numPr = {
    name: 'w:numPr',
    type: 'element',
    elements: [
      {
        name: 'w:ilvl',
        type: 'element',
        attributes: { 'w:val': level },
      },
      {
        name: 'w:numId',
        type: 'element',
        attributes: { 'w:val': listType },
      },
    ],
  };
  
  if (hasParentProps) {
    return numPr;
  }
  
  return {
    name: 'w:pPr',
    type: 'element',
    elements: [numPr],
  };
}

/**
 * Flatten list nodes for processing.
 *
 * @param {SchemaNode[]} content List of list nodes
 * @returns {SchemaNode[]} The flattened list nodes
 */
function flattenContent(content) {
  const flatContent = [];

  function recursiveFlatten(items, level = 0) {
    if (!items || !items.length) return;
    items.forEach((item) => {
      const subList = item.content.filter((c) => c.type === 'bulletList' || c.type === 'orderedList');
      const notLists = item.content.filter((c) => c.type !== 'bulletList' && c.type !== 'orderedList');

      const newItem = { ...item, content: notLists };
      newItem.level = level;
      flatContent.push(newItem);

      if (subList.length) {
        recursiveFlatten(subList[0].content, level + 1);
      }
    });
  }

  recursiveFlatten(content);
  return flatContent;
}

/**
 * Translate a line break node
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode}
 */
function translateLineBreak(params) {
  const attributes = {};

  const { lineBreakType } = params.node?.attrs || {};
  if (lineBreakType) {
    attributes['w:type'] = lineBreakType;
  }

  return {
    name: 'w:br',
    attributes,
  };
}

/**
 * Translate a table node
 *
 * @param {ExportParams} params The table node to translate
 * @returns {XmlReadyNode} The translated table node
 */
function translateTable(params) {
  params.node = preProcessVerticalMergeCells(params.node, params);
  const elements = translateChildNodes(params);
  const tableProperties = generateTableProperties(params.node);
  const gridProperties = generateTableGrid(params.node);

  elements.unshift(tableProperties);
  elements.unshift(gridProperties);
  return {
    name: 'w:tbl',
    elements,
  };
}

/**
 * Restore vertically merged cells from a table
 * @param {ExportParams.node} table The table node
 * @returns {ExportParams.node} The table node with merged cells restored
 */
function preProcessVerticalMergeCells(table, { editorSchema }) {
  const { content } = table;
  for (let rowIndex = 0; rowIndex < content.length; rowIndex++) {
    const row = content[rowIndex];
    if (!row.content) continue;
    for (let cellIndex = 0; cellIndex < row.content?.length; cellIndex++) {
      const cell = row.content[cellIndex];
      if (!cell) {
        console.log('no cell');
        continue;
      }
      const { attrs } = cell;
      if (attrs.rowspan > 1) {
        // const { mergedCells } = attrs;
        const rowsToChange = content.slice(rowIndex + 1, rowIndex + attrs.rowspan);
        const mergedCell = {
          type: cell.type,
          content: [
            // cells must end with a paragraph
            editorSchema.nodes.paragraph.createAndFill().toJSON(),
          ],
          attrs: {
            ...cell.attrs,
            // reset colspan and rowspan
            colspan: null,
            rowspan: null,
            // to add vMerge
            continueMerge: true,
          },
        };

        rowsToChange.forEach((rowToChange, mergedIndex) => {
          rowToChange.content.splice(cellIndex, 0, mergedCell);
        });
      }
    }
  }
  return table;
}

function translateTab(params) {
  const attributes = {};

  const { marks = [] } = params.node;

  const outputMarks = processOutputMarks(marks);
  const tabNode = {
    name: 'w:tab',
  };

  return wrapTextInRun(tabNode, outputMarks);
}

/**
 * Generate w:tblPr properties node for a table
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The table properties node
 */
function generateTableProperties(node) {
  const elements = [];

  const { attrs } = node;
  const { tableWidth, tableWidthType, tableStyleId, borders, tableIndent, tableLayout, tableCellSpacing } = attrs;

  if (tableStyleId) {
    const tableStyleElement = {
      name: 'w:tblStyle',
      attributes: { 'w:val': tableStyleId },
    };
    elements.push(tableStyleElement);
  }

  if (borders) {
    const borderElement = generateTableBorders(node);
    elements.push(borderElement);
  }

  if (tableIndent) {
    const { width, type } = tableIndent;
    const tableIndentElement = {
      name: 'w:tblInd',
      attributes: { 'w:w': pixelsToTwips(width), 'w:type': type },
    };
    elements.push(tableIndentElement);
  }

  if (tableLayout) {
    const tableLayoutElement = {
      name: 'w:tblLayout',
      attributes: { 'w:type': tableLayout },
    };
    elements.push(tableLayoutElement);
  }

  if (tableWidth && tableWidth.width) {
    const tableWidthElement = {
      name: 'w:tblW',
      attributes: { 'w:w': pixelsToTwips(tableWidth.width), 'w:type': tableWidth.type },
    };
    elements.push(tableWidthElement);
  }

  if (tableCellSpacing) {
    elements.push({
      name: 'w:tblCellSpacing',
      attributes: {
        'w:w': tableCellSpacing.w,
        'w:type': tableCellSpacing.type,
      },
    });
  }

  return {
    name: 'w:tblPr',
    elements,
  };
}

/**
 * Generate w:tblBorders properties node for a table
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The table borders properties node
 */
function generateTableBorders(node) {
  const { borders } = node.attrs;
  const elements = [];

  if (!borders) return;

  const borderTypes = ['top', 'bottom', 'left', 'right', 'insideH', 'insideV'];
  borderTypes.forEach((type) => {
    const border = borders[type];
    if (!border) return;
    
    let attributes = {};
    if (!Object.keys(border).length || !border.size) {
      attributes = {
        'w:val': 'nil',
      };
    } else {
      attributes = {
        'w:val': 'single',
        'w:sz': pixelsToEightPoints(border.size),
        'w:space': border.space || 0,
        'w:color': border?.color?.substring(1) || '000000',
      }
    }
    
    const borderElement = {
      name: `w:${type}`,
      attributes
    };
    elements.push(borderElement);
  });

  return {
    name: 'w:tblBorders',
    elements,
  };
}

/**
 * Generate w:tblGrid properties node for a table
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The table grid properties node
 */
function generateTableGrid(node) {
  const { gridColumnWidths } = node.attrs;
  
  const elements = [];
  gridColumnWidths?.forEach((width) => {
    elements.push({
      name: 'w:gridCol',
      attributes: { 'w:w': inchesToTwips(width) },
    });
  });

  return {
    name: 'w:tblGrid',
    elements,
  };
}

/**
 * Main translation function for a table row
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated table row node
 */
function translateTableRow(params) {
  const elements = translateChildNodes(params);
  const tableRowProperties = generateTableRowProperties(params.node);
  if (tableRowProperties.elements.length) elements.unshift(tableRowProperties);

  return {
    name: 'w:tr',
    elements,
  };
}

function generateTableRowProperties(node) {
  const { attrs } = node;
  const elements = [];

  const { rowHeight, rowHeightType } = attrs;
  if (rowHeight) {
    const attributes = { 'w:val': pixelsToTwips(rowHeight) };
    if (rowHeightType) attributes['w:hRule'] = rowHeightType;

    const rowHeightElement = {
      name: 'w:trHeight',
      attributes,
    };
    elements.push(rowHeightElement);
  }

  return {
    name: 'w:trPr',
    elements,
  };
}

/**
 * Main translation function for a table cell
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated table cell node
 */
function translateTableCell(params) {
  const elements = translateChildNodes(params);
  const cellProps = generateTableCellProperties(params.node);

  elements.unshift(cellProps);
  return {
    name: 'w:tc',
    elements,
  };
}

/**
 * Generate w:tcPr properties node for a table cell
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The table cell properties node
 */
function generateTableCellProperties(node) {
  const elements = [];

  const { attrs } = node;
  const { colwidth = [], cellWidthType = 'dxa', background = {}, colspan, rowspan, widthUnit } = attrs;
  const colwidthSum = colwidth.reduce((acc, curr) => acc + curr, 0);

  const cellWidthElement = {
    name: 'w:tcW',
    attributes: { 'w:w': widthUnit === 'px' ? pixelsToTwips(colwidthSum) : inchesToTwips(colwidthSum), 'w:type': cellWidthType },
  };
  elements.push(cellWidthElement);

  if (colspan) {
    const gridSpanElement = {
      name: 'w:gridSpan',
      attributes: { 'w:val': `${colspan}` },
    };
    elements.push(gridSpanElement);
  }

  const { color } = background || {};
  if (color) {
    const cellBgElement = {
      name: 'w:shd',
      attributes: { 'w:fill': color },
    };
    elements.push(cellBgElement);
  }

  const { cellMargins } = attrs;
  if (cellMargins) {
    const cellMarginsElement = {
      name: 'w:tcMar',
      elements: generateCellMargins(cellMargins),
    };
    elements.push(cellMarginsElement);
  }

  const { verticalAlign } = attrs;
  if (verticalAlign) {
    const vertAlignElement = {
      name: 'w:vAlign',
      attributes: { 'w:val': verticalAlign },
    };
    elements.push(vertAlignElement);
  }
  
  // const { vMerge } = attrs;
  // if (vMerge) {}
   if (rowspan && rowspan > 1) {
    const vMergeElement = {
      name: 'w:vMerge',
      type: 'element',
      attributes: { 'w:val': 'restart' },
    };
    elements.push(vMergeElement);
  } else if (attrs.continueMerge) {
    const vMergeElement = {
      name: 'w:vMerge',
      type: 'element',
    };
    elements.push(vMergeElement);
  }

  const { borders = {} } = attrs;
  if (!!borders && Object.keys(borders).length) {
    const cellBordersElement = {
      name: 'w:tcBorders',
      elements: Object.entries(borders).map(([key, value]) => {
        if (!value.size) {
          return {
            name: `w:${key}`,
            attributes: {
              'w:val': 'nil',
            }
          };
        }
        return {
          name: `w:${key}`,
          attributes: {
            'w:val': 'single',
            'w:color': value.color ? value.color.substring(1) : 'auto',
            'w:sz': pixelsToEightPoints(value.size),
            'w:space': value.space || 0,
          },
        };
      }),
    };

    elements.push(cellBordersElement);
  }

  return {
    name: 'w:tcPr',
    elements,
  };
}

function generateCellMargins(cellMargins) {
  const elements = [];
  const { top, right, bottom, left } = cellMargins;
  if (top != null) elements.push({ name: 'w:top', attributes: { 'w:w': pixelsToTwips(top) } });
  if (right != null) elements.push({ name: 'w:right', attributes: { 'w:w': pixelsToTwips(right) } });
  if (bottom != null) elements.push({ name: 'w:bottom', attributes: { 'w:w': pixelsToTwips(bottom) } });
  if (left != null) elements.push({ name: 'w:left', attributes: { 'w:w': pixelsToTwips(left) } });
  return elements;
}

/**
 * Translate bookmark start node. We don't maintain an internal 'end' node since its normal
 * to place it right next to the start. We export both here.
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated bookmark node
 */
function translateBookmarkStart(params) {
  const bookmarkStartNode = {
    name: 'w:bookmarkStart',
    attributes: {
      'w:id': params.node.attrs.id,
      'w:name': params.node.attrs.name,
    },
  };
  const bookmarkEndNode = {
    name: 'w:bookmarkEnd',
    attributes: {
      'w:id': params.node.attrs.id,
    },
  };
  return [bookmarkStartNode, bookmarkEndNode];
}

/**
 * Translate a mark to an XML ready attribute
 *
 * @param {MarkType} mark
 * @returns {Object} The XML ready mark attribute
 */
function translateMark(mark) {
  const xmlMark = SuperConverter.markTypes.find((m) => m.type === mark.type);
  if (!xmlMark) {
    // TODO: Telemetry
    return {};
  }

  const markElement = { name: xmlMark.name, attributes: {} };

  const { attrs } = mark;
  let value;

  switch (mark.type) {
    case 'bold':
    case 'italic':
      delete markElement.attributes;
      markElement.type = 'element';
      break;

    case 'underline':
      markElement.type = 'element';
      markElement.attributes['w:val'] = attrs.underlineType;
      break;

    // Text style cases
    case 'fontSize':
      value = attrs.fontSize;
      markElement.attributes['w:val'] = value.slice(0, -2) * 2; // Convert to half-points
      break;

    case 'fontFamily':
      value = attrs.fontFamily;
      ['w:ascii', 'w:eastAsia', 'w:hAnsi', 'w:cs'].forEach((attr) => {
        markElement.attributes[attr] = value;
      });
      break;

    case 'color':
      let processedColor = attrs.color.replace(/^#/, '').replace(/;$/, ''); // Remove `#` and `;` if present
      markElement.attributes['w:val'] = processedColor;
      break;

    case 'textAlign':
      markElement.attributes['w:val'] = attrs.textAlign;
      break;

    case 'textIndent':
      markElement.attributes['w:firstline'] = inchesToTwips(attrs.textIndent);
      break;

    case 'lineHeight':
      markElement.attributes['w:line'] = linesToTwips(attrs.lineHeight);
      break;

    case 'highlight':
      markElement.attributes['w:fill'] = attrs.color.substring(1);
      markElement.attributes['w:color'] = 'auto';
      markElement.attributes['w:val'] = 'clear';
      markElement.name = 'w:shd';
      break;

    case 'link':
      break;
  }
  
  return markElement;
}

function getPngDimensions(base64) {
  const type = base64.split(';')[0].split('/')[1];
  if (!base64 || type !== 'png') {
    return {
      originalWidth: undefined,
      originalHeight: undefined,
    }
  }
  
  let header = base64.split(',')[1].slice(0, 50)
  let uint8 = Uint8Array.from(atob(header), c => c.charCodeAt(0))
  let dataView = new DataView(uint8.buffer, 0, 28)

  return {
    originalWidth: dataView.getInt32(16),
    originalHeight: dataView.getInt32(20)
  }
}

function getScaledSize(originalWidth, originalHeight, maxWidth, maxHeight) {
  let scaledWidth = originalWidth;
  let scaledHeight = originalHeight;

  // Calculate aspect ratio
  let ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);

  // Scale dimensions
  scaledWidth = Math.round(scaledWidth * ratio);
  scaledHeight = Math.round(scaledHeight * ratio);

  return { scaledWidth, scaledHeight };
}

function translateImageNode(params, imageSize) {
  const {
    node: { attrs = {}, marks = [] },
  } = params;

  let imageId = attrs.rId;
  
  const src = attrs.src || attrs.imageSrc;
  const { originalWidth, originalHeight } = getPngDimensions(src);
  
  let size = attrs.size
    ? {
      w: pixelsToEmu(attrs.size.width),
      h: pixelsToEmu(attrs.size.height),
    } : imageSize;

  if (originalWidth && originalHeight) {
    const boxWidthPx = emuToPixels(size.w);
    const boxHeightPx = emuToPixels(size.h);
    const { scaledWidth, scaledHeight } = getScaledSize(originalWidth, originalHeight, boxWidthPx, boxHeightPx);
    size = {
      w: pixelsToEmu(scaledWidth),
      h: pixelsToEmu(scaledHeight),
    };
  }
  
  if (params.node.type === 'image' && !imageId) {
    const path = src?.split('word/')[1];
    imageId = addNewImageRelationship(params, path);
  } else if (params.node.type === 'fieldAnnotation' && !imageId) {
    const type = src?.split(';')[0].split('/')[1];
    if (!type) {
      return prepareTextAnnotation(params);
    }
    
    const hash = generateDocxRandomId(4);
    const cleanUrl = attrs.fieldId.replace('-', '_');
    const imageUrl = `media/${cleanUrl}_${hash}.${type}`;

    imageId = addNewImageRelationship(params, imageUrl);
    params.media[`${cleanUrl}_${hash}.${type}`] = src;
  }

  const inlineAttrs = attrs.originalPadding || {
    distT: 0,
    distB: 0,
    distL: 0,
    distR: 0,
  };

  const drawingXmlns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const pictureXmlns = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
  return wrapTextInRun(
    {
      name: 'w:drawing',
      elements: [
        {
          name: 'wp:inline',
          attributes: inlineAttrs,
          elements: [
            {
              name: 'wp:extent',
              attributes: {
                cx: size.w,
                cy: size.h,
              },
            },
            {
              name: 'wp:effectExtent',
              attributes: {
                l: 0,
                t: 0,
                r: 0,
                b: 0,
              },
            },
            {
              name: 'wp:docPr',
              attributes: {
                id: 0,
                name: '',
                descr: '',
              },
            },
            {
              name: 'wp:cNvGraphicFramePr',
              elements: [
                {
                  name: 'a:graphicFrameLocks',
                  attributes: {
                    'xmlns:a': drawingXmlns,
                    noChangeAspect: 1,
                  },
                },
              ],
            },
            {
              name: 'a:graphic',
              attributes: { 'xmlns:a': drawingXmlns },
              elements: [
                {
                  name: 'a:graphicData',
                  attributes: { uri: pictureXmlns },
                  elements: [
                    {
                      name: 'pic:pic',
                      attributes: { 'xmlns:pic': pictureXmlns },
                      elements: [
                        {
                          name: 'pic:nvPicPr',
                          elements: [
                            {
                              name: 'pic:cNvPr',
                              attributes: {
                                id: 0,
                                name: '',
                                desc: '',
                              },
                            },
                            {
                              name: 'pic:cNvPicPr',
                              elements: [
                                {
                                  name: 'a:picLocks',
                                  attributes: {
                                    noChangeAspect: 1,
                                    noChangeArrowheads: 1,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          name: 'pic:blipFill',
                          elements: [
                            {
                              name: 'a:blip',
                              attributes: {
                                'r:embed': imageId,
                                cstate: 'none',
                              },
                            },
                            {
                              name: 'a:srcRect',
                            },
                            {
                              name: 'a:stretch',
                              elements: [{ name: 'a:fillRect' }],
                            },
                          ],
                        },
                        {
                          name: 'pic:spPr',
                          attributes: {
                            bwMode: 'auto',
                          },
                          elements: [
                            {
                              name: 'a:xfrm',
                              elements: [
                                {
                                  name: 'a:ext',
                                  attributes: {
                                    cx: size.w,
                                    cy: size.h,
                                  },
                                },
                                {
                                  name: 'a:off',
                                  attributes: {
                                    x: 0,
                                    y: 0,
                                  },
                                },
                              ],
                            },
                            {
                              name: 'a:prstGeom',
                              attributes: { prst: 'rect' },
                              elements: [{ name: 'a:avLst' }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    [],
  );
}

/**
 * Translates text annotations
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated text node
 */
function prepareTextAnnotation(params) {
  const {
    node: { attrs = {}, marks = [] },
  } = params;

  const marksFromAttrs = translateFieldAttrsToMarks(attrs);
  return getTextNodeForExport(attrs.displayLabel, [...marks, ...marksFromAttrs]);
}

/**
 * Translates checkbox annotations
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated checkbox node
 */
function prepareCheckboxAnnotation(params) {
  const {
    node: { attrs = {}, marks = [] },
  } = params;
  const content = he.decode(attrs.displayLabel);
  return getTextNodeForExport(content, marks);
}

/**
 * Translates html annotations
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated html node
 */
function prepareHtmlAnnotation(params) {
  const {
    node: { attrs = {} },
  } = params;

  const parser = new window.DOMParser();
  const paragraphHtml = parser.parseFromString(attrs.rawHtml, 'text/html');

  const state = EditorState.create({
    doc: PMDOMParser.fromSchema(params.editorSchema).parse(paragraphHtml),
  });

  const htmlAnnotationNode = state.doc.toJSON();
  return {
    name: 'htmlAnnotation',
    elements: translateChildNodes({
      node: htmlAnnotationNode,
    }),
  };
}

/**
 * Translates image annotations
 * @param {ExportParams} params
 * @param {Object} imageSize Object contains width and height for image in EMU
 * @returns {XmlReadyNode} The translated image node
 */
function prepareImageAnnotation(params, imageSize) {
  return translateImageNode(params, imageSize);
}

/**
 * Translates URL annotations
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated URL node
 */
function prepareUrlAnnotation(params) {
  const {
    node: { attrs = {}, marks = [] },
  } = params;
  const newId = addNewLinkRelationship(params, attrs.linkUrl);

  const linkTextNode = getTextNodeForExport(attrs.linkUrl, marks);

  return {
    name: 'w:hyperlink',
    type: 'element',
    attributes: {
      'r:id': newId,
      'w:history': 1,
    },
    elements: [linkTextNode],
  };
}

/**
 * Returns node handler based on annotation type
 *
 * @param {String} annotationType
 * @returns {Function} handler for provided annotation type
 */
function getTranslationByAnnotationType(annotationType) {
  const imageEmuSize = {
    w: 4286250,
    h: 4286250,
  };

  const signatureEmuSize = {
    w: 990000,
    h: 495000,
  };

  const dictionary = {
    text: prepareTextAnnotation,
    image: (params) => prepareImageAnnotation(params, imageEmuSize),
    signature: (params) => prepareImageAnnotation(params, signatureEmuSize),
    checkbox: prepareCheckboxAnnotation,
    html: prepareHtmlAnnotation,
    link: prepareUrlAnnotation,
  };

  return dictionary[annotationType];
}

const translateFieldAttrsToMarks = (attrs = {}) => {
  const {
    fontFamily,
    fontSize,
    bold,
    underline,
    italic,
  } = attrs;

  const marks = [];
  if (fontFamily) marks.push({ type: 'fontFamily', attrs: { fontFamily } });
  if (fontSize) marks.push({ type: 'fontSize', attrs: { fontSize } });
  if (bold) marks.push({ type: 'bold', attrs: {} });
  if (underline) marks.push({ type: 'underline', attrs: {} });
  if (italic) marks.push({ type: 'italic', attrs: {} });
  return marks;
};

/**
 * Translate a field annotation node
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated field annotation node
 */
function translateFieldAnnotation(params) {
  const { node, isFinalDoc } = params;
  const { attrs = {} } = node;
  
  const annotationHandler = getTranslationByAnnotationType(attrs.type);
  if (!annotationHandler) return {};

  let processedNode;
  let sdtContentElements;
  
  if (isFinalDoc) {
    return annotationHandler(params);
  } else {
    processedNode = annotationHandler(params);
    sdtContentElements = [processedNode];

    if (attrs.type === 'html') {
      sdtContentElements = [...processedNode.elements];
    }
  }

  const customXmlns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  return {
    name: 'w:sdt',
    elements: [
      {
        name: 'w:sdtPr',
        elements: [
          { name: 'w:tag', attributes: { 'w:val': attrs.fieldId } },
          { name: 'w:alias', attributes: { 'w:val': attrs.displayLabel } },
          { name: 'w:lock', attributes: { 'w:val': 'sdtContentLocked' } },
          {
            name: 'w:fieldType',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.fieldType,
            },
          },
          {
            name: 'w:fieldTypeShort',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.type,
            },
          },
          {
            name: 'w:fieldColor',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.fieldColor,
            },
          },
          {
            name: 'w:fieldMultipleImage',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.multipleImage,
            },
          },
        ],
      },
      {
        name: 'w:sdtContent',
        elements: sdtContentElements,
      },
    ],
  };
};

export function translateHardBreak() {
  return {
    name: 'w:br',
    type: 'element',
    attributes: { 'w:type': 'page' }
  };
};

export class DocxExporter {
  constructor(converter) {
    this.converter = converter;
  }

  // Currently for hyperlinks but there will be other uses
  #generateFldCharNode(type) {
    return {
      name: 'w:r',
      type: 'element',
      elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': type } }],
    };
  }

  // Used for generating hyperlinks
  #generateInstrText(data) {
    return {
      name: 'w:r',
      type: 'element',
      elements: [{ name: 'w:instrText', elements: [{ type: 'text', text: data }] }],
    };
  }

  schemaToXml(data) {
    console.debug('[SuperConverter] schemaToXml:', data);
    const result = this.#generate_xml_as_list(data);
    // console.debug('[SuperConverter] schemaToXml result:', result.join(''));
    return result.join('');
  }

  #generate_xml_as_list(data) {
    const json = JSON.parse(JSON.stringify(data));
    const declaration = this.converter.declaration.attributes;
    const xmlTag = `<?xml${Object.entries(declaration)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join('')}?>`;
    const result = this.#generateXml(json);
    const final = [xmlTag, ...result];
    return final;
  }

  #replaceSpecialCharacters(text) {
    if (!text) return;
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  #generateXml(node) {
    if (!node) return null;
    const { name, elements, attributes } = node;
    let tag = `<${name}`;

    for (let attr in attributes) {
      tag += ` ${attr}="${attributes[attr]}"`;
    }

    const selfClosing = !elements || !elements.length;
    if (selfClosing) tag += ' />';
    else tag += '>';
    let tags = [tag];

    if (name === 'w:instrText') {
      tags.push(elements[0].text);
    } else if (name === 'w:t' || name === 'w:delText') {
      const text = this.#replaceSpecialCharacters(elements[0].text);
      tags.push(text);
    } else {
      if (elements) {
        for (let child of elements) {
          const newElements = this.#generateXml(child);
          if (!newElements) continue;
          tags.push(...newElements);
        }
      }
    }

    if (!selfClosing) tags.push(`</${name}>`);
    return tags;
  }
}
