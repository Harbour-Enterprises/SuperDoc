import { getInitialJSON } from '../docxHelper.js';
import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { twipsToInches } from '../../helpers.js';
import { DEFAULT_LINKED_STYLES } from '../../exporter-docx-defs.js';
import { tableNodeHandlerEntity } from './tableImporter.js';
import { drawingNodeHandlerEntity } from './imageImporter.js';
import { trackChangeNodeHandlerEntity } from './trackChangesImporter.js';
import { hyperlinkNodeHandlerEntity } from './hyperlinkImporter.js';
import { runNodeHandlerEntity } from './runNodeImporter.js';
import { textNodeHandlerEntity } from './textNodeImporter.js';
import { paragraphNodeHandlerEntity } from './paragraphNodeImporter.js';
import { annotationNodeHandlerEntity } from './annotationImporter.js';
import { standardNodeHandlerEntity } from './standardNodeImporter.js';
import { lineBreakNodeHandlerEntity } from './lineBreakImporter.js';
import { bookmarkNodeHandlerEntity } from './bookmarkNodeImporter.js';
import { tabNodeEntityHandler } from './tabImporter.js';
import { listHandlerEntity } from './listImporter.js';
import { importCommentData } from './documentCommentsImporter.js';
import { getDefaultStyleDefinition } from './paragraphNodeImporter.js';

/**
 * @typedef {import()} XmlNode
 * @typedef {{type: string, content: *, attrs: {}}} PmNodeJson
 * @typedef {{type: string, attrs: {}}} PmMarkJson
 *
 * @typedef {(nodes: XmlNode[], docx: ParsedDocx, insideTrackCahange: boolean) => PmNodeJson[]} NodeListHandlerFn
 * @typedef {{handler: NodeListHandlerFn, handlerEntities: NodeHandlerEntry[]}} NodeListHandler
 *
 * @typedef {(nodes: XmlNode[], docx: ParsedDocx, nodeListHandler: NodeListHandler, insideTrackCahange: boolean) => {nodes: PmNodeJson[], consumed: number}} NodeHandler
 * @typedef {{handlerName: string, handler: NodeHandler}} NodeHandlerEntry
 */

/**
 *
 * @param {ParsedDocx} docx
 * @param {SuperConverter} converter instance.
 * @param {Editor} editor instance.
 * @returns {{pmDoc: PmNodeJson, savedTagsToRestore: XmlNode, pageStyles: *}|null}
 */
export const createDocumentJson = (docx, converter, editor) => {
  const json = carbonCopy(getInitialJSON(docx));
  if (!json) return null;

  // Track initial document structure
  if (converter?.telemetry) {
    const files = Object.keys(docx).map((filePath) => {
      const parts = filePath.split('/');
      return {
        filePath,
        fileDepth: parts.length,
        fileType: filePath.split('.').pop(),
      };
    });

    converter.telemetry.trackFileStructure(
      {
        totalFiles: files.length,
        maxDepth: Math.max(...files.map((f) => f.fileDepth)),
        totalNodes: 0,
        files,
      },
      converter.fileSource,
      converter.documentId,
      converter.documentInternalId,
    );
  }

  const nodeListHandler = defaultNodeListHandler();
  const bodyNode = json.elements[0].elements.find((el) => el.name === 'w:body');

  if (bodyNode) {
    const node = bodyNode;
    const ignoreNodes = ['w:sectPr'];
    const content = node.elements?.filter((n) => !ignoreNodes.includes(n.name)) ?? [];
    const comments = importCommentData({ docx, nodeListHandler, converter, editor });

    const parsedContent = nodeListHandler.handler({
      nodes: content,
      nodeListHandler,
      docx,
      converter,
      editor,
    });

    const result = {
      type: 'doc',
      content: parsedContent,
      attrs: {
        attributes: json.elements[0].attributes,
      },
    };

    // Not empty document
    if (result.content.length > 1) {
      converter?.telemetry?.trackUsage(
        'document_import',
        {
          documentType: 'docx',
          timestamp: new Date().toISOString()
        }
      );
    }
    
    return {
      pmDoc: result,
      savedTagsToRestore: node,
      pageStyles: getDocumentStyles(node, docx, converter, editor),
      comments,
      linkedStyles: getStyleDefinitions(docx, converter, editor),
    };
  }
  return null;
};

