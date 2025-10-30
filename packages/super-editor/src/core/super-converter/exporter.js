import { SuperConverter } from './SuperConverter.js';
import {
  getTextIndentExportValue,
  inchesToTwips,
  linesToTwips,
  pixelsToEightPoints,
  pixelsToTwips,
  ptToTwips,
  rgbToHex,
} from './helpers.js';
import { generateDocxRandomId } from '@helpers/generateDocxRandomId.js';
import { DEFAULT_DOCX_DEFS } from './exporter-docx-defs.js';
import { TrackDeleteMarkName, TrackInsertMarkName } from '@extensions/track-changes/constants.js';
import { carbonCopy } from '../utilities/carbonCopy.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { translateChildNodes } from './v2/exporter/helpers/index.js';
import { translator as wBrNodeTranslator } from './v3/handlers/w/br/br-translator.js';
import { translator as wHighlightTranslator } from './v3/handlers/w/highlight/highlight-translator.js';
import { translator as wTabNodeTranslator } from './v3/handlers/w/tab/tab-translator.js';
import { translator as wPNodeTranslator } from './v3/handlers/w/p/p-translator.js';
import { translator as wRNodeTranslator } from './v3/handlers/w/r/r-translator.js';
import { translator as wTcNodeTranslator } from './v3/handlers/w/tc/tc-translator';
import { translator as wTrNodeTranslator } from './v3/handlers/w/tr/tr-translator.js';
import { translator as wSdtNodeTranslator } from './v3/handlers/w/sdt/sdt-translator';
import { translator as wTblNodeTranslator } from './v3/handlers/w/tbl/tbl-translator.js';
import { translator as wUnderlineTranslator } from './v3/handlers/w/u/u-translator.js';
import { translator as wDrawingNodeTranslator } from './v3/handlers/w/drawing/drawing-translator.js';
import { translator as wBookmarkStartTranslator } from './v3/handlers/w/bookmark-start/index.js';
import { translator as wBookmarkEndTranslator } from './v3/handlers/w/bookmark-end/index.js';
import {
  commentRangeStartTranslator as wCommentRangeStartTranslator,
  commentRangeEndTranslator as wCommentRangeEndTranslator,
} from './v3/handlers/w/commentRange/index.js';
import { translator as sdPageReferenceTranslator } from '@converter/v3/handlers/sd/pageReference';
import { translator as sdTableOfContentsTranslator } from '@converter/v3/handlers/sd/tableOfContents';
import { translator as pictTranslator } from './v3/handlers/w/pict/pict-translator';
import { translator as wDelTranslator } from '@converter/v3/handlers/w/del';
import { translator as wInsTranslator } from '@converter/v3/handlers/w/ins';
import { translator as wHyperlinkTranslator } from '@converter/v3/handlers/w/hyperlink/hyperlink-translator.js';
import { translateVectorShape } from '@converter/v3/handlers/wp/helpers/decode-image-node-helpers';

const RUN_LEVEL_WRAPPERS = new Set(['w:hyperlink', 'w:ins', 'w:del']);

const DEFAULT_SECTION_PROPS_TWIPS = Object.freeze({
  pageSize: Object.freeze({ width: '12240', height: '15840' }),
  pageMargins: Object.freeze({
    top: '1440',
    right: '1440',
    bottom: '1440',
    left: '1440',
    header: '720',
    footer: '720',
    gutter: '0',
  }),
});

