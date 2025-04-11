import { canJoin } from 'prosemirror-transform';
import { getNodeType } from '../helpers/getNodeType.js';
import { findParentNode } from '../helpers/findParentNode.js';
import { isList } from '../helpers/isList.js';
import { baseBulletList, baseOrderedListDef } from '../helpers/baseListDefinitions';

/**
 * Join list backwards.
 * @param tr Transaction.
 * @param listType List type.
 */
const joinListBackwards = (tr, listType) => {
  const list = findParentNode((node) => node.type === listType)(tr.selection);
  if (!list) return true;

  const before = tr.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth);
  if (before === undefined) return true;

  const nodeBefore = tr.doc.nodeAt(before);
  const canJoinBackwards = list.node.type === nodeBefore?.type && canJoin(tr.doc, list.pos);
  if (!canJoinBackwards) return true;

  tr.join(list.pos);
  return true;
};

/**
 * Join list forwards.
 * @param tr Transaction.
 * @param listType List type.
 */
const joinListForwards = (tr, listType) => {
  const list = findParentNode((node) => node.type === listType)(tr.selection);
  if (!list) return true;

  const after = tr.doc.resolve(list.start).after(list.depth);
  if (after === undefined) return true;

  const nodeAfter = tr.doc.nodeAt(after);
  const canJoinForwards = list.node.type === nodeAfter?.type && canJoin(tr.doc, after);
  if (!canJoinForwards) return true;

  tr.join(after);
  return true;
};

/**
 * Toggle between list types.
 * @param listTypeOrName The type/name of the list.
 * @param itemTypeOrName The type/name of the list item.
 * @param keepMarks Keep marks when toggling.
 * @param attributes Attrs for the new list.
 */
export const toggleList =
  (listTypeOrName, itemTypeOrName, keepMarks, attributes = {}) =>
  (props) => {
    const { editor, tr, state, dispatch, chain, can, commands } = props;

    const { extensions, splittableMarks } = editor.extensionService;
    const listType = getNodeType(listTypeOrName, state.schema);
    const itemType = getNodeType(itemTypeOrName, state.schema);
    const { selection, storedMarks } = state;
    const { $from, $to } = selection;
    const range = $from.blockRange($to);

    const marks = storedMarks || (selection.$to.parentOffset && selection.$from.marks());

    if (!range) return false;

    const parentList = findParentNode((node) => isList(node.type.name, extensions))(selection);
    const { numbering } = editor.converter;

    // This is the case when we toggle an existing list.
    if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
      // If we toggle to the same list type,
      // then execute `liftListItem` command.
      if (parentList.node.type === listType) {
        const { listId } = parentList.node.attrs;
        editor.converter.numbering = removeListDefinitions(listId, numbering);
        console.debug('NUMBERING', editor.converter.numbering.definitions);
        return commands.liftListItem(itemType);
      }

      // When we switch between different list types.
      if (isList(parentList.node.type.name, extensions) && listType.validContent(parentList.node.content) && dispatch) {
        const result = chain()
          .command(() => {
            tr.setNodeMarkup(parentList.pos, listType);
            return true;
          })
          .command(() => joinListBackwards(tr, listType))
          .command(() => joinListForwards(tr, listType))
          .run();

        return result;
      }
    }

    const createTryConvertNodeToDefault = ({ ensureMarks = false }) => {
      return () => {
        const canWrapInList = can().wrapInList(listType, attributes);
        if (ensureMarks) {
          const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
          tr.ensureMarks(filteredMarks);
        }
        if (canWrapInList) return true;
        return commands.clearNodes();
      };
    };

    // Update the numbering definition for this document
    const newListId = getNewListId(numbering.definitions);
    editor.converter.numbering = generateNewListDefinition(newListId, numbering, listType);
    attributes.listId = newListId;

    // This is the case when there is no need to ensureMarks.
    if (!keepMarks || !marks || !dispatch) {
      const result = chain()
        // First check if it's possible to wrap node in a list
        // and if not then try to convert it into a default node (paragraph).
        .command(createTryConvertNodeToDefault({ ensureMarks: false }))
        .wrapInList(listType, attributes)
        .command(() => joinListBackwards(tr, listType))
        .command(() => joinListForwards(tr, listType))
        .run();

      return result;
    }

    const result = chain()
      // First check if it's possible to wrap node in a list
      // and if not then try to convert it into a default node (paragraph).
      .command(createTryConvertNodeToDefault({ ensureMarks: true }))
      .wrapInList(listType, attributes)
      .command(() => joinListBackwards(tr, listType))
      .command(() => joinListForwards(tr, listType))
      .run();

    return result;
  };


  const getNewListId = (definitions) => Math.max(...Object.keys(definitions).map(Number)) + 1;

  const generateNewListDefinition = (newListId, numbering, listType) => {
    // Generate a new numId to add to numbering.xml
    const definition = listType.name === 'orderedList' ? baseOrderedListDef : baseBulletList;
    const newNumbering = { ...numbering };
  
    // Generate the new abstractNum definition
    const newAbstractId = getNewListId(newNumbering.abstracts);
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
        'w:numId': String(newListId),
        'w16cid:durableId': '485517411'
      },
      elements: [
        { name: 'w:abstractNumId', attributes: { 'w:val': String(newAbstractId) } },
      ]
    };
    newNumbering.definitions[newListId] = newNumDef;  
    return newNumbering;
  };
  
  const removeListDefinitions = (listId, numbering) => {
    const { definitions, abstracts } = numbering;

    const abstractId = definitions[listId].elements[0].attributes['w:val'];
    delete definitions[listId];
    delete abstracts[abstractId];

    return numbering;
  };