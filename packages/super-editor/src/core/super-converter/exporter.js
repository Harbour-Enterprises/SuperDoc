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
  ptToTwips,
  rgbToHex,
} from './helpers.js';
import { generateDocxRandomId } from '@helpers/generateDocxRandomId.js';
import { DEFAULT_DOCX_DEFS } from './exporter-docx-defs.js';
import { TrackDeleteMarkName, TrackFormatMarkName, TrackInsertMarkName } from '@extensions/track-changes/constants.js';
import { carbonCopy } from '../utilities/carbonCopy.js';
import { baseBulletList, baseOrderedListDef } from './v2/exporter/helpers/base-list.definitions.js';
import { translateCommentNode } from './v2/exporter/commentsExporter.js';
import { createColGroup } from '@extensions/table/tableHelpers/createColGroup.js';

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
    shapeContainer: translateShapeContainer,
    shapeTextbox: translateShapeTextbox,
    contentBlock: translateContentBlock,
    structuredContent: translateStructuredContent,
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
  }

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
  if (htmlAnnotationChild) {
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

  const { spacing, indent, textAlign, textIndent, lineHeight, marksAttrs, keepLines, keepNext, dropcap } = attrs;
  if (spacing) {
    const { lineSpaceBefore, lineSpaceAfter, line, lineRule } = spacing;

    const attributes = {};

    // Zero values have to be considered in export to maintain accurate line height
    if (lineSpaceBefore >= 0) attributes['w:before'] = pixelsToTwips(lineSpaceBefore);
    if (lineSpaceAfter >= 0) attributes['w:after'] = pixelsToTwips(lineSpaceAfter);

    if (lineRule === 'exact') {
      if (lineHeight) attributes['w:line'] = ptToTwips(parseFloat(lineHeight));
    } else {
      if (lineHeight) attributes['w:line'] = linesToTwips(lineHeight);
    }

    attributes['w:lineRule'] = lineRule || 'auto';

    const spacingElement = {
      name: 'w:spacing',
      attributes,
    };
    pPrElements.push(spacingElement);
  }

  if (lineHeight && !spacing) {
    const spacingElement = {
      name: 'w:spacing',
      attributes: {
        'w:line': linesToTwips(lineHeight),
      },
    };
    pPrElements.push(spacingElement);
  }

  if (indent) {
    const { left, right, firstLine, hanging } = indent;
    const attributes = {};
    if (left || left === 0) attributes['w:left'] = pixelsToTwips(left);
    if (right || right === 0) attributes['w:right'] = pixelsToTwips(right);
    if (firstLine || firstLine === 0) attributes['w:firstLine'] = pixelsToTwips(firstLine);
    if (hanging || hanging === 0) attributes['w:hanging'] = pixelsToTwips(hanging);

    if (textIndent && !attributes['w:left']) {
      attributes['w:left'] = inchesToTwips(textIndent);
    }

    const indentElement = {
      name: 'w:ind',
      attributes,
    };
    pPrElements.push(indentElement);
  } else if (textIndent) {
    const indentElement = {
      name: 'w:ind',
      attributes: {
        'w:left': inchesToTwips(textIndent),
      },
    };
    pPrElements.push(indentElement);
  }

  if (textAlign) {
    const textAlignElement = {
      name: 'w:jc',
      attributes: { 'w:val': textAlign === 'justify' ? 'both' : textAlign },
    };
    pPrElements.push(textAlignElement);
  }

  if (marksAttrs) {
    const outputMarks = processOutputMarks(marksAttrs);
    const rPrElement = generateRunProps(outputMarks);
    pPrElements.push(rPrElement);
  }

  if (keepLines) {
    pPrElements.push({
      name: 'w:keepLines',
      attributes: { 'w:val': keepLines },
    });
  }

  if (keepNext) {
    pPrElements.push({
      name: 'w:keepNext',
      attributes: { 'w:val': keepNext },
    });
  }

  if (dropcap) {
    pPrElements.push({
      name: 'w:framePr',
      attributes: {
        'w:dropCap': dropcap.type,
        'w:lines': dropcap.lines,
        'w:wrap': dropcap.wrap,
        'w:vAnchor': dropcap.vAnchor,
        'w:hAnchor': dropcap.hAnchor,
      },
    });
  }

  const sectPr = node.attrs?.paragraphProperties?.sectPr;
  if (sectPr) {
    pPrElements.push(sectPr);
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
    let translatedNode = exportSchemaToJson({ ...params, node });

    const nodeType = translatedNode?.name || translatedNode?.type;
    if (nodeType !== 'w:sdt') translatedNode = isolateAnnotations(translatedNode);

    if (translatedNode instanceof Array) translatedNodes.push(...translatedNode);
    else translatedNodes.push(translatedNode);
  });

  // Filter out any null nodes
  return translatedNodes.filter((n) => n);
}

