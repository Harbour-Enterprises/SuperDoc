import { TextSelection } from 'prosemirror-state';
import {
  getStyleTagFromStyleId,
  getAbstractDefinition,
  getDefinitionForLevel,
} from '@core/super-converter/v2/importer/listImporter.js';
import { baseBulletList, baseOrderedListDef } from './baseListDefinitions';
import { findParentNode } from '@helpers/index.js';

/**
 * Generate a new list definition for the given list type.
 * This function creates a new abstractNum and num definition for the list type.
 * It updates the editor's numbering with the new definitions.
 * @param {Object} param0 
 * @param {number} param0.numId - The numId to be used for the new list definition.
 * @param {Object} param0.listType - The type of the list (ordered or bullet).
 * @param {Editor} param0.editor - The editor instance where the list definition will be added.
 * @returns {Object} The new abstract and num definitions.
 */
export const generateNewListDefinition = ({ numId, listType, editor }) => {
  // Generate a new numId to add to numbering.xml
  if (typeof listType === 'string') listType = editor.schema.nodes[listType];

  const definition = listType.name === 'orderedList' ? baseOrderedListDef : baseBulletList;
  const numbering = editor.converter.numbering;
  const newNumbering = { ...numbering };

  // Generate the new abstractNum definition
  const newAbstractId = getNewListId(editor);
  const newAbstractDef = {
    ...definition,
    attributes: {
      ...definition.attributes,
      'w:abstractNumId': String(newAbstractId),
    }
  };
  newNumbering.abstracts[newAbstractId] = newAbstractDef;

  // Generate the new numId definition
  const newNumDef = {
    type: 'element',
    name: 'w:num',
    attributes: {
      'w:numId': String(numId),
      'w16cid:durableId': '485517411'
    },
    elements: [
      { name: 'w:abstractNumId', attributes: { 'w:val': String(newAbstractId) } },
    ]
  };
  newNumbering.definitions[numId] = newNumDef;

  // Update the editor's numbering with the new definition
  editor.converter.numbering = newNumbering;

  return { abstract: newAbstractDef, definition: newNumDef };
};

/**
 * Get a new list ID for the editor without creating a conflict.
 * This function calculates the next available list ID by finding the maximum existing ID
 * and adding 1 to it. 
 * @param {Editor} editor The editor instance where the list ID will be generated.
 * @returns {number} The new list ID.
 */
export const getNewListId = (editor) => {
  return Math.max(...Object.keys(editor.converter.numbering.definitions).map(Number)) + 1;
}

/**
 * Get the details of a list definition based on the numId and level.
 * This function retrieves the start value, numbering format, level text, and custom format
 * for a given list definition.
 * @param {Object} param0 
 * @param {number} param0.numId - The numId of the list definition.
 * @param {number} param0.level - The level of the list definition.
 * @param {Editor} param0.editor - The editor instance where the list definition is stored.
 * @returns {Object} An object containing the start value, numbering format, level text, and custom format.
 * @property {number} start - The starting number for the list.
 * @property {string} numFmt - The numbering format (e.g., decimal, lowerRoman).
 * @property {string} lvlText - The text format for the list level.
 * @property {string} listNumberingType - The type of numbering used in the list (e.g., decimal, lowerRoman).
 * @property {string} customFormat - The custom format for the list, if applicable.
 */
export const getListDefinitionDetails = ({ numId, level, listType, editor }) => {
  const { definitions, abstracts } = editor.converter.numbering;
  const numDef = definitions[numId];
  if (!numDef && listType) {
    generateNewListDefinition({ numId, listType, editor });
  };
  const abstractId = definitions[numId]?.elements?.find((item) => item.name === "w:abstractNumId")?.attributes?.["w:val"];
  const abstract = abstracts[abstractId];

  const listDefinition = abstract?.elements?.find((item) => item.name === "w:lvl" && item.attributes["w:ilvl"] == level);
  const start = listDefinition?.elements?.find((item) => item.name === "w:start")?.attributes["w:val"];
  const numFmtTag = listDefinition?.elements?.find((item) => item.name === "w:numFmt");
  const numFmt = numFmtTag?.attributes["w:val"];
  const lvlText = listDefinition?.elements?.find((item) => item.name === "w:lvlText")?.attributes["w:val"];
  const listNumberingType = listDefinition?.elements?.find((item) => item.name === "w:numFmt")?.attributes["w:val"];

  let customFormat;
  if (numFmt === 'custom') customFormat = numFmtTag?.attributes?.['w:format'];

  return { start, numFmt, lvlText, listNumberingType, customFormat };
};

