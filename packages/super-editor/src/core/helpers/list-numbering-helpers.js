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
export const getListDefinitionDetails = ({ numId, level, editor }) => {
  const { definitions, abstracts } = editor.converter.numbering
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
export const createSchemaOrderedListNode = ({ level, numId, editor, contentNode }) => {
  level = Number(level);
  numId = Number(numId);
  const { start, lvlText, numFmt } = ListHelpers.getListDefinitionDetails({ numId, level, editor });
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
 * @param {Function} param0.chain - The command chain function to execute the insertion.
 * @param {Object} param0.node - The node to be inserted, if applicable.
 * @param {Object} param0.content - The content to be included in the new list.
 * @returns {Function} A command function that inserts the new list into the editor.
 */
export const createNewList = ({ listType, editor, chain }) => {
  const numId = ListHelpers.getNewListId(editor);

  // Parse the listType if its a string
  if (typeof node === 'string') listType = editor.schema.nodes[listType];

  ListHelpers.generateNewListDefinition({ numId, listType, editor });
  const { state } = editor;
  const { $from } = state.selection;
  const content = $from.parent;

  const level = 0; // For new lists we start at level 0
  const listNode = ListHelpers.createSchemaOrderedListNode({
    level,
    numId,
    editor,
    contentNode: content?.toJSON(),
  });

  // insert the new list node
  const parentDepth = $from.depth;
  const replaceFrom = $from.before(parentDepth)
  const replaceTo = $from.after(parentDepth);
  return insertNewList(chain, replaceFrom, replaceTo, listNode);
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
 * @param {Function} chain - The command chain function to execute the insertion.
 * @param {number} replaceFrom - The starting position where the list will be inserted.
 * @param {number} replaceTo - The ending position where the list will be inserted.
 * @param {Node} listNode - The new list node to be inserted.
 * @param {Array} [marks=[]] - Optional array of marks to be applied to the new list item.
 * @returns {Function} A command function that performs the insertion and sets the selection.
 */
export const insertNewList = (chain, replaceFrom, replaceTo, listNode, marks = []) => {
  return chain()
    .command(({ tr, dispatch }) => {
      // Replace the content with the new list
      tr.replaceWith(replaceFrom, replaceTo, listNode);
      tr.ensureMarks(marks);
      
      // Calculate the selection position inside the new list item
      // The list structure is: list > listItem > paragraph
      // So we need to go: replaceFrom + list(1) + listItem(1) + paragraph(1) = replaceFrom + 3
      const newSelectionPos = replaceFrom + 3;
      
      try {
        const $pos = tr.doc.resolve(newSelectionPos);
        tr.setSelection(TextSelection.near($pos));
      } catch (error) {
        // Fallback: try to find a valid position near the inserted content
        console.warn('Could not set selection at calculated position, using fallback');
        const $pos = tr.doc.resolve(replaceFrom + 1);
        tr.setSelection(TextSelection.near($pos));
      }
      
      dispatch(tr);
      return true;
    })
    .run();
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

  // Base list definitions
  baseOrderedListDef,
  baseBulletList,
};
