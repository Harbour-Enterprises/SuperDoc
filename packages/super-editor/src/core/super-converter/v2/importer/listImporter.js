import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { hasTextNode, parseProperties } from './importerHelpers.js';
import { preProcessNodesForFldChar, getParagraphSpacing, getParagraphIndent } from './paragraphNodeImporter.js';
import { mergeTextNodes } from './mergeTextNodes.js';
import { ErrorWithDetails } from '../../../helpers/ErrorWithDetails.js';
import { twipsToInches, twipsToPixels, twipsToLines } from '../../helpers.js';

/**
 * @type {import("docxImporter").NodeHandler}
 */
export const handleListNode = (params) => {
  const { nodes, lists, docx } = params;
  if (nodes.length === 0 || nodes[0].name !== 'w:p') {
    return { nodes: [], consumed: 0 };
  }
  const node = carbonCopy(nodes[0]);

  // We need to pre-process paragraph nodes to combine various possible elements we will find ie: lists, links.
  const processedElements = preProcessNodesForFldChar(node.elements);
  node.elements = processedElements;
  
  const originalPpr = node.elements.find((el) => el.name === 'w:pPr');

  // Check if this paragraph node is a list
  if (testForList(node, docx)) {
    // Get all siblings that are list items and haven't been processed yet.
    const siblings = carbonCopy(nodes);
    const listItems = [];

    // Iterate each item until we find the end of the list (a non-list item),
    // then send to the list handler for processing.
    let possibleList = siblings.shift();
    while (possibleList && testForList(possibleList, docx)) {
      listItems.push(possibleList);
      possibleList = siblings.shift();
      if (possibleList?.elements && !hasTextNode(possibleList.elements)) {
        listItems.push(possibleList);
        possibleList = siblings.shift();
      }
    }

    const listNodes = handleListNodes({ listItems, params, originalPpr, level: 0 });
    return {
      nodes: [listNodes],
      consumed: listItems.filter((i) => i.seen).length,
      lists,
    };
  } else {
    return { nodes: [], consumed: 0, lists };
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
function handleListNodes({
  listItems,
  originalPpr,
  params,
  listLevel = 0,
  actualListLevel = 0,
  currentListNumId = null,
  path = '',
  isNested = false,
}) {
  const { docx, nodeListHandler, lists } = params;
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

  const initialpPr = listItems[0].elements.find((el) => el.name === 'w:pPr');
  const styleTag = initialpPr?.elements?.find((el) => el.name === 'w:pStyle');
  const styleId = styleTag?.attributes['w:val'];

  // List numId can come from inline props or styled def
  const numPrTag = getNumPrRecursive({ node: listItems[0], styleId, docx });
  currentListNumId = getNumIdFromTag(numPrTag);

  // List level can come from inline props or styled def
  actualListLevel = parseInt(numPrTag?.elements?.find((el) => el.name === 'w:ilvl')?.attributes['w:val']) || 0;
  if (actualListLevel === undefined) actualListLevel = getOutlineLevelFromStyleTag(styleId, docx);

  let lastNestedListLevel = 0;

  for (let [index, item] of listItems.entries()) {
    // Skip items we've already processed
    if (item.seen) continue;

    // Sometimes there are paragraph nodes that only have pPr element and no text node - these are
    // Spacers in the XML and need to be appended to the last item.
    if (item.elements && !hasTextNode(item.elements)) {
      const n = handleStandardNode({ ...params, nodes: [item] }).nodes[0];
      if (n) parsedListItems[parsedListItems.length - 1]?.content.push(n); 
      item.seen = true;
      continue;
    }

    // Get the properties of the node - this is where we will find depth level for the node
    // As well as many other list properties
    const { attributes, elements, marks = [] } = parseProperties(item, docx);

    const matchedStyle = getStyleTagFromStyleId(styleId, docx) || {};
    const { marks: styleIdMarks } = parseProperties(matchedStyle, docx);
    
    const textStyle = marks.find((mark) => mark.type === 'textStyle');
    const textStyleFromStyles = styleIdMarks?.find((mark) => mark.type === 'textStyle');

    const {
      listType,
      listOrderingType,
      ilvl,
      listrPrs,
      listpPrs,
      start,
      lvlText,
      lvlJc,
      numId
    } = getNodeNumberingDefinition(item, listLevel, docx);

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
    const isNested = (
      listLevel < intLevel
      || listLevel === intLevel && isDifferentList && lastNestedListLevel === listLevel
    );

    // We keep track of all indices for all lists here with an object
    // This allows us to detect disconnected lists and handle them correctly
    if (!lists[currentListNumId]) lists[currentListNumId] = {};
    if (!lists[currentListNumId][listLevel]) {
      lists[currentListNumId][listLevel] = Number(start);
    }

    // If this node belongs on this list level, add it to the list
    const nodeAttributes = {};
    if (isRoot && !isNested) {
      overallListType = listType;
      item.seen = true;

      const schemaElements = [];
      
      let parNode = {
        type: 'paragraph',
        content: nodeListHandler.handler({ ...params, nodes: [ ...elements ] })?.filter((n) => n),
      };
      
      const parIndent = getParagraphIndent({
        elements: [attributes.paragraphProperties]
      }, docx, styleId);
      const parSpacing = getParagraphSpacing({
        elements: [attributes.paragraphProperties]
      }, docx, styleId);
      
      // Normalize text nodes.
      if (parNode.content) {
        parNode = {
          ...parNode,
          attrs: {
            textAlign: textStyle?.attrs.textAlign || textStyleFromStyles?.attrs.textAlign || null,
            rsidRDefault: attributes?.['w:rsidRDefault'] || null,
            hasParentIndent: Object.keys(parIndent).length > 0,
            hasParentSpacing: Object.keys(parSpacing).length > 0,
            ...(styleId && { styleId })
          },
          content: mergeTextNodes(parNode.content),
        };
      }

      schemaElements.push(parNode);
      lastNestedListLevel = listLevel;
    
      let thisItemPath = [];
      if (listStyleType !== 'bullet') {
        thisItemPath = [...path, lists[currentListNumId][listLevel]];
        lists[currentListNumId][actualListLevel]++;  
      }

      // Rebuild a path if we're continuing after a break
      if (!path.length && actualListLevel > 0) {
        const currentDef = lists[currentListNumId];
        if (currentDef) {
          const newPath = [];
          Object.keys(currentDef).forEach((key) => {
            newPath.push(currentDef[key]);
          });
          thisItemPath = newPath;
        }
      }

      // Process additional possible inline styles
      const pPr = item.elements.find((el) => el.name === 'w:pPr');
      let indent = pPr?.elements.find((el) => el.name === 'w:ind');
      const pPrFromStyles = matchedStyle?.elements?.find((style) => style.name === 'w:pPr');
      const stylesIndent = pPrFromStyles?.elements?.find((el) => el.name === 'w:ind');
      if (!indent) indent = stylesIndent;
      
      if (indent) {
        const indentAttrs = {};
        if (!indent.attributes) indent.attributes = {};
        if (indent.attributes['w:left'] !== undefined) indentAttrs.left = twipsToPixels(indent.attributes['w:left']);
        if (indent.attributes['w:right'] !== undefined) indentAttrs.right = twipsToPixels(indent.attributes['w:right']);
        if (indent.attributes['w:firstLine'] !== undefined) indentAttrs.firstLine = twipsToPixels(indent.attributes['w:firstLine']);
        if (indent.attributes['w:hanging'] !== undefined) indentAttrs.hanging = twipsToPixels(indent.attributes['w:hanging']);
        nodeAttributes['indent'] = indentAttrs;
      }

      // Process other core node attributes
      if (listpPrs) nodeAttributes['listParagraphProperties'] = listpPrs;
      if (listrPrs) nodeAttributes['listRunProperties'] = listrPrs;
      nodeAttributes['textStyle'] = textStyle;
      nodeAttributes['order'] = start;
      nodeAttributes['lvlText'] = lvlText;
      nodeAttributes['lvlJc'] = textStyle?.attrs.textAlign;
      nodeAttributes['listLevel'] = thisItemPath;
      nodeAttributes['listNumberingType'] = listOrderingType;
      nodeAttributes['attributes'] = {
        parentAttributes: item?.attributes || null,
      };

      const originalRunProps = originalPpr?.elements?.find((el) => el.name === 'w:rPr');
      if (originalRunProps) {
        nodeAttributes.attributes["originalInlineRunProps"] = originalRunProps;
      };

      nodeAttributes['numId'] = numId;

      if (docx) {
        nodeAttributes['spacing'] = getParagraphSpacing(item, docx, styleId);
      }

      const newListItem = createListItem(schemaElements, nodeAttributes, []);
      parsedListItems.push(newListItem);
    }

    // If this item belongs in a deeper list level, we need to process it by calling this function again
    // But going one level deeper.
    else if (isNested) {
      const newPath = [...path, lists[currentListNumId][listLevel]];
      const sublist = handleListNodes({
        listItems: listItems.slice(index),
        originalPpr,
        params,
        listLevel: listLevel + 1,
        actualListLevel: listLevel,
        currentListNumId: numId,
        path: newPath,
        isNested: true,
      });
      lastNestedListLevel = sublist.lastNestedListLevel;
      delete sublist.lastNestedListLevel;
      const lastItem = parsedListItems[parsedListItems.length - 1];
      if (!lastItem) {
        parsedListItems.push(createListItem([sublist], nodeAttributes, []));
      } else {
        lastItem.content.push(sublist);
      }
    }

    else if (!numId) {
      item.seen = true;
      const n = handleStandardNode({ ...params, nodes: [item] }).nodes[0];
      parsedListItems[parsedListItems.length - 1]?.content.push(n);
    }

    // If this item belongs in a higher list level, we need to break out of the loop and return to higher levels
    else {
      lastNestedListLevel = listLevel;

      if (listLevel > 0 && item.elements[0].elements.find((el)=>el.name==='w:numPr')) {
        lists[currentListNumId][listLevel] = 0;
      }

      break;
    }
  }

  const resultingList = {
    type: overallListType || 'bulletList',
    content: parsedListItems,
    attrs: {
      'list-style-type': listStyleType,
      listId: currentListNumId,
      attributes: {
        parentAttributes: listItems[0]?.attributes || null,
      },
    }
  };

  if (isNested) resultingList.lastNestedListLevel = lastNestedListLevel;

  return resultingList;
}

const getOutlineLevelFromStyleTag = (styleTag, docx) => {
  const matchedStyle = getStyleTagFromStyleId(styleTag, docx);
  const pPr = matchedStyle?.elements?.find((style) => style.name === 'w:pPr');
  const outlineLevel = pPr?.elements?.find((style) => style.name === 'w:outlineLvl');
  
  try {
    return parseInt(outlineLevel?.attributes['w:val']);
  } catch (e) {}
};

/**
 * Checks if the given node is a list or not.
 * 
 * @param {XmlNode} node The node to check.
 * @returns {boolean} Whether the node is a list or not.
 */
export function testForList(node, docx) {
  const { elements } = node;
  const pPr = elements?.find((el) => el.name === 'w:pPr');
  if (!pPr) return false;

  const paragraphStyle = pPr.elements?.find((el) => el.name === 'w:pStyle');
  let numPr = pPr.elements?.find((el) => el.name === 'w:numPr');
  let numId = getNumIdFromTag(numPr);

  const styleId = paragraphStyle?.attributes['w:val'];
  if (styleId && !numId) {
    numPr = getNumPrRecursive({ node, styleId, docx });
    numId = getNumIdFromTag(numPr);
  }

  return !!numId;
};

const getNumIdFromTag = (tag) => {
  return tag?.elements?.find((el) => el.name === 'w:numId')?.attributes['w:val'];
};

/**
 * Get the style tag from the style ID
 * 
 * @param {string} styleId The style ID to search for
 * @param {Object} docx The docx data
 * @returns {Object} The style tag
 */
function getStyleTagFromStyleId(styleId, docx) {
  const styles = docx['word/styles.xml'];
  if (!styles) {
    return {};
  }
  const styleEls = styles.elements;
  const wStyles = styleEls.find((el) => el.name === 'w:styles');
  const styleTags = wStyles.elements.filter((style) => style.name === 'w:style');
  return styleTags.find((tag) => tag.attributes['w:styleId'] === styleId);
}

/**
 * Get the num ID from the style definition
 * This is a recursive function that will check the style definition for the numId
 * If it doesn't exist, it will check the basedOn style definition for the numId
 * This will continue until we find a numId or we run out of basedOn styles
 * 
 * @param {Object} node The node to check
 * @param {string} styleId The style ID to check
 * @param {Object} docx The docx data
 * @param {Set} seenStyleIds The set of style IDs we've already seen to avoid circular references
 * @returns {string|null} The numId or null if not found
 */
function getNumPrRecursive({ node, styleId, docx, seenStyleIds = new Set() }) {
  const initialPpr = node?.elements?.find((el) => el.name === 'w:pPr');
  const initialNumPr = initialPpr?.elements?.find((el) => el.name === 'w:numPr');
  let numPr = initialNumPr;
  let numId = getNumIdFromTag(numPr);
  if (numId) return numPr;

  const matchedStyle = getStyleTagFromStyleId(styleId, docx);
  const pPr = matchedStyle?.elements?.find((style) => style.name === 'w:pPr');

  numPr = pPr?.elements?.find((style) => style.name === 'w:numPr');
  numId = getNumIdFromTag(numPr);
  const basedOn = matchedStyle?.elements?.find((style) => style.name === 'w:basedOn');

  if (!numId && !seenStyleIds.has(styleId)) {
    const basedOnStyleId = basedOn?.attributes['w:val'];
    seenStyleIds.add(styleId);
    if (!basedOnStyleId) return null;
    return getNumPrRecursive({ styleId: basedOnStyleId, docx, seenStyleIds });
  }

  return numPr;
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

  let numPr = pPr?.elements?.find((style) => style.name === 'w:numPr');
  if (!numPr) return null;

  let numIdTag = numPr?.elements?.find((style) => style.name === 'w:numId') || {};
  let numId = getNumIdFromTag(numPr);
  let ilvlTag = numPr?.elements?.find((style) => style.name === 'w:ilvl');
  let ilvl = ilvlTag?.attributes?.['w:val'];

  const basedOnTag = style?.elements?.find((style) => style.name === 'w:basedOn');
  const basedOnId = basedOnTag?.attributes?.['w:val'];

  // If we don't have a numId, then we need to check the basedOn style
  // Which can in turn be based on some other style and so on.
  let loopCount = 0;
  while (numPr && !numId && loopCount < 10) {
    const basedOnStyle = styleTags.find((tag) => tag.attributes['w:styleId'] === basedOnId) || {};
    const basedOnPPr = basedOnStyle?.elements?.find((style) => style.name === 'w:pPr');
    numPr = basedOnPPr?.elements?.find((style) => style.name === 'w:numPr')
    numIdTag = numPr?.elements?.find((style) => style.name === 'w:numId') || {};
    numId = numIdTag?.attributes?.['w:val'];

    if (!ilvlTag) {
      ilvlTag = numPr?.elements?.find((style) => style.name === 'w:ilvl');
      ilvl = ilvlTag?.attributes?.['w:val'];
    }

    loopCount++;
  }

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
    if (!numId && numIdFromStyles) numId = numIdFromStyles;
    if (!level && iLvlFromStyles) level = iLvlFromStyles ? parseInt(iLvlFromStyles) : null;
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
export function getNodeNumberingDefinition(item, level, docx) {
  if (!item) return;
  const { attributes = {} } = item;

  const { paragraphProperties = {} } = attributes;
  const { elements: listStyles = [] } = paragraphProperties;
  const initialPpr = item.elements.find((el) => el.name === 'w:pPr');
  const styleTag = initialPpr?.elements?.find((el) => el.name === 'w:pStyle');
  const styleId = styleTag?.attributes['w:val'];

  const numPrTag = getNumPrRecursive({ node: item, styleId, docx });
  if (!numPrTag) return {};

  const numIdTag = numPrTag?.elements.find((style) => style.name === 'w:numId');
  const numId = numIdTag?.attributes['w:val'];

  // Get the indent level
  const ilvlTag = numPrTag?.elements.find((style) => style.name === 'w:ilvl');
  const ilvl = ilvlTag?.attributes['w:val'] || getOutlineLevelFromStyleTag(styleId, docx);

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
  else return {};
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
    if (!expectedTypes.includes(item.name)) {
      // console.warn(`[numbering.xml] Unexpected list paragraph prop found: ${item.name}`);
    }
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
    if (!expectedTypes.includes(item.name)) {
      // console.warn(`[numbering.xml] Unexpected list run prop found: ${item.name}`);
    }
    const { attributes = {} } = item;
    Object.keys(attributes).forEach((key) => {
      runProperties[key] = attributes[key];
    });
  });
  return runProperties;
}