/**
 * Remove list definitions from the editor's numbering.
 * This function deletes the definitions and abstracts for a given list ID from the editor's numbering.
 * It is used to clean up list definitions when they are no longer needed.
 * @param {string} listId The ID of the list to be removed.
 * @param {Editor} editor The editor instance from which the list definitions will be removed.
 * @returns {void}
 */
export const removeListDefinitions = (listId, editor) => {
  const { numbering } = editor.converter;
  if (!numbering) return;

  const { definitions, abstracts } = numbering;

  const abstractId = definitions[listId].elements[0].attributes['w:val'];
  delete definitions[listId];
  delete abstracts[abstractId];
  editor.converter.numbering = {
    definitions,
    abstracts,
  };
};

/**
 * Create a JSON representation of a list item node.
 * This function constructs a list item node in JSON format, including its level, numbering type,
 * starting number, and content node.
 * @param {Object} param0
 * @param {number} param0.level - The level of the list item.
 * @param {string} param0.lvlText - The text format for the list level.
 * @param {number} param0.numId - The ID of the numbering definition for the list item.
 * @param {string} param0.numFmt - The numbering format (e.g., decimal, lowerRoman).
 * @param {number} param0.start - The starting number for the list item.
 * @param {Object} param0.contentNode - The content node to be included in the list item.
 * @returns {Object} A JSON object representing the list item node.
 */
export const createListItemNodeJSON = ({ level, lvlText, numId, numFmt, start, contentNode }) => {
  start = Number(start);
  if (!contentNode) {
    contentNode = {
      type: 'paragraph',
      content: []
    };
  };

  const listLevel = new Array(level).fill(start).map((_, i) => i);
  listLevel.push(start);

  const listItem = {
    type: 'listItem',
    attrs: {
      lvlText,
      listLevel,
      level,
      numId,
      numPrType: 'inline',
      listNumberingType: numFmt,
    },
    content: [contentNode],
  };
  return listItem;
};

/**
 * Create a schema node for an ordered list.
 * This function constructs an ordered list node in the editor's schema, including its attributes
 * such as list style type, list ID, and order level. It also creates a content node for the list item.
 * @param {Object} param0
 * @param {number} param0.level - The level of the ordered list.
 * @param {number} param0.numId - The ID of the numbering definition for the ordered list.
 * @param {Editor} param0.editor - The editor instance where the list node will be created.
 * @param {Object} param0.contentNode - The content node to be included in the ordered list.
 * @returns {Object} A ProseMirror node representing the ordered list.
 */
export const createSchemaOrderedListNode = ({ level, numId, listType, editor, contentNode }) => {
  level = Number(level);
  numId = Number(numId);
  const { start, lvlText, numFmt } = ListHelpers.getListDefinitionDetails({ numId, level, listType, editor });
  const listNodeJSON = createListItemNodeJSON({ level, lvlText, numFmt, numId, start, contentNode });
  const node = {
    type: 'orderedList',
    attrs: {
      'list-style-type': numFmt,
      listId: numId,
      order: level,
    },
    content: [listNodeJSON],
  };
  return editor.schema.nodeFromJSON(node);
};

/**
 * Create a new list in the editor.
 * @param {Object} param0
 * @param {string|Object} param0.listType - The type of the list to be created (e.g., 'orderedList', 'bulletList').
 * @param {Editor} param0.editor - The editor instance where the new list will be created.
 * @param {Object} param0.node - The node to be inserted, if applicable.
 * @param {Object} param0.content - The content to be included in the new list.
 * @returns {Function} A command function that inserts the new list into the editor.
 */
export const createNewList = ({ listType, tr, editor }) => {
  const numId = ListHelpers.getNewListId(editor);
  if (typeof listType === 'string') listType = editor.schema.nodes[listType];

  ListHelpers.generateNewListDefinition({ numId, listType, editor });

  const { selection } = tr;
  const { $from } = selection;
  const content = $from.parent;
  const level = 0;

  const listNode = ListHelpers.createSchemaOrderedListNode({
    level,
    numId,
    listType,
    editor,
    contentNode: content?.toJSON(),
  });

  const replaceFrom = $from.before($from.depth);
  const replaceTo = $from.after($from.depth);

  return insertNewList(tr, replaceFrom, replaceTo, listNode);
};