/**
 * Process nodes to isolate sdt annotations from simple text nodes
 * since having sdt annotation with text run in one paragraph inside table cell
 * can lead to export issues
 */
const isolateAnnotations = (node) => {
  if (!node) return node;
  const hasTextRun = node.elements?.some((item) => item.name === 'w:r');
  const hasSdtContent = node.elements?.some((item) => item.name === 'w:sdt');

  const sdtNode = node.elements?.find((item) => item.name === 'w:sdt');
  const sdtPr = sdtNode?.elements?.find((item) => item.name === 'w:sdtPr');
  const hasAlias = sdtPr?.elements?.some((item) => item.name === 'w:alias');
  if (!hasAlias) return node;

  let result = node;
  if (hasTextRun && hasSdtContent) {
    const sdtNodes = node.elements.filter((item) => item.name === 'w:sdt');
    const otherNodes = node.elements.filter((item) => item.name !== 'w:sdt');
    const hasText = otherNodes
      .filter((item) => item.name === 'w:r')
      .every((item) => {
        const textElements = item.elements.filter((item) => item.name === 'w:t');
        return textElements?.every((item) => item.elements[0].text.trim().length > 0);
      });
    result = [
      ...(hasText
        ? [
            {
              ...node,
              elements: otherNodes,
            },
          ]
        : []),
      {
        name: 'w:p',
        elements: sdtNodes,
      },
    ];
  }
  return result;
};

/**
 * Helper function to be used for text node translation
 * Also used for transforming text annotations for the final submit
 *
 * @param {String} text Text node's content
 * @param {Object[]} marks The marks to add to the run properties
 * @returns {XmlReadyNode} The translated text node
 */

