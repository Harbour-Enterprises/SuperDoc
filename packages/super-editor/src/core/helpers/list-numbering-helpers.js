import { TextSelection } from 'prosemirror-state';
import { Attribute } from '../Attribute.js';

import { baseBulletList, baseOrderedListDef } from './baseListDefinitions';
import { findParentNode, getNodeType } from '@helpers/index.js';


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

export const getNewListId = (editor) => Math.max(...Object.keys(editor.converter.numbering.definitions).map(Number)) + 1;

export const getListDefinitionDetails = ({ numId, level, editor }) => {
  const { definitions, abstracts } = editor.converter.numbering
  const abstractId = definitions[numId]?.elements?.find((item) => item.name === "w:abstractNumId")?.attributes?.["w:val"];
  const abstract = abstracts[abstractId];

  const listDefinition = abstract?.elements?.find((item) => item.name === "w:lvl" && item.attributes["w:ilvl"] == level);
  const start = listDefinition?.elements?.find((item) => item.name === "w:start")?.attributes["w:val"];
  const numFmt = listDefinition?.elements?.find((item) => item.name === "w:numFmt")?.attributes["w:val"];
  const lvlText = listDefinition?.elements?.find((item) => item.name === "w:lvlText")?.attributes["w:val"];
  return { start, numFmt, lvlText };
};

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

  return {
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
};

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

export const indentListItem = ({ chain, editor, node: currentNode }) => {
  const { state } = editor;
  const { $from } = state.selection;
  const content = $from.parent;

  const numId = currentNode.node.attrs.numId;
  const level = currentNode.node.attrs.level + 1;
  const listNode = ListHelpers.createSchemaOrderedListNode({
    level,
    numId,
    editor,
    contentNode: content?.toJSON(),
  });

  const parentList = findParentNode((node) => node.type.name === 'orderedList')(state.selection);
  const replaceFrom = parentList.pos;
  const replaceTo = parentList.node.nodeSize + parentList.pos;
  const newMarks = addInlineTextMarks(currentNode.node, []);
  return insertNewList(chain, replaceFrom, replaceTo, listNode, newMarks);
};

export const outdentListItem = ({ chain, editor, node: currentNode }) => {
  const { state } = editor;
  const { $from } = state.selection;
  const content = $from.parent;

  const numId = currentNode.node.attrs.numId;
  const level = currentNode.node.attrs.level - 1;

  const parentList = findParentNode((node) => node.type.name === 'orderedList')(state.selection);
  const replaceFrom = parentList.pos;
  const replaceTo = parentList.node.nodeSize + parentList.pos;

  if (level < 0) {
    return insertNewList(chain, replaceFrom, replaceTo, content);
  }

  const listNode = ListHelpers.createSchemaOrderedListNode({
    level,
    numId,
    editor,
    contentNode: content?.toJSON(),
  });

  const newMarks = addInlineTextMarks(currentNode.node, []);
  return insertNewList(chain, replaceFrom, replaceTo, listNode, newMarks);
};

const insertNewList = (chain, replaceFrom, replaceTo, listNode, marks = []) => {
  return chain()
    .command(({ tr, dispatch }) => {
      tr.replaceWith(replaceFrom, replaceTo, listNode);
      tr.ensureMarks(marks);
      dispatch(tr);
      return true;
    })
  .run();
};

export const addInlineTextMarks = (currentNode, filteredMarks) => {
  const newMarks = [...filteredMarks];
  try {
    const textMarks = currentNode.children[0].children[0].marks;
    const inlineTextStyleFromSplitBlock = textMarks.find((m) => m.type.name === 'textStyle');
    inlineTextStyleFromSplitBlock && newMarks.push(inlineTextStyleFromSplitBlock);
  } catch (e) {};
  return newMarks;
};

export const ListHelpers = {
  // DOCX helpers
  getListDefinitionDetails,
  generateNewListDefinition,
  getNewListId,
  removeListDefinitions,

  // Schema helpers
  createNewList,
  createSchemaOrderedListNode,
  createListItemNodeJSON,
  indentListItem,
  outdentListItem,
  addInlineTextMarks,

  // Base list definitions
  baseOrderedListDef,
  baseBulletList,
};