/**
 * Get the current list item from the editor state.
 * @param {Object} state - The ProseMirror editor state.
 * @returns {Node|null} The current list item node, or null if not found.
 */
export const getCurrentListItem = (state) => {
  return findParentNode((node) => node.type.name === 'listItem')(state.selection);
}

/**
 * Get the parent ordered list of the current selection.
 * @param {Object} state - The ProseMirror editor state.
 * @returns {Node|null} The parent ordered list node, or null if not found.
 */
export const getParentOrderedList = (state) => {
  return findParentNode((node) => node.type.name === 'orderedList')(state.selection);
}

/**
 * Set the selection inside a newly created list.
 * @param {Object} tr - The ProseMirror transaction object.
 * @param {number} basePos - The base position where the new list is inserted.
 * @returns {void}
 */
export const setSelectionInsideNewList = (tr, basePos) => {
  try {
    const $pos = tr.doc.resolve(basePos + 3);
    tr.setSelection(TextSelection.near($pos));
  } catch {
    const $fallback = tr.doc.resolve(basePos + 1);
    tr.setSelection(TextSelection.near($fallback));
  }
}

/**
 * Replace a list with a new node in the ProseMirror transaction.
 * @param {Object} param0 - The parameters for the replacement.
 * @param {Object} param0.tr - The ProseMirror transaction object.
 * @param {number} param0.from - The starting position of the list to be replaced.
 * @param {number} param0.to - The ending position of the list to be replaced.
 * @param {Node} param0.newNode - The new node to replace the list with.
 * @returns {void}
 */
export const replaceListWithNode = ({ tr, from, to, newNode }) => {
  tr.replaceWith(from, to, newNode);
}

/**
 * Convert a list item to a paragraph.
 * @param {Object} param0 - The parameters for the conversion.
 * @param {Object} param0.state - The ProseMirror editor state.
 * @param {Object} param0.tr - The ProseMirror transaction object.
 * @param {Node} param0.currentNode - The current list item node to be converted.
 * @param {number} param0.replaceFrom - The starting position of the list item to be replaced.
 * @param {number} param0.replaceTo - The ending position of the list item to be replaced.
 * @returns {boolean} True if the conversion was successful, false otherwise.
 */
export const convertListItemToParagraph = ({ state, tr, currentNode, replaceFrom, replaceTo }) => {
  const paragraphContent = currentNode.node.content.firstChild;
  if (!paragraphContent) return false;

  const paragraphNode = state.schema.nodes.paragraph.create(
    paragraphContent.attrs,
    paragraphContent.content,
    paragraphContent.marks
  );

  replaceListWithNode({ tr, from: replaceFrom, to: replaceTo, newNode: paragraphNode });

  const newPos = replaceFrom + 1;
  const $pos = tr.doc.resolve(newPos);
  tr.setSelection(TextSelection.near($pos));

  return true;
}

/**
 * Insert a new list into the ProseMirror transaction.
 * @param {number} replaceFrom - The starting position where the list will be inserted.
 * @param {number} replaceTo - The ending position where the list will be inserted.
 * @param {Node} listNode - The new list node to be inserted.
 * @param {Array} [marks=[]] - Optional array of marks to be applied to the new list item.
 * @returns {Function} A command function that performs the insertion and sets the selection.
 */

export const insertNewList = (tr, replaceFrom, replaceTo, listNode, marks = []) => {
  tr.replaceWith(replaceFrom, replaceTo, listNode);
  tr.ensureMarks(marks);

  // Find the actual end position of the text content in the list
  const listStart = replaceFrom;
  const $paragraphStart = tr.doc.resolve(listStart + 2);
  const paragraphNode = $paragraphStart.parent;
  const endPos = $paragraphStart.pos + paragraphNode.content.size;
  
  const $endPos = tr.doc.resolve(endPos);
  tr.setSelection(TextSelection.near($endPos));

  return true;
};


/**
 * Get style definitions for a list item based on its styleId and numId.
 * @param {Object} param0 - The parameters for retrieving the style definitions.
 * @param {string} param0.styleId - The style ID of the list item.
 * @param {number} param0.numId - The numbering ID of the list item.
 * @param {number} param0.level - The level of the list item.
 * @param {Editor} param0.editor - The editor instance containing the converted XML and numbering definitions.
 * @returns {Object} An object containing the style properties and numbering definitions.
 */