export const ensureSectionLayoutDefaults = (sectPr, converter) => {
  if (!sectPr) {
    return {
      type: 'element',
      name: 'w:sectPr',
      elements: [],
    };
  }

  if (!sectPr.elements) sectPr.elements = [];

  const ensureChild = (name) => {
    let child = sectPr.elements.find((n) => n.name === name);
    if (!child) {
      child = {
        type: 'element',
        name,
        elements: [],
        attributes: {},
      };
      sectPr.elements.push(child);
    } else {
      if (!child.elements) child.elements = [];
      if (!child.attributes) child.attributes = {};
    }
    return child;
  };

  const pageSize = converter?.pageStyles?.pageSize;
  const pgSz = ensureChild('w:pgSz');
  if (pageSize?.width != null) pgSz.attributes['w:w'] = String(inchesToTwips(pageSize.width));
  if (pageSize?.height != null) pgSz.attributes['w:h'] = String(inchesToTwips(pageSize.height));
  if (pgSz.attributes['w:w'] == null) pgSz.attributes['w:w'] = DEFAULT_SECTION_PROPS_TWIPS.pageSize.width;
  if (pgSz.attributes['w:h'] == null) pgSz.attributes['w:h'] = DEFAULT_SECTION_PROPS_TWIPS.pageSize.height;

  const pageMargins = converter?.pageStyles?.pageMargins;
  const pgMar = ensureChild('w:pgMar');
  if (pageMargins) {
    Object.entries(pageMargins).forEach(([key, value]) => {
      const converted = inchesToTwips(value);
      if (converted != null) pgMar.attributes[`w:${key}`] = String(converted);
    });
  }
  Object.entries(DEFAULT_SECTION_PROPS_TWIPS.pageMargins).forEach(([key, value]) => {
    const attrKey = `w:${key}`;
    if (pgMar.attributes[attrKey] == null) pgMar.attributes[attrKey] = value;
  });

  return sectPr;
};

export const isLineBreakOnlyRun = (node) => {
  if (!node) return false;
  if (node.type === 'lineBreak' || node.type === 'hardBreak') return true;
  if (node.type !== 'run') return false;
  const runContent = Array.isArray(node.content) ? node.content : [];
  if (!runContent.length) return false;
  return runContent.every((child) => child?.type === 'lineBreak' || child?.type === 'hardBreak');
};

/**
 * Convert SDT child elements into Word run elements.
 * @param {Array<Object>|Object} elements
 * @returns {Array<Object>}
 */
export function convertStdContentToRuns(elements) {
  const normalized = Array.isArray(elements) ? elements : [elements];
  const runs = [];

  normalized.forEach((element) => {
    if (!element) return;

    if (element.name === 'w:sdtPr') {
      return;
    }

    if (element.name === 'w:r') {
      runs.push(element);
      return;
    }

    if (element.name === 'w:sdt') {
      // Recursively flatten nested SDTs into the surrounding run sequence, skipping property bags.
      const sdtContent = (element.elements || []).find((child) => child?.name === 'w:sdtContent');
      if (sdtContent?.elements) {
        runs.push(...convertStdContentToRuns(sdtContent.elements));
      }
      return;
    }

    if (RUN_LEVEL_WRAPPERS.has(element.name)) {
      const wrapperElements = convertStdContentToRuns(element.elements || []);
      if (wrapperElements.length) {
        runs.push({
          ...element,
          elements: wrapperElements,
        });
      }
      return;
    }

    if (element.name) {
      runs.push({
        name: 'w:r',
        type: 'element',
        elements: element.elements || [element],
      });
    }
  });

  return runs.filter((run) => Array.isArray(run.elements) && run.elements.length > 0);
}

