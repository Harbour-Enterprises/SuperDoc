import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { hasTextNode, parseProperties } from './importerHelpers.js';
import { preProcessNodesForFldChar, getParagraphSpacing } from './paragraphNodeImporter.js';
import { mergeTextNodes } from './mergeTextNodes.js';
import { ErrorWithDetails } from '../../../helpers/ErrorWithDetails.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleListNode = (params) => {
  const { nodes } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:p') {
    return { nodes: [], consumed: 0 };
  }
  const node = carbonCopy(nodes[0]);

  // We need to pre-process paragraph nodes to combine various possible elements we will find ie: lists, links.
  const processedElements = preProcessNodesForFldChar(node.elements);
  node.elements = processedElements;
  
  const pPr = node.elements.find((el) => el.name === 'w:pPr');

  // Check if this paragraph node is a list
  if (testForList(node)) {
    // Get all siblings that are list items and haven't been processed yet.
    const siblings = carbonCopy(nodes);
    const listItems = [];

    // Iterate each item until we find the end of the list (a non-list item),
    // then send to the list handler for processing.
    let possibleList = siblings.shift();
    while (possibleList && testForList(possibleList, true)) {
      listItems.push(possibleList);
      possibleList = siblings.shift();
      if (possibleList?.elements && !hasTextNode(possibleList.elements)) {
        listItems.push(possibleList);
        possibleList = siblings.shift();
      }
    }

    const listNodes = handleListNodes(listItems, params, 0);
    return {
      nodes: [listNodes],
      consumed: listItems.filter((i) => i.seen).length,
    };
  } else {
    return { nodes: [], consumed: 0 };
  }
};

/**
 * @type {import("docxImporter").NodeHandlerEntry}
 */
export const listHandlerEntity = {
  handlerName: 'listHandler',
  handler: handleListNode,
};

/**
 * List processing
 *
 * This recursive function takes a list of known list items and combines them into nested lists.
 *
 * It begins with listLevel = 0, and if we find an indented node, we call this function again and increase the level.
 * with the same set of list items (as we do not know the node levels until we process them).
 *
 * @param {Array} listItems - Array of list items to process.
 * @param {ParsedDocx} docx - The parsed docx object.
 * @param {NodeListHandler} nodeListHandler - The node list handler function.
 * @param {boolean} insideTrackChange - Whether we are inside a track change.
 * @param {number} [listLevel=0] - The current indentation level of the list.
 * @returns {Object} The processed list node with structured content.
 */
