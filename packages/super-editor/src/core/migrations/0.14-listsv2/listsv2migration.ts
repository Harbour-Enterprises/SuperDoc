import { getAllFieldAnnotations } from '@extensions/field-annotation/fieldAnnotationHelpers/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import type { Editor } from '../../Editor.js';
import type { Node } from 'prosemirror-model';

const isDebugging = false;
const log = (...args: unknown[]): void => {
  if (isDebugging) console.debug('[lists v2 migration]', ...args);
};

interface Replacement {
  from: number;
  to: number;
  listNode: Node;
  replacement: FlattenedItem[];
}

interface FlattenedItem {
  node: Node;
  baseLevel?: number;
}

/**
 * Migration for lists v1 to v2
 * This function checks if the editor has any lists that need to be migrated from v1 to v2.
 * It splits list nodes that have more than one item into single-item lists.
 */
export const migrateListsToV2IfNecessary = (editor: Editor): Replacement[] => {
  const replacements: Replacement[] = [];

  log('ATTEMPTING MIGRATIONS');

  const numbering = editor.converter.numbering;
  if (!numbering) return replacements;

  const { state } = editor;
  const { doc } = state;
  const { dispatch } = editor.view;

  const LIST_TYPES = ['orderedList', 'bulletList'];

  // Collect all list nodes that need to be replaced
  let lastListEndPos = 0;
  doc.descendants((node, pos) => {
    if (!LIST_TYPES.includes(node.type.name)) return;

    if (pos < lastListEndPos) return;

    const extracted = flattenListCompletely(node, editor, 0);
    if (extracted.length > 0) {
      replacements.push({
        from: pos,
        to: pos + node.nodeSize,
        listNode: node,
        replacement: extracted,
      });
    }

    lastListEndPos = pos + node.nodeSize;
  });

  // Apply replacements in reverse order to avoid position drift
  let tr = state.tr;
  if (replacements.length > 0) {
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { from, to, replacement, listNode } = replacements[i];

      // Convert the flattened items to actual nodes
      const nodesToInsert: Node[] = [];
      for (const item of replacement) {
        if (item.node.type.name === 'listItem') {
          // Create a single-item list containing this list item
          const singleItemList = listNode.type.create(listNode.attrs, [item.node]);
          nodesToInsert.push(singleItemList);
        } else {
          // Insert non-list content directly
          nodesToInsert.push(item.node);
        }
      }

      log('NODES TO INSERT', nodesToInsert);
      tr = tr.replaceWith(from, to, nodesToInsert);
    }
  }

  tr.setMeta('listsv2migration', replacements);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (editor.options as any).migrated = true;
  dispatch(tr);

  return replacements;
};

/**
 * Completely flatten a list structure into single-item lists
 */
function flattenListCompletely(
  listNode: Node,
  editor: Editor,
  baseLevel: number = 0,
  sharedNumId: number | null = null,
): FlattenedItem[] {
  const result: FlattenedItem[] = [];
  const listTypes = ['orderedList', 'bulletList'];
  const currentListType = listNode.type.name;

  const needsMigration = shouldMigrateList(listNode);
  const hasValidDefinition = checkValidDefinition(listNode, editor);
  log('Needs migration?', needsMigration);
  if (!needsMigration) {
    if (!hasValidDefinition) {
      return generateMissingListDefinition(listNode, editor);
    } else {
      return result;
    }
  }

  let numId = parseInt(listNode.attrs?.listId, 10);
  log('LIST ID', numId, 'SHARED NUM ID', sharedNumId);
  if (!numId || Number.isNaN(numId)) numId = ListHelpers.getNewListId(editor);
  const listHasDef = ListHelpers.getListDefinitionDetails({
    numId,
    level: baseLevel,
    listType: currentListType,
    editor,
  });
  if (!listHasDef || (!sharedNumId && !numId)) {
    // In some legacy cases, we might not find any list ID at all but we can infer
    // the list style from the list-style-type attribute.
    numId = ListHelpers.getNewListId(editor);
    log('Genearted new list ID', numId, 'for list type', currentListType);
    ListHelpers.generateNewListDefinition({
      numId,
      listType: currentListType,
      editor,
    });
  }

  if (!sharedNumId) sharedNumId = numId;

  for (const listItem of listNode.content.content) {
    // If the list item has no content, we will still add it as a single-item list
    // Or, main case, where the list item only has one item, it is ready for converting
    if (!listItem.content.content?.length) {
      result.push({ node: listItem, baseLevel });
    }

    // If the list has a single item, we need to check if it is a nested list
    // If it is, we need to flatten it completely
    // If it is not, we can just add it as a single-item list
    else if (listItem.content.content.length === 1) {
      const contentNode = listItem.content.content[0];
      if (listTypes.includes(contentNode.type.name)) {
        // If the content is a nested list, we need to flatten it completely
        const flattened = flattenListCompletely(contentNode, editor, baseLevel + 1, sharedNumId);
        result.push(...flattened);
      } else {
        const newList = ListHelpers.createSchemaOrderedListNode({
          level: baseLevel,
          numId: sharedNumId,
          editor,
          contentNode: contentNode.toJSON(),
        });
        result.push({ node: newList, baseLevel });
      }
    }

    // If we have multiple items, we need to:
    // Convert the first one to the list item
    // Everything else to root nodes
    else {
      const firstItem = listItem.content.content[0];
      if (listTypes.includes(firstItem.type.name)) {
        // If the first item is a nested list, we need to flatten it completely
        const flattened = flattenListCompletely(firstItem, editor, baseLevel + 1, sharedNumId);
        result.push(...flattened);
      } else {
        // If firstItem is already a paragraph or other valid listItem content, wrap it
        // If firstItem is something else, we might need to handle it differently
        if (firstItem.type.name === 'paragraph' || firstItem.isTextblock) {
          // Create a new list item node containing this content
          const newList = ListHelpers.createSchemaOrderedListNode({
            level: baseLevel,
            numId: sharedNumId,
            editor,
            contentNode: firstItem.toJSON(),
          });
          result.push({ node: newList, baseLevel });
        } else {
          // If it's not valid listItem content, treat it as a standalone node
          result.push({ node: firstItem });
        }
      }

      for (const contentItem of listItem.content.content.slice(1)) {
        if (listTypes.includes(contentItem.type.name)) {
          // If the first item is a nested list, we need to flatten it completely
          const flattened = flattenListCompletely(contentItem, editor, baseLevel + 1, sharedNumId);
          result.push(...flattened);
        } else {
          result.push({ node: contentItem });
        }
      }
    }
  }

  return result;
}

