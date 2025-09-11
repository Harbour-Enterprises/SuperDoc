//@ts-check
import { DOMParser } from 'prosemirror-model';
import { createDocFromHTML } from './importHtml.js';
import { createDocFromMarkdown } from './importMarkdown.js';
import { ListHelpers } from './list-numbering-helpers.js';
import { stripHtmlStyles } from './htmlSanitizer.js';

/**
 * Unified content processor that handles all content types
 * @param {Object} params
 * @param {string} params.content - The content to process
 * @param {string} params.type - Content type: 'html', 'markdown', 'text', 'schema'
 * @param {Object} params.schema - ProseMirror schema
 * @param {Object} params.editor - Editor instance
 * @returns {Object} Processed ProseMirror document
 */
export function processContent({ content, type, schema, editor }) {
  let doc;

  switch (type) {
    case 'html':
      doc = createDocFromHTML(content, schema, { isImport: true });
      break;

    case 'markdown':
      doc = createDocFromMarkdown(content, schema, { isImport: true });
      break;

    case 'text':
      const wrapper = document.createElement('div');
      wrapper.dataset.superdocImport = 'true';
      const para = document.createElement('p');
      para.textContent = content;
      wrapper.appendChild(para);
      doc = DOMParser.fromSchema(schema).parse(wrapper);
      break;

    case 'schema':
      doc = schema.nodeFromJSON(content);
      break;

    default:
      throw new Error(`Unknown content type: ${type}`);
  }

  // Post-process to ensure lists have proper attributes
  if (type === 'html' || type === 'markdown') {
    doc = ensureListAttributes(doc, editor);
  }

  return doc;
}

/**
 * Ensure lists have proper DOCX attributes for rendering
 * @param {Object} doc - ProseMirror document
 * @param {Object} editor - Editor instance
 * @returns {Object} Document with fixed list attributes
 */
function ensureListAttributes(doc, editor) {
  const json = doc.toJSON();
  const processed = processListNodes(json, editor);
  return editor.schema.nodeFromJSON(processed);
}

/**
 * Recursively process list nodes to add required attributes
 * @param {Object} node - Node to process
 * @param {Object} editor - Editor instance
 * @param {number} depth - Current depth in tree
 * @returns {Object} Processed node
 */
function processListNodes(node, editor, depth = 0) {
  if (!node) return node;

  // Process bullet lists
  if (node.type === 'bulletList') {
    // Ensure list has ID
    if (!node.attrs) node.attrs = {};
    if (!node.attrs.listId) {
      node.attrs.listId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition({
        numId: node.attrs.listId,
        listType: 'bulletList',
        editor,
      });
    }
    node.attrs['list-style-type'] = 'bullet';

    // Process list items
    if (node.content) {
      node.content = node.content.map((item, index) =>
        processListItem(item, node.attrs.listId, 'bullet', index, depth, editor),
      );
    }
  }

  // Process ordered lists
  else if (node.type === 'orderedList') {
    if (!node.attrs) node.attrs = {};
    if (!node.attrs.listId) {
      node.attrs.listId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition({
        numId: node.attrs.listId,
        listType: 'orderedList',
        editor,
      });
    }
    node.attrs['list-style-type'] = 'decimal';
    node.attrs.order = node.attrs.order || 1;

    // Process list items
    if (node.content) {
      node.content = node.content.map((item, index) =>
        processListItem(item, node.attrs.listId, 'decimal', index, depth),
      );
    }
  }

  // Recursively process children
  else if (node.content) {
    node.content = node.content.map((child) => processListNodes(child, editor, depth));
  }

  return node;
}

/**
 * Process a list item to ensure it has required attributes
 * @param {Object} item - List item node
 * @param {number} listId - Parent list ID
 * @param {string} listType - 'bullet' or 'decimal'
 * @param {number} index - Item index in list
 * @param {number} depth - Nesting depth
 * @param {Object} editor - Editor instance
 * @returns {Object} Processed list item
 */
function processListItem(item, listId, listType, index, depth, editor) {
  if (item.type !== 'listItem') return item;

  if (!item.attrs) item.attrs = {};

  // Set required attributes with sensible defaults
  item.attrs.numId = item.attrs.numId || listId;
  item.attrs.level = item.attrs.level ?? depth;
  item.attrs.listLevel = item.attrs.listLevel || [index + 1];

  if (listType === 'bullet') {
    item.attrs.listNumberingType = item.attrs.listNumberingType || 'bullet';
    item.attrs.lvlText = item.attrs.lvlText || '•';
    item.attrs.markerType = 'bullet';
  } else {
    item.attrs.listNumberingType = item.attrs.listNumberingType || 'decimal';
    item.attrs.lvlText = item.attrs.lvlText || '%1.';
    item.attrs.markerType = 'decimal';
  }

  // Process nested content
  if (item.content) {
    item.content = item.content.map((child) => processListNodes(child, editor, depth + 1));
  }

  return item;
}