function handleListNodes(
  listItems,
  params,
  listLevel = 0,
  actualListLevel = 0,
  currentListNumId = null,
  path = '',
  isNested = false,
) {
  const { docx, nodeListHandler, insideTrackChange } = params;
  const parsedListItems = [];
  let overallListType;
  let listStyleType;

  const handleStandardNode = nodeListHandler.handlerEntities.find(
    (e) => e.handlerName === 'standardNodeHandler',
  )?.handler;
  if (!handleStandardNode) {
    console.error('Standard node handler not found');
    return { nodes: [], consumed: 0 };
  }

  let listItemIndices = {};
  const initialpPr = listItems[0].elements.find((el) => el.name === 'w:pPr');
  const initialNumPr = initialpPr?.elements?.find((el) => el.name === 'w:numPr');
  const initialNumIdTag = initialNumPr?.elements?.find((el) => el.name === 'w:numId') || {};
  const { attributes: numIdAttrs = {} } = initialNumIdTag;
  currentListNumId = numIdAttrs['w:val'];
  actualListLevel = parseInt(initialNumPr?.elements?.find((el) => el.name === 'w:ilvl')?.attributes['w:val']) || 0;
  let lastNestedListLevel = 0;

  for (let [index, item] of listItems.entries()) {
    // Skip items we've already processed
    if (item.seen) continue;

    // Sometimes there are paragraph nodes that only have pPr element and no text node - these are
    // Spacers in the XML and need to be appended to the last item.
    if (item.elements && !hasTextNode(item.elements)) {
      const n = handleStandardNode({ ...params, nodes: [item] }).nodes[0];
      parsedListItems[parsedListItems.length - 1]?.content.push(n);
      item.seen = true;
      continue;
    }

    // Get the properties of the node - this is where we will find depth level for the node
    // As well as many other list properties
    const { attributes, elements, marks = [] } = parseProperties(item, docx);
    const textStyle = marks.find((mark) => mark.type === 'textStyle');
    
    const { listType, listOrderingType, ilvl, listrPrs, listpPrs, start, lvlText, lvlJc, numId } =
      getNodeNumberingDefinition(attributes, listLevel, docx);
    listStyleType = listOrderingType;
    const intLevel = parseInt(ilvl);

    const isRoot = actualListLevel === intLevel && numId === currentListNumId;
    const isSameListLevelDef = isSameListLevelDefsExceptStart({
      firstListId: numId,
      secondListId: currentListNumId,
      level: intLevel,
      pStyleId: null,
      docx,
    });
    const isDifferentList = numId !== currentListNumId && !isSameListLevelDef;
    const isNested =
      listLevel < intLevel || (listLevel === intLevel && isDifferentList && lastNestedListLevel === listLevel);

    // If this node belongs on this list level, add it to the list
    const nodeAttributes = {};
    if (isRoot) {
      overallListType = listType;
      item.seen = true;

      const schemaElements = [];
      
      let parNode = {
        type: 'paragraph',
        content: nodeListHandler.handler({ ...params, nodes: [ attributes.paragraphProperties, ...elements ] })?.filter((n) => n),
      };

      // Normalize text nodes.
      if (parNode.content) {
        parNode = {
          ...parNode,
          attrs: {
            textAlign: textStyle?.attrs.textAlign
          },
          content: mergeTextNodes(parNode.content),
        };
      }

      schemaElements.push(parNode);
      lastNestedListLevel = listLevel;

      if (!(intLevel in listItemIndices)) listItemIndices[intLevel] = parseInt(start);
      else listItemIndices[intLevel] += 1;

      let thisItemPath = [];
      if (listStyleType !== 'bullet') {
        thisItemPath = [...path, listItemIndices[intLevel]];
      }

      if (listpPrs) nodeAttributes['listParagraphProperties'] = listpPrs;
      if (listrPrs) nodeAttributes['listRunProperties'] = listrPrs;
      nodeAttributes['textStyle'] = textStyle;
      nodeAttributes['order'] = start;
      nodeAttributes['lvlText'] = lvlText;
      nodeAttributes['textAlign'] = textStyle?.attrs.textAlign;
      nodeAttributes['listLevel'] = thisItemPath;
      nodeAttributes['listNumberingType'] = listOrderingType;
      nodeAttributes['attributes'] = {
        parentAttributes: attributes || null,
      };
      nodeAttributes['numId'] = numId;
      
      if (docx) {
        const defaultStyleId = attributes['w:rsidRDefault'];
        nodeAttributes['spacing'] = getParagraphSpacing(defaultStyleId, item, docx);
      }

      const newListItem = createListItem(schemaElements, nodeAttributes, marks);
      parsedListItems.push(newListItem);
    }

    // If this item belongs in a deeper list level, we need to process it by calling this function again
    // But going one level deeper.
    else if (isNested) {
      const newPath = [...path, listItemIndices[listLevel]];
      const sublist = handleListNodes(
        listItems.slice(index),
        params,
        listLevel + 1,
        listLevel,
        numId,
        newPath,
        true,
      );
      lastNestedListLevel = sublist.lastNestedListLevel;
      delete sublist.lastNestedListLevel;
      const lastItem = parsedListItems[parsedListItems.length - 1];
      if (!lastItem) {
        parsedListItems.push(createListItem([sublist], nodeAttributes, []));
      } else {
        lastItem.content.push(sublist);
      }
    }

    // If this item belongs in a higher list level, we need to break out of the loop and return to higher levels
    else {
      lastNestedListLevel = listLevel;
      break;
    }
  }

  const resultingList = {
    type: overallListType || 'bulletList',
    content: parsedListItems,
    attrs: {
      'list-style-type': listStyleType,
      attributes: {
        parentAttributes: listItems[0]?.attributes || null,
      },
    },
  };

  if (isNested) resultingList.lastNestedListLevel = lastNestedListLevel;
  return resultingList;
}

/**
 *
 * @param {XmlNode} node
 * @param {boolean} isInsideList
 * @returns {boolean|*}
 */
export function testForList(node, isInsideList = false) {
  const { elements } = node;
  const pPr = elements?.find((el) => el.name === 'w:pPr');
  if (!pPr) return false;

  const paragraphStyle = pPr.elements?.find((el) => el.name === 'w:pStyle');
  const isList = paragraphStyle?.attributes['w:val'] === 'ListParagraph';
  const hasNumPr = pPr.elements?.find((el) => el.name === 'w:numPr');
  return isList || hasNumPr;
}

/**
 * Creates a list item node with specified content and marks.
 *
 * @param {Array} content - The content of the list item.
 * @param {Array} marks - The marks associated with the list item.
 * @returns {Object} The created list item node.
 */
function createListItem(content, attrs, marks) {
  return {
    type: 'listItem',
    content,
    attrs,
    marks,
  };
}