/**
 * @typedef {Object} ExportParams
 * @property {Object} node JSON node to translate (from PM schema)
 * @property {Object} [bodyNode] The stored body node to restore, if available
 * @property {Object[]} [relationships] The relationships to add to the document
 * @property {Object} [extraParams] The extra params from NodeTranslator
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
 * @property {Object} [attributes] The node attributes
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
    heading: translateHeadingNode,
    paragraph: wPNodeTranslator,
    run: wRNodeTranslator,
    text: translateTextNode,
    bulletList: translateList,
    orderedList: translateList,
    lineBreak: wBrNodeTranslator,
    table: wTblNodeTranslator,
    tableRow: wTrNodeTranslator,
    tableCell: wTcNodeTranslator,
    bookmarkStart: wBookmarkStartTranslator,
    bookmarkEnd: wBookmarkEndTranslator,
    fieldAnnotation: wSdtNodeTranslator,
    tab: wTabNodeTranslator,
    image: wDrawingNodeTranslator,
    hardBreak: wBrNodeTranslator,
    commentRangeStart: wCommentRangeStartTranslator,
    commentRangeEnd: wCommentRangeEndTranslator,
    commentReference: () => null,
    shapeContainer: pictTranslator,
    shapeTextbox: pictTranslator,
    contentBlock: pictTranslator,
    vectorShape: translateVectorShape,
    structuredContent: wSdtNodeTranslator,
    structuredContentBlock: wSdtNodeTranslator,
    documentPartObject: wSdtNodeTranslator,
    documentSection: wSdtNodeTranslator,
    'page-number': translatePageNumberNode,
    'total-page-number': translateTotalPageNumberNode,
    pageReference: sdPageReferenceTranslator,
    tableOfContents: sdTableOfContentsTranslator,
  };

  let handler = router[type];

  // For import/export v3 we use the translator directly
  if (handler && 'decode' in handler && typeof handler.decode === 'function') {
    return handler.decode(params);
  }

  if (!handler) {
    console.error('No translation function found for node type:', type);
    return null;
  }

  // Call the handler for this node type
  return handler(params);
}

/**
 * There is no body node in the prose mirror schema, so it is stored separately
 * and needs to be restored here.
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} JSON of the XML-ready body node
 */
function translateBodyNode(params) {
  let sectPr = params.bodyNode?.elements?.find((n) => n.name === 'w:sectPr');
  if (!sectPr) {
    sectPr = {
      type: 'element',
      name: 'w:sectPr',
      elements: [],
    };
  } else if (!sectPr.elements) {
    sectPr = { ...sectPr, elements: [] };
  }

  sectPr = ensureSectionLayoutDefaults(sectPr, params.converter);

  if (params.converter) {
    const hasHeader = sectPr.elements?.some((n) => n.name === 'w:headerReference');
    const hasDefaultHeader = params.converter.headerIds?.default;
    if (!hasHeader && hasDefaultHeader && !params.editor.options.isHeaderOrFooter) {
      const defaultHeader = generateDefaultHeaderFooter('header', params.converter.headerIds?.default);
      sectPr.elements.push(defaultHeader);
    }

    const hasFooter = sectPr.elements?.some((n) => n.name === 'w:footerReference');
    const hasDefaultFooter = params.converter.footerIds?.default;
    if (!hasFooter && hasDefaultFooter && !params.editor.options.isHeaderOrFooter) {
      const defaultFooter = generateDefaultHeaderFooter('footer', params.converter.footerIds?.default);
      sectPr.elements.push(defaultFooter);
    }
  }

  const elements = translateChildNodes(params);

  if (params.isHeaderFooter) {
    return {
      name: 'w:body',
      elements: [...elements],
    };
  }

  return {
    name: 'w:body',
    elements: [...elements, sectPr],
  };
}

const generateDefaultHeaderFooter = (type, id) => {
  return {
    type: 'element',
    name: `w:${type}Reference`,
    attributes: {
      'w:type': 'default',
      'r:id': id,
    },
  };
};

/**
 * Translate a heading node to a paragraph with Word heading style
 *
 * @param {ExportParams} params The parameters object containing the heading node
 * @returns {XmlReadyNode} JSON of the XML-ready paragraph node with heading style
 */
function translateHeadingNode(params) {
  const { node } = params;
  const { level = 1, ...otherAttrs } = node.attrs;

  // Convert heading to paragraph with appropriate Word heading style
  const paragraphNode = {
    type: 'paragraph',
    content: node.content,
    attrs: {
      ...otherAttrs,
      styleId: `Heading${level}`, // Maps to Heading1, Heading2, etc. in Word
    },
  };

  // Use existing paragraph translator with the modified node
  return translateParagraphNode({ ...params, node: paragraphNode });
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

  const result = {
    name: 'w:p',
    elements,
    attributes,
  };

  return result;
}