export const getListItemStyleDefinitions = ({ styleId, numId, level, editor }) => {  
  const docx = { ...editor?.converter?.convertedXml };
  const newNumbering = { ...editor?.converter?.numbering };

  // We need definitions for the styleId if we have one.
  const styleDefinition = getStyleTagFromStyleId(styleId, docx);
  const stylePpr = styleDefinition?.elements.find((el) => el.name === 'w:pPr');

  // We also check definitions for the numId which can contain styles.
  let abstractDefinition = getAbstractDefinition(numId, docx);
  if (!abstractDefinition) abstractDefinition = newNumbering.abstracts[numId];

  const numDefinition = getDefinitionForLevel(abstractDefinition, level);
  const numDefPpr = numDefinition?.elements.find((el) => el.name === 'w:pPr');

  return {
    stylePpr,
    numDefPpr,
  }
};

/**
 * Add inline text marks to the current node.
 * It is used to ensure that inline text styles are preserved when manipulating list items.
 * @param {Object} currentNode - The current ProseMirror node being processed.
 * @param {Array} filteredMarks - An array of marks to which the inline text styles will be added.
 * @returns {Array} The updated array of marks including the inline text styles.
 */
export const addInlineTextMarks = (currentNode, filteredMarks) => {
  const newMarks = [...filteredMarks];
  try {
    const textMarks = currentNode.children[0].children[0].marks;
    const inlineTextStyleFromSplitBlock = textMarks.find((m) => m.type.name === 'textStyle');
    inlineTextStyleFromSplitBlock && newMarks.push(inlineTextStyleFromSplitBlock);
  } catch (e) {};
  return newMarks;
};

/**
 * Migration for lists v1 to v2
 * This function checks if the editor has any lists that need to be migrated from v1 to v2.
 * It splits list nodes that have more than one item into single-item lists,
 * @param {Editor} editor - The editor instance containing the lists to be migrated.
 * @return {void}
 */
export const migrateListsToV2IfNecessary = (editor) => {
  const numbering = editor.converter.numbering;
  if (!numbering) return;

  const { state } = editor;
  const { doc } = state;
  const { dispatch } = editor.view;

  const LIST_TYPES = ['orderedList', 'bulletList'];
  const replacements = [];

  // Collect all list nodes that need to be replaced
  doc.descendants((node, pos) => {
    if (!LIST_TYPES.includes(node.type.name)) return;

    // Skip if it's already a single-item list (optional optimization)
    if (node.content?.content?.length <= 1) return;

    const { extracted } = splitListNodeFully(node, editor, 0);    
    if (extracted.length > 0) {
      replacements.push({ 
        from: pos, 
        to: pos + node.nodeSize, 
        replacement: extracted 
      });
    }
  });

  // Apply replacements in reverse order to avoid position drift
  if (replacements.length > 0) {
    let tr = state.tr;
    
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { from, to, replacement } = replacements[i];
      tr = tr.replaceWith(from, to, replacement);
    }
    
    dispatch(tr);
  }
};

/**
 * Extract nested lists recursively from a ProseMirror node.
 * @param {Node} node - The ProseMirror node to process.
 * @param {Editor} editor - The editor instance where the node is being processed.
 * @param {number} nestingLevel - The current nesting level of the list.
 * @param {number|null} sharedNumId - The shared numId from the parent list
 * @return {Object} An object containing the cleaned node and an array of extracted lists.
 */
function extractNestedListsRecursively(node, editor, nestingLevel, sharedNumId) {
  // Handle text nodes and leaf nodes
  if (node.isText || !node.content || !node.content.content) {
    return { cleanedNode: node, extractedLists: [] };
  }

  const extractedLists = [];
  const cleanedContent = [];

  for (const child of node.content.content) {
    if (['orderedList', 'bulletList'].includes(child.type.name)) {
      // Extract nested lists - pass down the shared numId
      const { extracted: nestedSplitLists } = splitListNodeFully(child, editor, nestingLevel + 1, sharedNumId);
      extractedLists.push(...nestedSplitLists);
    } else {
      // Recursively process non-list children
      const { cleanedNode: cleanedChild, extractedLists: deepExtracted } =
        extractNestedListsRecursively(child, editor, nestingLevel, sharedNumId);

      cleanedContent.push(cleanedChild);
      extractedLists.push(...deepExtracted);
    }
  }

  // Create the cleaned node with nested lists removed
  const cleanedNode = node.type.create(
    node.attrs,
    cleanedContent.length > 0 ? cleanedContent : undefined,
    node.marks
  );

  return { cleanedNode, extractedLists };
}