export const defaultNodeListHandler = () => {
  const entities = [
    runNodeHandlerEntity,
    paragraphNodeHandlerEntity,
    listHandlerEntity,
    textNodeHandlerEntity,
    lineBreakNodeHandlerEntity,
    annotationNodeHandlerEntity,
    bookmarkNodeHandlerEntity,
    hyperlinkNodeHandlerEntity,
    drawingNodeHandlerEntity,
    trackChangeNodeHandlerEntity,
    tableNodeHandlerEntity,
    tabNodeEntityHandler,
    standardNodeHandlerEntity, //this should be the last one, bcs this parses everything!!!
  ];

  const handler = createNodeListHandler(entities);
  return {
    handler,
    handlerEntities: entities,
  };
};

/**
 *
 * @param {NodeHandlerEntry[]} nodeHandlers
 */
const createNodeListHandler = (nodeHandlers) => {
  /**
   * Gets safe element context even if index is out of bounds
   * @param {Array} elements Array of elements
   * @param {number} index Index to check
   * @param {Object} processedNode result node
   * @param {String} path Occurrence filename
   * @returns {Object} Safe context object
   */
  const getSafeElementContext = (elements, index, processedNode, path) => {
    if (!elements || index < 0 || index >= elements.length) {
      return {
        elementIndex: index,
        error: 'index_out_of_bounds',
        arrayLength: elements?.length
      };
    }

    const element = elements[index];
    return {
      elementName: element?.name,
      attributes: processedNode?.attrs,
      marks: processedNode?.marks,
      elementPath: path,
      type: processedNode?.type,
      content: processedNode?.content,
    };
  };

  const nodeListHandlerFn = ({ nodes: elements, docx, insideTrackChange, converter, editor, filename }) => {
    if (!elements || !elements.length) return [];
    
    const processedElements = [];
    
    try {
      for (let index = 0; index < elements.length; index++) {
        try {
          const nodesToHandle = elements.slice(index);
          if (!nodesToHandle || nodesToHandle.length === 0) {
            continue;
          }

          const { nodes, consumed, unhandled } = nodeHandlers.reduce(
            (res, handler) => {
              if (res.consumed > 0) return res;
              
              return handler.handler({
                nodes: nodesToHandle,
                docx,
                nodeListHandler: { handler: nodeListHandlerFn, handlerEntities: nodeHandlers },
                insideTrackChange,
                converter,
                editor,
                filename
              });
            },
            { nodes: [], consumed: 0 }
          );

          // Only track unhandled nodes that should have been handled
          const context = getSafeElementContext(elements, index, nodes[0], `/word/${filename || 'document.xml'}`);
          if (unhandled) {
            if (!context.elementName) continue;

            converter?.telemetry?.trackStatistic('unknown', context);
            continue;
          } else {
            converter?.telemetry?.trackStatistic('node', context);
            
            // Use Telemetry to track list item attributes
            if (context.type === 'orderedList' || context.type === 'bulletList') {
              context.content.forEach((item) => {
                const innerItemContext = getSafeElementContext([item], 0, item, `/word/${filename || 'document.xml'}`);
                converter?.telemetry?.trackStatistic('attributes', innerItemContext);
              })
            }
            
            const hasHighlightMark = nodes[0]?.marks?.find(mark => mark.type === 'highlight');
            if (hasHighlightMark) {
              converter?.docHiglightColors.add(hasHighlightMark.attrs.color.toUpperCase());
            }
          }

          // Process and store nodes (no tracking needed for success)
          if (nodes) {
            nodes.forEach((node) => {
              if (node?.type && !['runProperties'].includes(node.type)) {
                if (node.type === 'text' && Array.isArray(node.content) && !node.content.length) {
                  return;
                }
                processedElements.push(node);
              }
            });
          }
        } catch (error) {
          editor?.emit('exception', { error });

          converter?.telemetry?.trackStatistic('error', {
            type: 'processing_error',
            message: error.message,
            name: error.name,
            stack: error.stack,
            fileName: `/word/${filename || 'document.xml'}`,
          });
        }
      }

      return processedElements;
    } catch (error) {
      editor?.emit('exception', { error });

      // Track only catastrophic handler failures
      converter?.telemetry?.trackStatistic('error', {
        type: 'fatal_error',
        message: error.message,
        name: error.name,
        stack: error.stack,
        fileName: `/word/${filename || 'document.xml'}`,
      });
      
      throw error;
    }
  };
  return nodeListHandlerFn;
};

/**
 *
 * @param {XmlNode} node
 * @param {ParsedDocx} docx
 * @param {SuperConverter} converter instance.
 * @param {Editor} editor instance.
 * @returns {Object} The document styles object
 */