/**
 * Normalize line height values
 * This function converts line height values from strings with percentage to a decimal value.
 * For example, "150%" becomes 1.5.
 * If the value is not a valid number, it returns null.
 * @param {string|number} value The line height value to normalize
 * @return {number|null} The normalized line height value or null if invalid
 */
function normalizeLineHeight(value) {
  if (typeof value === 'string' && value.trim().endsWith('%')) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed / 100 : null;
  }

  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Generate the w:pPr props for a paragraph node
 *
 * @param {SchemaNode} node
 * @returns {XmlReadyNode} The paragraph properties node
 */
export function generateParagraphProperties(node) {
  const { attrs = {} } = node;

  const pPrElements = [];

  const { styleId } = attrs;
  if (styleId) pPrElements.push({ name: 'w:pStyle', attributes: { 'w:val': styleId } });

  const { spacing, indent, textAlign, textIndent, lineHeight, marksAttrs, keepLines, keepNext, dropcap, borders } =
    attrs;
  if (spacing) {
    const { lineSpaceBefore, lineSpaceAfter, lineRule } = spacing;

    const attributes = {};

    // Zero values have to be considered in export to maintain accurate line height
    if (lineSpaceBefore >= 0) attributes['w:before'] = pixelsToTwips(lineSpaceBefore);
    if (lineSpaceAfter >= 0) attributes['w:after'] = pixelsToTwips(lineSpaceAfter);

    attributes['w:lineRule'] = lineRule || 'auto';

    const normalized = normalizeLineHeight(lineHeight);
    if (normalized !== null) {
      if (lineRule === 'exact') {
        attributes['w:line'] = ptToTwips(normalized);
      } else if (lineHeight.endsWith('px')) {
        // Conditional for agreements created via API
        attributes['w:line'] = pixelsToTwips(normalized);
        attributes['w:lineRule'] = 'exact';
      } else {
        attributes['w:line'] = linesToTwips(normalized);
      }
    }

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

  const hasIndent = !!indent;
  if (hasIndent) {
    const { left, right, firstLine, hanging, explicitLeft, explicitRight, explicitFirstLine, explicitHanging } = indent;

    const attributes = {};

    if (left !== undefined && (left !== 0 || explicitLeft || textIndent)) {
      attributes['w:left'] = pixelsToTwips(left);
    }
    if (right !== undefined && (right !== 0 || explicitRight)) {
      attributes['w:right'] = pixelsToTwips(right);
    }
    if (firstLine !== undefined && (firstLine !== 0 || explicitFirstLine)) {
      attributes['w:firstLine'] = pixelsToTwips(firstLine);
    }
    if (hanging !== undefined && (hanging !== 0 || explicitHanging)) {
      attributes['w:hanging'] = pixelsToTwips(hanging);
    }

    if (textIndent && attributes['w:left'] === undefined) {
      attributes['w:left'] = getTextIndentExportValue(textIndent);
    }

    if (Object.keys(attributes).length) {
      const indentElement = {
        name: 'w:ind',
        attributes,
      };
      pPrElements.push(indentElement);
    }
  } else if (textIndent && textIndent !== '0in') {
    const indentElement = {
      name: 'w:ind',
      attributes: {
        'w:left': getTextIndentExportValue(textIndent),
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

  // Add tab stops
  const mapTabVal = (value) => {
    if (!value || value === 'start') return 'left';
    if (value === 'end') return 'right';
    return value;
  };

  const { tabStops } = attrs;
  if (tabStops && tabStops.length > 0) {
    const tabElements = tabStops.map((tab) => {
      const posValue = tab.originalPos !== undefined ? tab.originalPos : pixelsToTwips(tab.pos).toString();
      const tabAttributes = {
        'w:val': mapTabVal(tab.val),
        'w:pos': posValue,
      };

      if (tab.leader) {
        tabAttributes['w:leader'] = tab.leader;
      }

      return {
        name: 'w:tab',
        attributes: tabAttributes,
      };
    });

    pPrElements.push({
      name: 'w:tabs',
      elements: tabElements,
    });
  }

  const numPr = node.attrs?.paragraphProperties?.elements?.find((n) => n.name === 'w:numPr');
  const hasNumPr = pPrElements.some((n) => n.name === 'w:numPr');
  if (numPr && !hasNumPr) pPrElements.push(numPr);
  if (!pPrElements.length) return null;

  if (borders && Object.keys(borders).length) {
    pPrElements.push(generateParagraphBorders(borders));
  }

  return {
    name: 'w:pPr',
    elements: pPrElements,
  };
}

function generateParagraphBorders(borders) {
  const elements = [];
  const sides = ['top', 'bottom', 'left', 'right'];
  sides.forEach((side) => {
    const b = borders[side];
    if (!b) return;

    let attributes;
    if (!b.size) {
      attributes = { 'w:val': 'nil' };
    } else {
      attributes = {
        'w:val': b.val || 'single',
        'w:sz': pixelsToEightPoints(b.size),
        'w:space': b.space ? pixelsToEightPoints(b.space) : 0,
        'w:color': (b.color || '#000000').replace('#', ''),
      };
    }

    elements.push({ name: `w:${side}`, attributes });
  });

  return { name: 'w:pBdr', elements };
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
 * Helper function to be used for text node translation
 * Also used for transforming text annotations for the final submit
 *
 * @param {String} text Text node's content
 * @param {Object[]} marks The marks to add to the run properties
 * @returns {XmlReadyNode} The translated text node
 */

export function getTextNodeForExport(text, marks, params) {
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
  const { node, extraParams } = params;

  // Separate tracked changes from regular text
  const trackedMarks = [TrackInsertMarkName, TrackDeleteMarkName];
  const trackedMark = node.marks?.find((m) => trackedMarks.includes(m.type));

  if (trackedMark) {
    switch (trackedMark.type) {
      case 'trackDelete':
        return wDelTranslator.decode(params);
      case 'trackInsert':
        return wInsTranslator.decode(params);
    }
  }

  // Separate links from regular text
  const isLinkNode = node.marks?.some((m) => m.type === 'link');
  if (isLinkNode && !extraParams?.linkProcessed) {
    return wHyperlinkTranslator.decode(params);
  }

  const { text, marks = [] } = node;

  return getTextNodeForExport(text, marks, params);
}

/**
 * Wrap a text node in a run
 *
 * @param {XmlReadyNode} node
 * @returns {XmlReadyNode} The wrapped run node
 */
export function wrapTextInRun(nodeOrNodes, marks) {
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
export function generateRunProps(marks = []) {
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
export function processOutputMarks(marks = []) {
  return marks.flatMap((mark) => {
    if (mark.type === 'textStyle') {
      return Object.entries(mark.attrs)
        .filter(([, value]) => value)
        .map(([key]) => {
          const unwrappedMark = { type: key, attrs: mark.attrs };
          return translateMark(unwrappedMark);
        });
    } else {
      return translateMark(mark);
    }
  });
}

export function processLinkContentNode(node) {
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
  const underline = {
    name: 'w:u',
    attributes: {
      'w:val': 'none',
    },
  };

  if (contentNode.name === 'w:r') {
    const runProps = contentNode.elements.find((el) => el.name === 'w:rPr');

    if (runProps) {
      const foundColor = runProps.elements.find((el) => el.name === 'w:color');
      const foundHyperlinkStyle = runProps.elements.find((el) => el.name === 'w:rStyle');
      const underlineMark = runProps.elements.find((el) => el.name === 'w:u');
      if (!foundColor) runProps.elements.unshift(color);
      if (!foundHyperlinkStyle) runProps.elements.unshift(hyperlinkStyle);
      if (!underlineMark) runProps.elements.unshift(underline);
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
export function addNewLinkRelationship(params, link) {
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
 * Translate a list node
 *
 * @param {ExportParams} params
 * @returns {XmlReadyNode} The translated list node
 */
function translateList(params) {
  const { node, editor } = params;

  const listItem = node.content[0];
  const { numId, level } = listItem.attrs;
  const listType = node.type.name;
  const listDef = ListHelpers.getListDefinitionDetails({ numId, level, listType, editor });
  if (!listDef) {
    ListHelpers.generateNewListDefinition({
      numId,
      listType,
      editor,
    });
  }

  let numPrTag;

  // These should exist for all imported nodes
  if (numId !== undefined && numId !== null) {
    numPrTag = generateNumPrTag(numId, level);
  }

  // Collapse multiple paragraphs into a single node for this list item
  // In docx we need a single paragraph, but can include line breaks in a run
  const collapsedParagraphNode = convertMultipleListItemsIntoSingleNode(listItem);

  let outputNode = exportSchemaToJson({ ...params, node: collapsedParagraphNode });

  /**
   * MS Word does not allow paragraphs inside lists (which are just paragraphs in OOXML)
   * So we need to turn paragraphs into runs and add line breaks
   *
   * Two cases:
   *  1. Final doc (keep paragraph field content inside list item)
   *  2. Not final doc (keep w:sdt node, process its content)
   */
  if (Array.isArray(outputNode) && params.isFinalDoc) {
    const parsedElements = [];
    outputNode?.forEach((node, index) => {
      if (node?.elements) {
        const runs = node.elements?.filter((n) => n.name === 'w:r');
        parsedElements.push(...runs);

        if (node.name === 'w:p' && index < outputNode.length - 1) {
          parsedElements.push({
            name: 'w:br',
          });
        }
      }
    });

    outputNode = {
      name: 'w:p',
      elements: [{ name: 'w:pPr', elements: [] }, ...parsedElements],
    };
  }

  /** Case 2: Process w:sdt content */
  let nodesToFlatten = [];
  const sdtNodes = outputNode.elements?.filter((n) => n.name === 'w:sdt');
  if (sdtNodes && sdtNodes.length > 0) {
    nodesToFlatten = sdtNodes;
    nodesToFlatten?.forEach((sdtNode) => {
      const sdtContent = sdtNode.elements.find((n) => n.name === 'w:sdtContent');
      const foundRun = sdtContent.elements?.find((el) => el.name === 'w:r'); // this is a regular text field.
      if (sdtContent && sdtContent.elements && !foundRun) {
        const parsedElements = [];
        sdtContent.elements.forEach((element, index) => {
          if (element.name === 'w:rPr' && element.elements?.length) {
            parsedElements.push(element);
          }

          const runs = element.elements?.filter((n) => n.name === 'w:r');
          if (runs && runs.length) {
            parsedElements.push(...runs);
          }

          if (element.name === 'w:p' && index < sdtContent.elements.length - 1) {
            parsedElements.push({
              name: 'w:br',
            });
          }
        });
        sdtContent.elements = parsedElements;
      }
    });
  }

  const pPr = outputNode.elements?.find((n) => n.name === 'w:pPr');
  if (pPr && pPr.elements && numPrTag) {
    pPr.elements.unshift(numPrTag);
  }

  const indentTag = restoreIndent(listItem.attrs.indent);
  indentTag && pPr?.elements?.push(indentTag);

  const runNode = outputNode.elements?.find((n) => n.name === 'w:r');
  const rPr = runNode?.elements?.find((n) => n.name === 'w:rPr');
  if (rPr) pPr.elements.push(rPr);

  if (listItem.attrs.numPrType !== 'inline') {
    const numPrIndex = pPr?.elements?.findIndex((e) => e?.name === 'w:numPr');
    if (numPrIndex !== -1) {
      pPr?.elements?.splice(numPrIndex, 1);
    }
  }

  return [outputNode];
}

/**
 * Convert multiple list items into a single paragraph node
 * This is necessary because in docx, a list item can only have one paragraph,
 * but in PM, a list item can have multiple paragraphs.
 * @param {SchemaNode} listItem The list item node to convert
 * @returns {XmlReadyNode|null} The collapsed paragraph node or null if no content
 */
const convertMultipleListItemsIntoSingleNode = (listItem) => {
  const { content } = listItem;

  if (!content || content.length === 0) {
    return null;
  }

  const firstParagraph = content[0];
  const collapsedParagraph = {
    ...firstParagraph,
    content: [],
  };

  // Collapse all paragraphs into a single paragraph node
  content.forEach((item, index) => {
    if (item.type === 'paragraph') {
      if (index > 0) {
        collapsedParagraph.content.push({
          type: 'lineBreak',
          attrs: {},
          content: [],
        });
      }

      // Add all text nodes and other content directly from this paragraph
      if (item.content && item.content.length > 0) {
        collapsedParagraph.content.push(...item.content);
      }
    } else {
      // For non-paragraph items, add them directly
      collapsedParagraph.content.push(item);
    }
  });

  // Trim duplicate manual breaks while preserving the single break that Word expects
  // between a list item paragraph and following block content (e.g. tables).
  collapsedParagraph.content = collapsedParagraph.content.filter((node, index, nodes) => {
    if (!isLineBreakOnlyRun(node)) return true;
    const prevNode = nodes[index - 1];
    return !(prevNode && isLineBreakOnlyRun(prevNode));
  });

  return collapsedParagraph;
};

const restoreIndent = (indent) => {
  const attributes = {};
  if (!indent) indent = {};
  if (indent.left || indent.left === 0) attributes['w:left'] = pixelsToTwips(indent.left);
  if (indent.right || indent.right === 0) attributes['w:right'] = pixelsToTwips(indent.right);
  if (indent.firstLine || indent.firstLine === 0) attributes['w:firstLine'] = pixelsToTwips(indent.firstLine);
  if (indent.hanging || indent.hanging === 0) attributes['w:hanging'] = pixelsToTwips(indent.hanging);
  if (indent.leftChars || indent.leftChars === 0) attributes['w:leftChars'] = pixelsToTwips(indent.leftChars);

  if (!Object.keys(attributes).length) return;

  return {
    name: 'w:ind',
    type: 'element',
    attributes,
  };
};

const generateNumPrTag = (numId, level) => {
  return {
    name: 'w:numPr',
    type: 'element',
    elements: [
      {
        name: 'w:numId',
        type: 'element',
        attributes: { 'w:val': numId },
      },
      {
        name: 'w:ilvl',
        type: 'element',
        attributes: { 'w:val': level },
      },
    ],
  };
};

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
      if (attrs?.value) {
        markElement.attributes['w:val'] = attrs.value;
      } else {
        delete markElement.attributes;
      }
      markElement.type = 'element';
      break;

    case 'italic':
      if (attrs?.value && attrs.value !== '1' && attrs.value !== true) {
        markElement.attributes['w:val'] = attrs.value;
      } else {
        delete markElement.attributes;
      }
      markElement.type = 'element';
      break;

    case 'underline': {
      const translated = wUnderlineTranslator.decode({
        node: {
          attrs: {
            underlineType: attrs.underlineType ?? attrs.underline ?? null,
            underlineColor: attrs.underlineColor ?? attrs.color ?? null,
            underlineThemeColor: attrs.underlineThemeColor ?? attrs.themeColor ?? null,
            underlineThemeTint: attrs.underlineThemeTint ?? attrs.themeTint ?? null,
            underlineThemeShade: attrs.underlineThemeShade ?? attrs.themeShade ?? null,
          },
        },
      });
      return translated || {};
    }

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

    // Add ability to get run styleIds from textStyle marks and inject to run properties in word
    case 'styleId':
      markElement.name = 'w:rStyle';
      markElement.attributes['w:val'] = attrs.styleId;
      break;

    case 'color': {
      const rawColor = attrs.color;
      if (!rawColor) break;

      const normalized = String(rawColor).trim().toLowerCase();
      if (normalized === 'inherit') {
        markElement.attributes['w:val'] = 'auto';
        break;
      }

      let processedColor = String(rawColor).replace(/^#/, '').replace(/;$/, ''); // Remove `#` and `;` if present
      if (processedColor.startsWith('rgb')) {
        processedColor = rgbToHex(processedColor);
      }
      markElement.attributes['w:val'] = processedColor;
      break;
    }

    case 'textAlign':
      markElement.attributes['w:val'] = attrs.textAlign;
      break;

    case 'textIndent':
      markElement.attributes['w:firstline'] = inchesToTwips(attrs.textIndent);
      break;

    case 'textTransform':
      if (attrs?.textTransform === 'none') {
        markElement.attributes['w:val'] = '0';
      } else {
        delete markElement.attributes;
      }
      markElement.type = 'element';
      break;

    case 'lineHeight':
      markElement.attributes['w:line'] = linesToTwips(attrs.lineHeight);
      break;
    case 'highlight': {
      const highlightValue = attrs.color ?? attrs.highlight ?? null;
      const translated = wHighlightTranslator.decode({ node: { attrs: { highlight: highlightValue } } });
      return translated || {};
    }

    case 'link':
      return {};
  }

  return markElement;
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

export class DocxExporter {
  constructor(converter) {
    this.converter = converter;
  }

  schemaToXml(data, debug = false) {
    const result = this.#generate_xml_as_list(data, debug);
    return result.join('');
  }

  #generate_xml_as_list(data, debug = false) {
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
    if (text === undefined || text === null) return text;
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  #generateXml(node) {
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
      return this.#replaceSpecialCharacters(node.text ?? '');
    }

    if (elements) {
      if (name === 'w:instrText') {
        const textContent = (elements || [])
          .map((child) => (typeof child?.text === 'string' ? child.text : ''))
          .join('');
        tags.push(this.#replaceSpecialCharacters(textContent));
      } else if (name === 'w:t' || name === 'w:delText' || name === 'wp:posOffset') {
        try {
          // test for valid string
          let text = String(elements[0].text);
          text = this.#replaceSpecialCharacters(text);
          tags.push(text);
        } catch (error) {
          console.error('Text element does not contain valid string:', error);
        }
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
    }

    if (!selfClosing) tags.push(`</${name}>`);
    return tags;
  }
}

const translatePageNumberNode = (params) => {
  const outputMarks = processOutputMarks(params.node.attrs?.marksAsAttrs || []);
  return getAutoPageJson('PAGE', outputMarks);
};

const translateTotalPageNumberNode = (params) => {
  const outputMarks = processOutputMarks(params.node.attrs?.marksAsAttrs || []);
  return getAutoPageJson('NUMPAGES', outputMarks);
};

const getAutoPageJson = (type, outputMarks = []) => {
  return [
    {
      name: 'w:r',
      elements: [
        {
          name: 'w:rPr',
          elements: outputMarks,
        },
        {
          name: 'w:fldChar',
          attributes: {
            'w:fldCharType': 'begin',
          },
        },
      ],
    },
    {
      name: 'w:r',
      elements: [
        {
          name: 'w:rPr',
          elements: outputMarks,
        },
        {
          name: 'w:instrText',
          attributes: { 'xml:space': 'preserve' },
          elements: [
            {
              type: 'text',
              text: ` ${type}`,
            },
          ],
        },
      ],
    },
    {
      name: 'w:r',
      elements: [
        {
          name: 'w:rPr',
          elements: outputMarks,
        },
        {
          name: 'w:fldChar',
          attributes: {
            'w:fldCharType': 'separate',
          },
        },
      ],
    },
    {
      name: 'w:r',
      elements: [
        {
          name: 'w:rPr',
          elements: outputMarks,
        },
        {
          name: 'w:fldChar',
          attributes: {
            'w:fldCharType': 'end',
          },
        },
      ],
    },
  ];
};