/**
 * Split a list node fully into single-item lists.
 * @param {Node} listNode - The ProseMirror node representing the list to be split.
 * @param {Editor} editor - The editor instance where the list node is being processed.
 * @param {number} [nestingLevel=0] - The current nesting level of the list.
 * @param {number|null} [parentSharedNumId=null] - The shared numId from the parent list, if any.
 * @returns {Object} An object containing an array of extracted single-item lists.
 */
function splitListNodeFully(listNode, editor, nestingLevel = 0, parentSharedNumId = null) {
  const extracted = [];
  const listType = listNode.type.name; // 'orderedList' or 'bulletList'

  // Get the list numId which will be used for all children unless otherwise specified
  let sharedNumId = parentSharedNumId;
  if (!sharedNumId) {
    let numId = parseInt(listNode.attrs?.listId);

    // In some legacy cases, we might not find any list ID at all but we can infer
    // the list style from the list-style-type attribute.
    if (!numId) {
      const listStyleType = listNode.attrs?.['list-style-type'];
      const currentListType = listStyleType === 'bullet' ? 'bulletList' : 'orderedList';
      numId = getNewListId(editor);
      generateNewListDefinition({
        numId,
        listType: currentListType,
        editor,
      });
    }
    sharedNumId = numId;
  }

  for (const listItemNode of listNode.content.content) {
    // Process the list item to extract any nested lists
    const {
      cleanedNode,
      extractedLists
    } = extractNestedListsRecursively(listItemNode, editor, nestingLevel, sharedNumId);

    // Create a single-item list with the cleaned content
    if (cleanedNode.content && cleanedNode.content.content.length > 0) {
      const singleItemList = createSingleItemList(
        listType,
        cleanedNode,
        listNode.attrs,
        editor,
        nestingLevel,
        sharedNumId
      );
      extracted.push(singleItemList);
    }

    // Add any extracted nested lists
    extracted.push(...extractedLists);
  }

  return { extracted };
}

/**
 * Create a single-item list (v2) from a list item node (v1)
 * @param {string} listType The type of the list (e.g., 'orderedList', 'bulletList').
 * @param {Node} listItemNode The ProseMirror node representing the list item.
 * @param {Object} originalAttrs The original attributes of the list item node.
 * @param {Editor} editor The editor instance where the list item will be created.
 * @param {number} [nestingLevel=0] The nesting level of the list item.
 * @param {number} sharedNumId The shared numId for the list item,
 * @returns {Node} A ProseMirror node representing a single-item list.
 */
function createSingleItemList(listType, listItemNode, originalAttrs, editor, nestingLevel = 0, sharedNumId) {
  const { attrs } = listItemNode;
  const listLevel = attrs.listLevel;
  const level = Math.max(0, listLevel?.length - 1) || nestingLevel || 0;

  const contentNodes = listItemNode.content?.content || [];
  const contentJSON = contentNodes.map(node => node.toJSON());
  const result = createSchemaOrderedListNode({
    level,
    numId: sharedNumId, // Use the shared numId
    listType,
    editor,
    contentNode: contentJSON[0],
    nestingLevel,
  });
  return result;
}


/**
 * ListHelpers is a collection of utility functions for managing lists in the editor.
 * It includes functions for creating, modifying, and retrieving list items and definitions,
 * as well as handling schema nodes and styles.
 */
export const ListHelpers = {
  getCurrentListItem,
  getParentOrderedList,
  setSelectionInsideNewList,
  replaceListWithNode,
  convertListItemToParagraph,

  // DOCX helpers
  insertNewList,
  getListDefinitionDetails,
  generateNewListDefinition,
  getNewListId,
  removeListDefinitions,
  getListItemStyleDefinitions,

  // Schema helpers
  createNewList,
  createSchemaOrderedListNode,
  createListItemNodeJSON,
  addInlineTextMarks,
  migrateListsToV2IfNecessary,

  // Base list definitions
  baseOrderedListDef,
  baseBulletList,
};