function getDocumentStyles(node, docx, converter, editor) {
  const sectPr = node.elements?.find((n) => n.name === 'w:sectPr');
  const styles = {};

  sectPr?.elements?.forEach((el) => {
    const { name, attributes } = el;
    switch (name) {
      case 'w:pgSz':
        styles['pageSize'] = {
          width: twipsToInches(attributes['w:w']),
          height: twipsToInches(attributes['w:h']),
        };
        break;
      case 'w:pgMar':
        styles['pageMargins'] = {
          top: twipsToInches(attributes['w:top']),
          right: twipsToInches(attributes['w:right']),
          bottom: twipsToInches(attributes['w:bottom']),
          left: twipsToInches(attributes['w:left']),
          header: twipsToInches(attributes['w:header']),
          footer: twipsToInches(attributes['w:footer']),
          gutter: twipsToInches(attributes['w:gutter']),
        };
        break;
      case 'w:cols':
        styles['columns'] = {
          space: twipsToInches(attributes['w:space']),
          num: attributes['w:num'],
          equalWidth: attributes['w:equalWidth'],
        };
        break;
      case 'w:docGrid':
        styles['docGrid'] = {
          linePitch: twipsToInches(attributes['w:linePitch']),
          type: attributes['w:type'],
        };
        break;
      case 'w:headerReference':
        getHeaderFooter(el, 'header', docx, converter, editor);
        break;
      case 'w:footerReference':
        getHeaderFooter(el, 'footer', docx, converter, editor);
        break;
      case 'w:titlePg':
        converter.headerIds.titlePg = true;
    }
  });
  return styles;
};

/**
 * Import style definitions from the document
 * 
 * @param {Object} docx The parsed docx object
 * @returns {Object[]} The style definitions
 */
function getStyleDefinitions(docx) {
  const styles = docx['word/styles.xml'];
  if (!styles) return [];
  
  const { elements } = styles.elements[0];
  const styleDefinitions = elements.filter((el) => el.name === 'w:style');

  // Track latent style exceptions
  const latentStyles = elements.find((el) => el.name === 'w:latentStyles');
  const matchedLatentStyles = [];
  latentStyles?.elements.forEach((el) => {
    const { attributes } = el;
    const match = styleDefinitions.find((style) => style.attributes['w:styleId'] === attributes['w:name']);
    if (match) matchedLatentStyles.push(el);
  });

  // Parse all styles
  const allParsedStyles = [];
  styleDefinitions.forEach((style) => {
    const id = style.attributes['w:styleId'];
    const parsedStyle = getDefaultStyleDefinition(id, docx);

    const importedStyle = {
      id: style.attributes['w:styleId'],
      type: style.attributes['w:type'],
      definition: parsedStyle,
      attributes: {},
    };

    allParsedStyles.push(importedStyle);
  });

  return allParsedStyles;
};

/**
 * Add default styles if missing. Default styles are:
 * 
 * Normal, Title, Subtitle, Heading1, Heading2, Heading3
 * 
 * Does not mutate the original docx object
 * @param {Object} styles The parsed docx styles [word/styles.xml]
 * @returns {Object | null} The updated styles object with default styles
 */
export function addDefaultStylesIfMissing(styles) {
  // Do not mutate the original docx object
  if (!styles) return null;
  const updatedStyles = carbonCopy(styles);
  const { elements } = updatedStyles.elements[0];

  Object.keys(DEFAULT_LINKED_STYLES).forEach(styleId => {
    const existsOnDoc = elements.some((el) => el.attributes?.['w:styleId'] === styleId);
    if (!existsOnDoc) {
      const missingStyle = DEFAULT_LINKED_STYLES[styleId];
      updatedStyles.elements[0].elements.push(missingStyle);
    }
  })

  return updatedStyles;
}

function getHeaderFooter(el, elementType, docx, converter, editor) {
  const rels = docx['word/_rels/document.xml.rels'];
  const relationships = rels.elements.find((el) => el.name === 'Relationships');
  const { elements } = relationships;

  // sectionType as in default, first, odd, even
  const sectionType = el.attributes['w:type'];

  const rId = el.attributes['r:id'];
  const rel = elements.find((el) => el.attributes['Id'] === rId);
  const target = rel.attributes['Target'];

  // Get the referenced file (ie: header1.xml)
  const referenceFile = docx[`word/${target}`];
  const currentFileName = target;

  const nodeListHandler = defaultNodeListHandler();
  const schema = nodeListHandler.handler({
    nodes: referenceFile.elements[0].elements,
    nodeListHandler,
    docx,
    converter,
    editor,
    filename: currentFileName
  });

  let storage, storageIds;

  if (elementType === 'header') {
    storage = converter.headers;
    storageIds = converter.headerIds;
  } else if (elementType === 'footer') {
    storage = converter.footers;
    storageIds = converter.footerIds;
  }

  storage[rId] = { type: 'doc', content: [...schema] };
  storageIds[sectionType] = rId;
}