const orderedListTypes = [
  'decimal', // eg: 1, 2, 3, 4, 5, ...
  'decimalZero', // eg: 01, 02, 03, 04, 05, ...
  'lowerRoman', // eg: i, ii, iii, iv, v, ...
  'upperRoman', // eg: I, II, III, IV, V, ...
  'lowerLetter', // eg: a, b, c, d, e, ...
  'upperLetter', // eg: A, B, C, D, E, ...
  'ordinal', // eg: 1st, 2nd, 3rd, 4th, 5th, ...
  'cardinalText', // eg: one, two, three, four, five, ...
  'ordinalText', // eg: first, second, third, fourth, fifth, ...
  'hex', // eg: 0, 1, 2, ..., 9, A, B, C, ..., F, 10, 11, ...
  'chicago', // eg: (0, 1, 2, ..., 9, 10, 11, 12, ..., 19, 1A, 1B, 1C, ..., 1Z, 20, 21, ..., 2Z)
  'none', // No bullet
];

const unorderedListTypes = [
  'bullet', // A standard bullet point (•)
  'square', // Square bullets (▪)
  'circle', // Circle bullets (◦)
  'disc', // Disc bullets (●)
];

/**
 * Helper to check if all elements in a list def level are the same except
 * the start number value. If so, we can consider these the same list
 * @param {string} firstListId The numId of the first list to compare.
 * @param {string} secondListId The numId of the second list to compare.
 * @param {int} level The ilvl of the list level to compare.
 * @param {Object} docx The docx data
 * @returns {boolean} Whether the list level definitions are the same based on this specific rule.
 */
const isSameListLevelDefsExceptStart = ({ firstListId, secondListId, level, pStyleId, docx }) => {
  const { numFmt, lvlText, lvlJc } = getListLevelDefinitionTag(firstListId, level, pStyleId, docx);
  const {
    numFmt: numFmt2,
    lvlText: lvlText2,
    lvlJc: lvlJc2,
  } = getListLevelDefinitionTag(secondListId, level, pStyleId, docx);

  const sameNumFmt = numFmt === numFmt2;
  const sameLvlText = lvlText === lvlText2;
  const sameLvlJc = lvlJc === lvlJc2;
  return sameNumFmt && sameLvlText && sameLvlJc;
};

const getListNumIdFromStyleRef = (styleId, docx) => {
  const styles = docx['word/styles.xml'];
  if (!styles) return null;

  const { elements } = styles;
  const styleTags = elements[0].elements.filter((style) => style.name === 'w:style');
  const style = styleTags.find((tag) => tag.attributes['w:styleId'] === styleId) || {};
  const pPr = style?.elements?.find((style) => style.name === 'w:pPr');
  if (!pPr) return null;

  const numPr = pPr?.elements?.find((style) => style.name === 'w:numPr');
  if (!numPr) return null;

  const numIdTag = numPr?.elements?.find((style) => style.name === 'w:numId') || {};
  const numId = numIdTag?.attributes['w:val'];
  const ilvlTag = numPr?.elements?.find((style) => style.name === 'w:ilvl');
  const ilvl = ilvlTag?.attributes['w:val'];
  return { numId, ilvl };
};

/**
 * Helper to get the list level definition tag for a specific list level
 * @param {string} numId The numId of the list
 * @param {string} level The level of the list
 * @param {Object} docx The docx data
 * @returns {Object} The list level definition tag start, numFmt, lvlText and lvlJc
 */
const getListLevelDefinitionTag = (numId, level, pStyleId, docx) => {
  const def = docx['word/numbering.xml'];
  if (!def) return {};

  const { elements } = def;
  const listData = elements[0];

  if (pStyleId) {
    const { numId: numIdFromStyles, ilvl: iLvlFromStyles } = getListNumIdFromStyleRef(pStyleId, docx) || {};
    if (numIdFromStyles) numId = numIdFromStyles;
    if (iLvlFromStyles) level = iLvlFromStyles ? parseInt(iLvlFromStyles) : null;
  }

  const numberingElements = listData.elements;
  const abstractDefinitions = numberingElements.filter((style) => style.name === 'w:abstractNum');
  const numDefinitions = numberingElements.filter((style) => style.name === 'w:num');
  const numDefinition = numDefinitions.find((style) => style.attributes['w:numId'] === numId);

  const abstractNumId = numDefinition?.elements[0].attributes['w:val'];
  const listDefinitionForThisNumId = abstractDefinitions?.find(
    (style) => style.attributes['w:abstractNumId'] === abstractNumId,
  );
  const currentLevel = getDefinitionForLevel(listDefinitionForThisNumId, level);

  const numStyleLink = listDefinitionForThisNumId?.elements?.find((style) => style.name === 'w:numStyleLink');
  const numStyleLinkId = numStyleLink?.attributes['w:val'];
  if (numStyleLinkId) {
    const current = getListNumIdFromStyleRef(numStyleLinkId, docx);
    return getListLevelDefinitionTag(current.numId, level, null, docx);
  }

  const start = currentLevel?.elements?.find((style) => style.name === 'w:start')?.attributes['w:val'];
  const numFmt = currentLevel?.elements?.find((style) => style.name === 'w:numFmt')?.attributes['w:val'];
  const lvlText = currentLevel?.elements?.find((style) => style.name === 'w:lvlText').attributes['w:val'];
  const lvlJc = currentLevel?.elements?.find((style) => style.name === 'w:lvlJc').attributes['w:val'];
  const pPr = currentLevel?.elements?.find((style) => style.name === 'w:pPr');
  const rPr = currentLevel?.elements?.find((style) => style.name === 'w:rPr');
  return { start, numFmt, lvlText, lvlJc, pPr, rPr };
};