function getTextNodeForExport(text, marks, params) {
  const hasLeadingOrTrailingSpace = /^\s|\s$/.test(text);
  const space = hasLeadingOrTrailingSpace ? 'preserve' : null;
  const nodeAttrs = space ? { 'xml:space': space } : null;
  const textNodes = [];

  const outputMarks = processOutputMarks(marks);
  textNodes.push({
    name: 'w:t',
    elements: [{ text, type: 'text' }],
    attributes: nodeAttrs,
  });

  // For custom mark export, we need to add a bookmark start and end tag
  // And store attributes in the bookmark name
  if (params) {
    const { editor } = params;
    const customMarks = editor.extensionService.extensions.filter((e) => e.isExternal === true);

    marks.forEach((mark) => {
      const isCustomMark = customMarks.some((customMark) => {
        const customMarkName = customMark.name;
        return mark.type === customMarkName;
      });

      if (!isCustomMark) return;

      let attrsString = '';
      Object.entries(mark.attrs).forEach(([key, value]) => {
        if (value) {
          attrsString += `${key}=${value};`;
        }
      });

      if (isCustomMark) {
        textNodes.unshift({
          type: 'element',
          name: 'w:bookmarkStart',
          attributes: {
            'w:id': '5000',
            'w:name': mark.type + ';' + attrsString,
          },
        });
        textNodes.push({
          type: 'element',
          name: 'w:bookmarkEnd',
          attributes: {
            'w:id': '5000',
          },
        });
      }
    });
  }

  return wrapTextInRun(textNodes, outputMarks);
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

  return getTextNodeForExport(text, marks, params);
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
      elements: trackStyleMark.attrs.before.map((mark) => processOutputMarks([mark])).filter((r) => r !== undefined),
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
function wrapTextInRun(nodeOrNodes, marks) {
  let elements = [];
  if (Array.isArray(nodeOrNodes)) elements = nodeOrNodes;
  else elements = [nodeOrNodes];

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
    elements: marks.filter((mark) => !!Object.keys(mark).length),
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
  const contentNode = processLinkContentNode(outputNode);

  const newNode = {
    name: 'w:hyperlink',
    type: 'element',
    attributes: {
      'r:id': rId,
    },
    elements: [contentNode],
  };

  return newNode;
}

function processLinkContentNode(node) {
  if (!node) return node;

  const contentNode = carbonCopy(node);
  if (!contentNode) return contentNode;

  const hyperlinkStyle = {
    name: 'w:rStyle',
    attributes: { 'w:val': 'Hyperlink' },
  };
  const color = {
    name: 'w:color',
    attributes: { 'w:val': '467886' },
  };

  if (contentNode.name === 'w:r') {
    const runProps = contentNode.elements.find((el) => el.name === 'w:rPr');

    if (runProps) {
      const foundColor = runProps.elements.find((el) => el.name === 'w:color');
      const foundHyperlinkStyle = runProps.elements.find((el) => el.name === 'w:rStyle');
      if (!foundColor) runProps.elements.unshift(color);
      if (!foundHyperlinkStyle) runProps.elements.unshift(hyperlinkStyle);
    } else {
      // we don't add underline by default
      const runProps = {
        name: 'w:rPr',
        elements: [hyperlinkStyle, color],
      };

      contentNode.elements.unshift(runProps);
    }
  }

  return contentNode;
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

  if (!params.relationships || !Array.isArray(params.relationships)) {
    params.relationships = [];
  }

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
  const newRel = {
    type: 'element',
    name: 'Relationship',
    attributes: {
      Id: newId,
      Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      Target: imagePath,
    },
  };
  params.relationships.push(newRel);
  return newId;
}

/**
 * Translate a list node
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated list node
 */
function translateList(params) {
  const { type } = params.node;
  const flatContent = flattenContent(params);

  const listNodes = [];
  flatContent.forEach((listNode) => {
    const { level, listType, pPrs: additionalPprs, content, attrs = {} } = listNode;
    const attrsNumId = listNode.attrs.numId;

    const actualNumId = attrsNumId || listNode.listId;
    const listId = actualNumId ?? generateNewListDefinition(params, listType);
    const pPr = getListParagraphProperties(level, listId, additionalPprs);

    content.forEach((contentNode, index) => {
      // Get paragraph attributes which were attached to list item node
      const paragraphNode = Object.assign({}, contentNode);
      paragraphNode.attrs = {
        ...paragraphNode.attrs,
        ...listNode.attrs,
      };

      const outputNode = exportSchemaToJson({ ...params, node: paragraphNode });
      if (!outputNode.elements) {
        outputNode.elements = [];
      }
      const propsElementIndex = outputNode.elements.findIndex((e) => e.name === 'w:pPr');
      const content = outputNode.elements.filter((e) => e.name !== 'w:pPr');
      if (!content.length) {
        // Apply initial properties to the empty nodes
        const elements = contentNode.attrs.paragraphProperties ? [contentNode.attrs.paragraphProperties] : [];
        const spacer = {
          name: 'w:p',
          type: 'element',
          elements,
        };
        return listNodes.push(spacer);
      }

      // pPr processing
      const { attributes: generalAttributes } = attrs;
      const { originalInlineRunProps } = generalAttributes || {};
      if (originalInlineRunProps) pPr.elements.push(originalInlineRunProps);

      if (propsElementIndex === -1) {
        outputNode.elements.unshift(carbonCopy(pPr));
      } else {
        // Check if there is any properties processed by translateParagraphNode
        const resultProps = carbonCopy(pPr).elements.map((item) => {
          const isChanged = outputNode.elements[propsElementIndex].elements.find((e) => e.name === item.name);
          return isChanged ? isChanged : item;
        });
        outputNode.elements[propsElementIndex].elements = resultProps;
      }

      let importedFontSize;
      if (listNode.attrs?.importedFontSize) {
        const fontNoUnit = parseInt(listNode.attrs.importedFontSize.split('pt')[0]);
        importedFontSize = {
          name: 'w:sz',
          attributes: { 'w:val': fontNoUnit * 2 },
        };
      }

      let importedFontFamily;
      if (listNode.attrs?.importedFontFamily) {
        importedFontFamily = {
          name: 'w:rFonts',
          attributes: { 'w:ascii': listNode.attrs?.importedFontFamily, 'w:hAnsi': listNode.attrs?.importedFontFamily },
        };
      }

      const rPrElement = outputNode.elements.find((e) => e.name === 'w:rPr');
      if (rPrElement) {
        rPrElement.elements.push(fontSize);
      } else if (importedFontSize || importedFontFamily) {
        const elements = [];
        if (importedFontSize) elements.push(importedFontSize);
        if (importedFontFamily) elements.push(importedFontFamily);
        outputNode.elements.unshift({ name: 'w:rPr', elements });
      }

      // Remove the numPr properties from content nodes
      if (index !== 0) {
        const currentpPr = outputNode.elements.find((e) => e.name === 'w:pPr');
        const numPrIndex = currentpPr.elements.findIndex((e) => e.name === 'w:numPr');
        if (numPrIndex !== -1) currentpPr.elements.splice(numPrIndex, 1);
      }
      listNodes.push(outputNode);
    });
  });

  return listNodes;
}

/**
 * Generate a new list definition to be inserted into numbering.xml
 * @param {Obect} param The parameters object
 * @param {Number} param.abstractId The abstract number id
 * @param {Number} param.listId The list id
 * @returns {Object} The new abstract and num definitions
 */
function generateNewListDefinition(params, listType) {
  // Generate a new numId to add to numbering.xml
  const nextNumbering = getLargestListDefinitionIndex(params.converter?.numbering?.definitions);
  const definition = listType === 'bullet' ? baseBulletList : baseOrderedListDef;
  const listId = nextNumbering;
  const abstractId = definition.attributes['w:abstractNumId'];

  // Generate the new numId definition
  const newNumDef = {
    type: 'element',
    name: 'w:num',
    attributes: {
      'w:numId': String(listId),
      'w16cid:durableId': '485517411',
    },
    elements: [{ name: 'w:abstractNumId', attributes: { 'w:val': String(abstractId) } }],
  };

  params.converter.numbering.definitions[listId] = newNumDef;
  return listId;
}

/**
 * Get the largest list definition index
 *
 * @param {Object} definitions The list definitions
 * @returns {number} The largest list definition index
 */
const getLargestListDefinitionIndex = (definitions) => {
  if (!definitions || !Object.keys(definitions).length) return 0;
  const maxKey = Math.max(...Object.keys(definitions).map((key) => parseInt(key, 10)));
  return maxKey + 1;
};

/**
 * Get the paragraph properties for a list
 *
 * @param {SchemaNode} node The list node
 * @param {number} level The list level
 * @param {string} type The list type
 * @param {boolean} hasParentProps Does output node already have pPr
 * @returns {XmlReadyNode} The list paragraph properties node
 */
function getListParagraphProperties(level, numId, additionalPprs = []) {
  return {
    name: 'w:pPr',
    type: 'element',
    elements: [
      {
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
            attributes: { 'w:val': numId },
          },
        ],
      },
      ...additionalPprs,
    ],
  };
}