/**
 * Check if a list item needs migration to v2.
 * This function checks if a list item has more than one child or if the first child is a list item
 * without the required attributes for v2 migration.
 */
const shouldMigrateList = (listItem: Node): boolean => {
  const content = listItem.content;

  if (content?.content?.length > 1) {
    // If the list item has more than one child, it needs migration
    return true;
  }

  // Since we know we only have one child, let's check it
  const firstChild = content.firstChild;
  if (firstChild && firstChild.type.name === 'listItem') {
    const { attrs } = firstChild;

    // After v2, we expect level and listNumberingType to be defined
    const { level, listNumberingType } = attrs || {};
    if (typeof level === 'undefined' || !listNumberingType) {
      return true;
    }

    const childContent = firstChild?.content?.content;
    const nestedLists = childContent.filter((child) => ['bulletList', 'orderedList'].includes(child.type.name));
    return nestedLists.length > 0;
  }

  return false;
};

/**
 * Check if a list definition is valid.
 * This function checks if a list node has a valid definition for lists v2 based on its attributes.
 */
const checkValidDefinition = (listNode: Node, editor: Editor): boolean => {
  const listType = listNode.type.name;
  const listItem = listNode.content.firstChild;
  const { attrs } = listItem || {};
  const { numId, level } = attrs || {};
  const listDef = ListHelpers.getListDefinitionDetails({ numId, level, listType, editor });
  const { abstract } = listDef || {};

  if (abstract) return true;
  return false;
};

/**
 * Generate a missing list definition for a list node.
 * This function creates a new list definition based on the attributes of the list item
 * and the editor instance.
 */
const generateMissingListDefinition = (listNode: Node, editor: Editor): FlattenedItem[] => {
  const listType = listNode.type.name;
  const listItem = listNode.content.firstChild;
  const { attrs } = listItem || {};
  const { numId } = attrs || {};
  ListHelpers.generateNewListDefinition({
    numId,
    listType,
    editor,
  });
  return [];
};

interface AnnotationValue {
  input_id: string;
  input_value: string;
}

/**
 * Migrate paragraph fields to lists v2.
 * This function processes all field annotations in the editor state,
 * specifically those with type 'html', and migrates their content to the new lists v2 format.
 */
export const migrateParagraphFieldsListsV2 = async (
  annotationValues: AnnotationValue[] = [],
  editor: Editor,
): Promise<AnnotationValue[]> => {
  const annotations = getAllFieldAnnotations(editor.state);
  const newValues = [];

  if (!annotations.length) {
    return annotationValues;
  }

  // Process annotations sequentially
  for (const annotation of annotations) {
    const type = annotation.node?.attrs?.type;

    const matchedAnnotation = annotationValues.find((v) => v.input_id === annotation.node?.attrs?.fieldId);

    if (!!matchedAnnotation && (!type || type !== 'html')) {
      newValues.push(matchedAnnotation);
      continue;
    }

    const value = matchedAnnotation?.input_value;
    if (!value) continue;

    // Wait for each child editor to complete
    await new Promise<void>((resolve, _reject) => {
      const element = document.createElement('div');
      editor.createChildEditor({
        element,
        html: value,
        onCreate: ({ editor: localEditor }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const migrated = (localEditor.options as any).migrated;

          if (migrated) {
            const newHTML = localEditor.getHTML();
            matchedAnnotation.input_value = newHTML;
            newValues.push(matchedAnnotation);
          }
          resolve();
        },
      });
    });
  }

  return newValues;
};