/**
 * Main function to get list item information from numbering.xml
 *
 * @param {object} attributes
 * @param {int} level
 * @param {ParsedDocx} docx
 * @returns
 */
export function getNodeNumberingDefinition(attributes, level, docx) {
  if (!attributes) return;

  const { paragraphProperties = {} } = attributes;
  const { elements: listStyles = [] } = paragraphProperties;
  const numPr = listStyles.find((style) => style.name === 'w:numPr');
  if (!numPr) {
    return {};
  }

  // Get the indent level
  const ilvlTag = numPr.elements.find((style) => style.name === 'w:ilvl');
  const ilvl = ilvlTag.attributes['w:val'];

  // Get the list style id
  const numIdTag = numPr.elements.find((style) => style.name === 'w:numId');
  const numId = numIdTag.attributes['w:val'];

  const pStyle = listStyles.find((style) => style.name === 'w:pStyle');
  const pStyleId = pStyle?.attributes['w:val'];
  const {
    start,
    numFmt: listTypeDef,
    lvlText,
    lvlJc,
    pPr,
    rPr,
  } = getListLevelDefinitionTag(numId, level, pStyleId, docx);

  // Properties - there can be run properties and paragraph properties
  let listpPrs, listrPrs;

  if (pPr) listpPrs = _processListParagraphProperties(pPr);
  if (rPr) listrPrs = _processListRunProperties(rPr);

  // Get style for this list level
  let listType;
  if (unorderedListTypes.includes(listTypeDef?.toLowerCase())) listType = 'bulletList';
  else if (orderedListTypes.includes(listTypeDef)) listType = 'orderedList';
  else {
    throw new ErrorWithDetails('ListParsingError', `Unknown list type found during import: ${listTypeDef}`, { 
      listOrderingType: listTypeDef, ilvl, numId, listrPrs, listpPrs, start, lvlText, lvlJc 
    });
    // throw new Error(`Unknown list type found during import: ${listTypeDef}`);
  }

  return { listType, listOrderingType: listTypeDef, ilvl, numId, listrPrs, listpPrs, start, lvlText, lvlJc };
}

function getDefinitionForLevel(data, level) {
  return data?.elements?.find((item) => Number(item.attributes['w:ilvl']) === level);
}

function _processListParagraphProperties(data) {
  const { elements } = data;
  const expectedTypes = ['w:ind', 'w:jc', 'w:tabs'];
  const paragraphProperties = {};
  if (!elements) return paragraphProperties;

  elements.forEach((item) => {
    if (!expectedTypes.includes(item.name))
      console.warn(`[numbering.xml] Unexpected list paragraph prop found: ${item.name}`);
    const { attributes = {} } = item;
    Object.keys(attributes).forEach((key) => {
      paragraphProperties[key] = attributes[key];
    });
  });
  return paragraphProperties;
}

function _processListRunProperties(data) {
  const { elements } = data;
  const expectedTypes = [
    'w:rFonts',
    'w:b',
    'w:bCs',
    'w:i',
    'w:iCs',
    'w:strike',
    'w:dstrike',
    'w:color',
    'w:sz',
    'w:szCs',
    'w:u',
    'w:bdr',
    'w:shd',
    'w:vertAlign',
    'w:jc',
    'w:spacing',
    'w:w',
    'w:smallCaps',
    'w:position',
    'w:lang',
  ];
  const runProperties = {};
  if (!elements) return runProperties;

  elements.forEach((item) => {
    if (!expectedTypes.includes(item.name))
      console.warn(`[numbering.xml] Unexpected list run prop found: ${item.name}`);
    const { attributes = {} } = item;
    Object.keys(attributes).forEach((key) => {
      runProperties[key] = attributes[key];
    });
  });
  return runProperties;
}