/**
 * Flatten list nodes for processing.
 */
function flattenContent({ node }) {
  const { content, attrs = {} } = node;
  const { listId, syncId } = node.attrs || {};
  const listType = node.attrs['list-style-type'];

  const { attributes = {} } = attrs;
  const pPrs = attributes?.parentAttributes?.paragraphProperties?.elements?.filter((el) => el.name !== 'w:numPr') || [];
  const flatContent = [];

  function recursiveFlatten(items, level = 0) {
    if (!items || !items.length) return;
    items.forEach((item) => {
      const indent = item.attrs?.indent;
      if (indent) {
        const { left, right, firstLine, hanging } = indent;
        const indentAttrs = {};
        if (left !== undefined) indentAttrs['w:left'] = pixelsToTwips(left);
        if (right !== undefined) indentAttrs['w:right'] = pixelsToTwips(right);
        if (firstLine !== undefined) indentAttrs['w:firstLine'] = pixelsToTwips(firstLine);
        if (hanging !== undefined) indentAttrs['w:hanging'] = pixelsToTwips(hanging);

        const indentElement = {
          type: 'element',
          name: 'w:ind',
          attributes: indentAttrs,
        };

        const existingIndentIndex = pPrs.findIndex((el) => el.name === 'w:ind');
        if (existingIndentIndex !== -1) {
          pPrs[existingIndentIndex] = indentElement;
        }
      }

      const subList = item.content?.filter((c) => c.type === 'bulletList' || c.type === 'orderedList') || [];
      const notLists = item.content?.filter((c) => c.type !== 'bulletList' && c.type !== 'orderedList') || [];
      const newItem = { ...item, content: notLists, listId, level, listType, syncId, pPrs };
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
  const gridProperties = generateTableGrid(params.node, params);

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
      };
    }

    const borderElement = {
      name: `w:${type}`,
      attributes,
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
function generateTableGrid(node, params) {
  const { editorSchema } = params;

  let colgroup = [];

  try {
    const pmNode = editorSchema.nodeFromJSON(node);
    const cellMinWidth = 25;
    const { colgroupValues } = createColGroup(pmNode, cellMinWidth);

    colgroup = colgroupValues;
  } catch (err) {
    colgroup = [];
  }

  const elements = [];
  colgroup?.forEach((width) => {
    elements.push({
      name: 'w:gridCol',
      attributes: { 'w:w': pixelsToTwips(width) },
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
  const elements = translateChildNodes({
    ...params,
    tableCell: params.node,
  });

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
    attributes: {
      'w:w': widthUnit === 'px' ? pixelsToTwips(colwidthSum) : inchesToTwips(colwidthSum),
      'w:type': cellWidthType,
    },
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
            },
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
        const parsedValue = value.split(', ');
        markElement.attributes[attr] = parsedValue[0] ? parsedValue[0] : value;
      });
      break;

    case 'color':
      let processedColor = attrs.color.replace(/^#/, '').replace(/;$/, ''); // Remove `#` and `;` if present
      if (processedColor.startsWith('rgb')) {
        processedColor = rgbToHex(processedColor);
      }
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
      markElement.attributes['w:fill'] = attrs.color?.substring(1);
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
  if (!base64) return {};

  const type = base64.split(';')[0].split('/')[1];
  if (!base64 || type !== 'png') {
    return {
      originalWidth: undefined,
      originalHeight: undefined,
    };
  }

  let header = base64.split(',')[1].slice(0, 50);
  let uint8 = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
  let dataView = new DataView(uint8.buffer, 0, 28);

  return {
    originalWidth: dataView.getInt32(16),
    originalHeight: dataView.getInt32(20),
  };
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
    tableCell,
  } = params;

  let imageId = attrs.rId;

  const src = attrs.src || attrs.imageSrc;
  const { originalWidth, originalHeight } = getPngDimensions(src);

  let size = attrs.size
    ? {
        w: pixelsToEmu(attrs.size.width),
        h: pixelsToEmu(attrs.size.height),
      }
    : imageSize;

  if (originalWidth && originalHeight) {
    const boxWidthPx = emuToPixels(size.w);
    const boxHeightPx = emuToPixels(size.h);
    const { scaledWidth, scaledHeight } = getScaledSize(originalWidth, originalHeight, boxWidthPx, boxHeightPx);
    size = {
      w: pixelsToEmu(scaledWidth),
      h: pixelsToEmu(scaledHeight),
    };
  }

  if (tableCell) {
    // Image inside tableCell
    const colwidthSum = tableCell.attrs.colwidth.reduce((acc, curr) => acc + curr, 0);
    const leftMargin = tableCell.attrs.cellMargins?.left || 8;
    const rightMargin = tableCell.attrs.cellMargins?.right || 8;
    const maxWidthEmu = pixelsToEmu(colwidthSum - (leftMargin + rightMargin));
    const { width: w, height: h } = resizeKeepAspectRatio(size.w, size.h, maxWidthEmu);
    if (w && h) size = { w, h };
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

  let inlineAttrs = attrs.originalPadding || {
    distT: 0,
    distB: 0,
    distL: 0,
    distR: 0,
  };

  const anchorElements = [];
  let wrapProp = [];

  // Handle anchor image export
  if (attrs.isAnchor) {
    inlineAttrs = {
      ...inlineAttrs,
      simplePos: attrs.originalAttributes?.simplePos,
      relativeHeight: 1,
      behindDoc: attrs.originalAttributes?.behindDoc,
      locked: attrs.originalAttributes?.locked,
      layoutInCell: attrs.originalAttributes?.layoutInCell,
      allowOverlap: attrs.originalAttributes?.allowOverlap,
    };
    if (attrs.simplePos) {
      anchorElements.push({
        name: 'wp:simplePos',
        attributes: {
          x: 0,
          y: 0,
        },
      });
    }

    if (attrs.anchorData) {
      anchorElements.push({
        name: 'wp:positionH',
        attributes: {
          relativeFrom: attrs.anchorData.hRelativeFrom,
        },
        ...(attrs.marginOffset.left && {
          elements: [
            {
              name: 'wp:posOffset',
              elements: [
                {
                  type: 'text',
                  text: pixelsToEmu(attrs.marginOffset.left).toString(),
                },
              ],
            },
          ],
        }),
        ...(attrs.anchorData.alignH && {
          elements: [
            {
              name: 'wp:align',
              elements: [
                {
                  type: 'text',
                  text: attrs.anchorData.alignH,
                },
              ],
            },
          ],
        }),
      });
      anchorElements.push({
        name: 'wp:positionV',
        attributes: {
          relativeFrom: attrs.anchorData.vRelativeFrom,
        },
        ...(attrs.marginOffset.top && {
          elements: [
            {
              name: 'wp:posOffset',
              elements: [
                {
                  type: 'text',
                  text: pixelsToEmu(attrs.marginOffset.top).toString(),
                },
              ],
            },
          ],
        }),
        ...(attrs.anchorData.alignV && {
          elements: [
            {
              name: 'wp:align',
              elements: [
                {
                  type: 'text',
                  text: attrs.anchorData.alignV,
                },
              ],
            },
          ],
        }),
      });
    }

    if (attrs.wrapText) {
      wrapProp.push({
        name: 'wp:wrapSquare',
        attributes: {
          wrapText: attrs.wrapText,
        },
      });
    }

    if (attrs.wrapTopAndBottom) {
      wrapProp.push({
        name: 'wp:wrapTopAndBottom',
      });
    }
  }

  const drawingXmlns = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const pictureXmlns = 'http://schemas.openxmlformats.org/drawingml/2006/picture';

  const textNode = wrapTextInRun(
    {
      name: 'w:drawing',
      elements: [
        {
          name: attrs.isAnchor ? 'wp:anchor' : 'wp:inline',
          attributes: inlineAttrs,
          elements: [
            ...anchorElements,
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
            ...wrapProp,
            {
              name: 'wp:docPr',
              attributes: {
                id: attrs.id || 0,
                name: attrs.alt,
                descr: attrs.title,
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
                                id: attrs.id || 0,
                                name: attrs.title,
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
                              },
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
                            {
                              name: 'a:noFill',
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

  return textNode;
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
  return getTextNodeForExport(attrs.displayLabel, [...marks, ...marksFromAttrs], params);
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
  return getTextNodeForExport(content, marks, params);
}

/**
 * Translates html annotations
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated html node
 */
function prepareHtmlAnnotation(params) {
  const {
    node: { attrs = {}, marks = [] },
    editorSchema,
  } = params;

  const parser = new window.DOMParser();
  const paragraphHtml = parser.parseFromString(attrs.rawHtml || attrs.displayLabel, 'text/html');
  const marksFromAttrs = translateFieldAttrsToMarks(attrs);
  const allMarks = [...marks, ...marksFromAttrs];

  let state = EditorState.create({
    doc: PMDOMParser.fromSchema(editorSchema).parse(paragraphHtml),
  });

  if (allMarks.length) {
    state = applyMarksToHtmlAnnotation(state, allMarks);
  }

  const htmlAnnotationNode = state.doc.toJSON();

  return {
    name: 'htmlAnnotation',
    elements: translateChildNodes({
      ...params,
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

  const linkTextNode = getTextNodeForExport(attrs.linkUrl, marks, params);
  const contentNode = processLinkContentNode(linkTextNode);

  return {
    name: 'w:hyperlink',
    type: 'element',
    attributes: {
      'r:id': newId,
      'w:history': 1,
    },
    elements: [contentNode],
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
  const { fontFamily, fontSize, bold, underline, italic, textColor, textHighlight } = attrs;

  const marks = [];
  if (fontFamily) marks.push({ type: 'fontFamily', attrs: { fontFamily } });
  if (fontSize) marks.push({ type: 'fontSize', attrs: { fontSize } });
  if (bold) marks.push({ type: 'bold', attrs: {} });
  if (underline) marks.push({ type: 'underline', attrs: {} });
  if (italic) marks.push({ type: 'italic', attrs: {} });
  if (textColor) marks.push({ type: 'color', attrs: { color: textColor } });
  if (textHighlight) marks.push({ type: 'highlight', attrs: { color: textHighlight } });
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
          {
            name: 'w:fieldFontFamily',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.fontFamily,
            },
          },
          {
            name: 'w:fieldFontSize',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.fontSize,
            },
          },
          {
            name: 'w:fieldTextColor',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.textColor,
            },
          },
          {
            name: 'w:fieldTextHighlight',
            attributes: {
              'xmlns:w': customXmlns,
              'w:val': attrs.textHighlight,
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
}

export function translateHardBreak(params) {
  const { node = {} } = params;
  const { attrs = {} } = node;
  const { pageBreakSource } = attrs;
  if (pageBreakSource === 'sectPr') return null;

  return {
    name: 'w:r',
    elements: [
      {
        name: 'w:br',
        type: 'element',
        attributes: { 'w:type': 'page' },
      },
    ],
  };
}

function translateShapeContainer(params) {
  const { node } = params;
  const elements = translateChildNodes(params);

  const shape = {
    name: 'v:shape',
    attributes: {
      ...node.attrs.attributes,
      fillcolor: node.attrs.fillcolor,
    },
    elements: [
      ...elements,
      ...(node.attrs.wrapAttributes
        ? [
            {
              name: 'w10:wrap',
              attributes: { ...node.attrs.wrapAttributes },
            },
          ]
        : []),
    ],
  };

  const pict = {
    name: 'w:pict',
    attributes: {
      'w14:anchorId': Math.floor(Math.random() * 0xffffffff).toString(),
    },
    elements: [shape],
  };

  const par = {
    name: 'w:p',
    elements: [wrapTextInRun(pict)],
  };

  return par;
}

function translateShapeTextbox(params) {
  const { node } = params;
  const elements = translateChildNodes(params);

  const textboxContent = {
    name: 'w:txbxContent',
    elements,
  };

  const textbox = {
    name: 'v:textbox',
    attributes: {
      ...node.attrs.attributes,
    },
    elements: [textboxContent],
  };

  return textbox;
}

function translateContentBlock(params) {
  const { node } = params;
  const { drawingContent } = node.attrs;

  const drawing = {
    name: 'w:drawing',
    elements: [...(drawingContent ? [...(drawingContent.elements || [])] : [])],
  };

  const choice = {
    name: 'mc:Choice',
    attributes: { Requires: 'wps' },
    elements: [drawing],
  };

  const alternateContent = {
    name: 'mc:AlternateContent',
    elements: [choice],
  };

  const par = {
    name: 'w:p',
    elements: [wrapTextInRun(alternateContent)],
  };

  return par;
}

export class DocxExporter {
  constructor(converter) {
    this.converter = converter;
  }

  schemaToXml(data, debug = false) {
    const result = this.#generate_xml_as_list(data, debug);
    return result.join('');
  }

  #generate_xml_as_list(data, debug = falase) {
    const json = JSON.parse(JSON.stringify(data));
    const declaration = this.converter.declaration.attributes;
    const xmlTag = `<?xml${Object.entries(declaration)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join('')}?>`;
    const result = this.#generateXml(json, debug);
    const final = [xmlTag, ...result];
    return final;
  }

  #replaceSpecialCharacters(text) {
    if (!text) return;
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  #generateXml(node, debug = false) {
    if (!node) return null;
    let { name } = node;
    const { elements, attributes } = node;

    let tag = `<${name}`;

    for (let attr in attributes) {
      const parsedAttrName =
        typeof attributes[attr] === 'string' ? this.#replaceSpecialCharacters(attributes[attr]) : attributes[attr];
      tag += ` ${attr}="${parsedAttrName}"`;
    }

    const selfClosing = name && (!elements || !elements.length);
    if (selfClosing) tag += ' />';
    else tag += '>';
    let tags = [tag];

    if (!name && node.type === 'text') {
      return node.text;
    }

    if (name === 'w:instrText') {
      tags.push(elements[0].text);
    } else if (name === 'w:t' || name === 'w:delText' || name === 'wp:posOffset') {
      const text = this.#replaceSpecialCharacters(elements[0].text);
      tags.push(text);
    } else {
      if (elements) {
        for (let child of elements) {
          const newElements = this.#generateXml(child);
          if (!newElements) continue;

          if (typeof newElements === 'string') {
            tags.push(newElements);
            continue;
          }

          const removeUndefined = newElements.filter((el) => {
            return el !== '<undefined>' && el !== '</undefined>';
          });

          tags.push(...removeUndefined);
        }
      }
    }

    if (!selfClosing) tags.push(`</${name}>`);
    return tags;
  }
}

function resizeKeepAspectRatio(width, height, maxWidth) {
  if (width > maxWidth) {
    let scale = maxWidth / width;
    let newHeight = Math.round(height * scale);
    return { width: maxWidth, height: newHeight };
  }
  return { width, height };
}

function applyMarksToHtmlAnnotation(state, marks) {
  const { tr, doc, schema } = state;
  const allowedMarks = ['fontFamily', 'fontSize', 'highlight'];

  if (!marks.some((m) => allowedMarks.includes(m.type))) {
    return state;
  }

  const fontFamily = marks.find((m) => m.type === 'fontFamily');
  const fontSize = marks.find((m) => m.type === 'fontSize');
  const highlight = marks.find((m) => m.type === 'highlight');

  const textStyleType = schema.marks.textStyle;
  const highlightType = schema.marks.highlight;

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const foundTextStyle = node.marks.find((m) => m.type.name === 'textStyle');
    const foundHighlight = node.marks.find((m) => m.type.name === 'highlight');

    // text style (fontFamily, fontSize)
    if (!foundTextStyle) {
      tr.addMark(
        pos,
        pos + node.nodeSize,
        textStyleType.create({
          ...fontFamily?.attrs,
          ...fontSize?.attrs,
        }),
      );
    } else if (!foundTextStyle?.attrs.fontFamily && fontFamily) {
      tr.addMark(
        pos,
        pos + node.nodeSize,
        textStyleType.create({
          ...foundTextStyle?.attrs,
          ...fontFamily.attrs,
        }),
      );
    } else if (!foundTextStyle?.attrs.fontSize && fontSize) {
      tr.addMark(
        pos,
        pos + node.nodeSize,
        textStyleType.create({
          ...foundTextStyle?.attrs,
          ...fontSize.attrs,
        }),
      );
    }

    // highlight
    if (!foundHighlight) {
      tr.addMark(
        pos,
        pos + node.nodeSize,
        highlightType.create({
          ...highlight?.attrs,
        }),
      );
    }
  });

  return state.apply(tr);
}

function translateStructuredContent(params) {
  const { node } = params;
  const { attrs = {} } = node;

  const childContent = translateChildNodes({ ...params, nodes: node.content });

  // We build the sdt node elements here, and re-add passthrough sdtPr node
  const nodeElements = [
    {
      name: 'w:sdtContent',
      elements: childContent,
    },
  ];
  nodeElements.unshift(attrs.sdtPr);

  return {
    name: 'w:sdt',
    elements: nodeElements,
  };
}
