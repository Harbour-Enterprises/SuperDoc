import { getInitialJSON } from '../docxHelper.js';
import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { twipsToInches } from '../../helpers.js';
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

  const nodeListHandler = defaultNodeListHandler();

  const bodyNode = json.elements[0].elements.find((el) => el.name === 'w:body');
  if (bodyNode) {
    const node = bodyNode;
    const ignoreNodes = ['w:sectPr'];
    const content = node.elements?.filter((n) => !ignoreNodes.includes(n.name)) ?? [];

    const parsedContent = nodeListHandler.handler({
      nodes: content, nodeListHandler, docx, converter, editor
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
        converter?.fileSource,
        converter?.documentId,
        'document_import', 
        {
        documentType: 'docx',
        internalId: converter?.documentInternalId,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      pmDoc: result,
      savedTagsToRestore: node,
      pageStyles: getDocumentStyles(node, docx, converter, editor),
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
   * @returns {Object} Safe context object
   */
  const getSafeElementContext = (elements, index) => {
    if (!elements || index < 0 || index >= elements.length) {
      return {
        elementIndex: index,
        error: 'index_out_of_bounds',
        arrayLength: elements?.length
      };
    }

    const element = elements[index];
    return {
      elementIndex: index,
      elementName: element?.name,
      elementAttributes: element?.attributes,
      hasElements: !!element?.elements,
      elementCount: element?.elements?.length
    };
  };

  const nodeListHandlerFn = ({ nodes: elements, docx, insideTrackChange, converter, editor, filename }) => {
    if (!elements || !elements.length) return [];
    
    const processedElements = [];
    const unhandledNodes = [];
    
    try {
      for (let index = 0; index < elements.length; index++) {
        try {
          const nodesToHandle = elements.slice(index);
          if (!nodesToHandle || nodesToHandle.length === 0) {
            converter?.telemetry?.trackParsing(
              converter?.fileSource,
              converter?.documentId,
              'node', 
              'empty_slice', 
              `/word/${filename || 'document.xml'}`, 
              {
              index,
              internalId: converter?.documentInternalId,
              totalElements: elements.length,
            });
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

          // Track unhandled nodes with safe context
          if (unhandled) {
            const context = getSafeElementContext(elements, index);
            if (!context.elementName) continue;

            unhandledNodes.push({
              name: context.elementName,
              attributes: context.elementAttributes
            });

            converter?.telemetry?.trackParsing(
              converter?.fileSource,
              converter?.documentId,
              'node', 
              'unhandled', 
              `/word/${filename || 'document.xml'}`, 
              {
              context,
              internalId: converter?.documentInternalId,
            });
            
            continue;
          }
          
          // Bounds check before incrementing index
          if (consumed > 0) {
            index += consumed - 1;
            if (index < 0) {
              converter?.telemetry?.trackParsing(
                converter?.fileSource,
                converter?.documentId,
                'node', 
                'invalid_index', 
                `/word/${filename || 'document.xml'}`, 
                {
                  originalIndex: index - (consumed - 1),
                  consumed,
                  resultingIndex: index,
                  internalId: converter?.documentInternalId, 
                }
              );
              index = 0; // Reset to safe value
            }
          }
          
          // Process valid nodes
          for (let node of (nodes || [])) {
            if (node?.type) {
              const ignore = ['runProperties'];
              
              if (node.type === 'text' && Array.isArray(node.content) && !node.content.length) {
                
                converter?.telemetry?.trackParsing(
                  converter?.fileSource,
                  converter?.documentId,
                  'node', 
                  'empty_text', 
                  `/word/${filename || 'document.xml'}`, 
                  {
                  context: node.attrs,
                  internalId: converter?.documentInternalId,
                });
                continue;
              }

              if (!ignore.includes(node.type)) {
                processedElements.push(node);
              }
            }
          }
        } catch (error) {
          editor?.emit('exception', { error });
          
          const context = getSafeElementContext(elements, index);
          if (error.details) {
            context.elementAttributes = error.details;
          }
          
          // Track individual element processing errors with safe context
          converter?.telemetry?.trackParsing(
            converter?.fileSource,
            converter?.documentId,
            'element', 
            'processing_error', 
            `/word/${filename || 'document.xml'}`, 
            {
              error: {
                message: error.message,
                name: error.name,
                stack: error.stack,
              },
              internalId: converter?.documentInternalId,
              context 
            }
          );
        }
      }

      return processedElements;
    } catch (error) {
      editor?.emit('exception', { error });
      
      // Track catastrophic errors in the node list handler
      converter?.telemetry?.trackParsing(
        converter?.fileSource,
        converter?.documentId,
        'handler', 
        'nodeListHandler', 
        `/word/${filename || 'document.xml'}`,
        {
          status: 'error',
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack
          },
          internalId: converter?.documentInternalId,
          context: {
            totalElements: elements?.length || 0,
            processedCount: processedElements.length,
            unhandledCount: unhandledNodes.length,
          }
        }
      );
      throw error;
    }
  };

  return nodeListHandlerFn;
};

/**
 *
 * @param {XmlNode} node
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
};
