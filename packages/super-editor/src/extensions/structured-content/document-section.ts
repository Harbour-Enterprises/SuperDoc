import { Node, Attribute } from '@core/index.js';
import { DocumentSectionView } from './document-section/DocumentSectionView.js';
import { htmlHandler } from '@core/InputRule.js';
import { Selection } from 'prosemirror-state';
import { DOMParser as PMDOMParser, type Fragment, type Node as PmNode, type NodeType } from 'prosemirror-model';
import { findParentNode } from '@helpers/index.js';
import { SectionHelpers } from './document-section/helpers.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { Command } from '@core/types/ChainedCommands.js';
import type { ProseMirrorJSON } from '@core/types/EditorTypes.js';
import type { Decoration } from 'prosemirror-view';
import type { DOMOutputSpec, ParseRule } from 'prosemirror-model';

/**
 * Document section creation options
 * @typedef {Object} SectionCreate
 * @property {number} [id] - Unique ID. Auto-increments from existing sections if omitted
 * @property {string} [title="Document section"] - Label shown in section header
 * @property {string} [description] - Metadata for tracking (stored in Word's w:tag)
 * @property {string} [sectionType] - Business classification
 * @property {boolean} [isLocked=false] - Prevent editing when true
 * @property {string} [html] - HTML content to insert
 * @property {Object} [json] - ProseMirror JSON (overrides html if both provided)
 */

interface SectionCreate {
  id?: number;
  title?: string;
  description?: string;
  sectionType?: string;
  isLocked?: boolean;
  html?: string;
  json?: ProseMirrorJSON;
}

/**
 * Update an existing section
 * @typedef {Object} SectionUpdate
 * @property {number} id - Target section ID (required)
 * @property {string} [html] - Replace content with HTML
 * @property {Object} [json] - Replace content with ProseMirror JSON (overrides html)
 * @property {Partial<DocumentSectionAttributes>} [attrs] - Update attributes only (preserves content)
 */

interface SectionUpdate {
  id: number;
  html?: string;
  json?: ProseMirrorJSON;
  attrs?: Record<string, unknown>;
}

/**
 * Configuration options for DocumentSection
 * @typedef {Object} DocumentSectionOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for document sections
 */

/**
 * Attributes for document section nodes
 * @typedef {Object} DocumentSectionAttributes
 * @category Attributes
 * @property {number} [id] - Unique section identifier
 * @property {string} [title] - Section display label (becomes w:alias in Word)
 * @property {string} [description] - Additional metadata stored in w:tag
 * @property {string} [sectionType] - Business type for filtering/logic (e.g., 'legal', 'pricing')
 * @property {boolean} [isLocked=false] - Lock state (maps to w:lock="sdtContentLocked")
 * @property {string} [sdBlockId] @internal - Internal block tracking
 */

/**
 * @module DocumentSection
 * @sidebarTitle Document Section
 * @snippetPath /snippets/extensions/document-section.mdx
 */
export const DocumentSection = Node.create<{
  htmlAttributes: Record<string, AttributeValue>;
}>({
  name: 'documentSection',
  group: 'block',
  content: 'block*',
  atom: true,
  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-document-section-block',
        'aria-label': 'Structured content block',
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [
      {
        tag: 'div.sd-document-section-block',
        priority: 60,
      },
    ];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, AttributeValue> }): DOMOutputSpec {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes as Record<string, AttributeValue>),
      0,
    ];
  },

  addAttributes() {
    return {
      id: {},
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem: Element) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
      title: {},
      description: {},
      sectionType: {},
      isLocked: { default: false },
    };
  },

  addNodeView() {
    return ({
      node,
      getPos,
      decorations,
    }: {
      node: PmNode;
      getPos: () => number | undefined;
      decorations: Decoration[];
    }) => {
      return new DocumentSectionView(node, getPos, decorations, this.editor!);
    };
  },

  addCommands() {
    return {
      /**
       * Create a lockable content section
       * @category Command
       * @param {SectionCreate} [options={}] - Section configuration
       * @example
       * editor.commands.createDocumentSection({
       *   id: 1,
       *   title: 'Terms & Conditions',
       *   isLocked: true,
       *   html: '<p>Legal content...</p>'
       * })
       */
      createDocumentSection:
        (options: SectionCreate = {}): Command =>
        ({ tr, state, dispatch, editor }) => {
          const currentEditor = editor ?? this.editor;
          if (!currentEditor) return false;

          const { selection } = state;
          let { from, to } = selection;

          let content: Fragment = selection.content().content;
          const { html: optionsHTML, json: optionsJSON } = options;

          // If HTML is provided, parse it and convert to ProseMirror nodes
          if (optionsHTML) {
            const html = htmlHandler(optionsHTML, currentEditor);
            const doc = PMDOMParser.fromSchema(currentEditor.schema).parse(html);
            content = doc.content;
          }

          // JSON takes priority over HTML
          if (optionsJSON) {
            content = currentEditor.schema.nodeFromJSON(optionsJSON).content;
          }

          if (!content.childCount) {
            content = currentEditor.schema.nodeFromJSON({ type: 'paragraph', content: [] }).content;
          }

          // We assign IDs as positive integers starting from 0.
          if (!options.id) {
            const allSections = SectionHelpers.getAllSections(currentEditor);
            options.id = allSections.length + 1;
          }

          if (!options.title) {
            options.title = 'Document section';
          }

          const nodeType = this.type;
          if (!nodeType || typeof nodeType === 'string') return false;
          const node = (nodeType as NodeType).createAndFill(options, content);
          if (!node) return false;

          const isAlreadyInSdtBlock = findParentNode((node) => node.type.name === 'documentSection')(selection);
          if (isAlreadyInSdtBlock && isAlreadyInSdtBlock.node) {
            const insertPos = isAlreadyInSdtBlock.pos + isAlreadyInSdtBlock.node.nodeSize;
            from = insertPos;
            to = insertPos;
          }

          // Replace the selection with the new node
          tr.replaceRangeWith(from, to, node);

          // Calculate where the node ends after insertion
          const nodeEnd = from + node.nodeSize;

          // Only insert paragraph if we're not at the document boundary and there's space
          let shouldInsertParagraph = true;
          let insertPos = nodeEnd;

          // Check if we can safely insert at this position
          if (nodeEnd >= tr.doc.content.size) {
            // We're at or beyond the document end
            insertPos = tr.doc.content.size;

            // Check if there's already content at the end
            if (insertPos > 0) {
              const $endPos = tr.doc.resolve(insertPos);
              if ($endPos.nodeBefore && $endPos.nodeBefore.type.name === 'paragraph') {
                shouldInsertParagraph = false; // There's already a paragraph
              }
            }
          }

          if (shouldInsertParagraph) {
            const emptyParagraph = tr.doc.type.schema.nodes.paragraph.create();
            tr.insert(insertPos, emptyParagraph);
          }

          if (dispatch) {
            tr.setMeta('documentSection', { action: 'create' });
            dispatch(tr);

            // Set selection after the DOM has updated
            setTimeout(() => {
              try {
                const currentState = editor.state;
                const docSize = currentState.doc.content.size;

                // Calculate target position more safely
                let targetPos = from + node.nodeSize;

                // If we inserted a paragraph, position inside it
                if (shouldInsertParagraph) {
                  targetPos += 1; // +1 to get inside the paragraph
                }

                // Ensure we don't go beyond document bounds
                targetPos = Math.min(targetPos, docSize);

                // Ensure we have a valid position (at least 1 if document has content)
                if (targetPos < docSize && targetPos > 0) {
                  const newSelection = Selection.near(currentState.doc.resolve(targetPos));
                  const newTr = currentState.tr.setSelection(newSelection);
                  editor.view.dispatch(newTr);
                }
              } catch (e) {
                console.warn('Could not set delayed selection:', e);
              }
            }, 0);
          }

          return true;
        },

      /**
       * Remove section wrapper at cursor, preserving its content
       * @category Command
       * @example
       * editor.commands.removeSectionAtSelection()
       * @note Content stays in document, only section wrapper is removed
       */
      removeSectionAtSelection:
        (): Command =>
        ({ tr, dispatch }) => {
          const sdtNode = findParentNode((node) => node.type.name === 'documentSection')(tr.selection);
          if (!sdtNode) return false;

          const { node, pos } = sdtNode;

          // Calculate positions before making changes
          const nodeStart = pos;
          const nodeEnd = nodeStart + node.nodeSize;

          // Extract the content we want to preserve
          const contentToPreserve = node.content;

          // Delete the entire structured content block
          tr.delete(nodeStart, nodeEnd);

          // Insert the preserved content at the same position
          if (contentToPreserve.size > 0) {
            tr.insert(nodeStart, contentToPreserve);
          }

          // Set selection to a safe position after the operation
          const newPos = Math.min(nodeStart, tr.doc.content.size);
          tr.setSelection(Selection.near(tr.doc.resolve(newPos)));

          if (dispatch) {
            tr.setMeta('documentSection', { action: 'delete' });
            dispatch(tr);
          }

          return true;
        },

      /**
       * Delete section and all its content
       * @category Command
       * @param {number} id - Section to delete
       * @example
       * editor.commands.removeSectionById(123)
       */
      removeSectionById:
        (id: number): Command =>
        ({ tr, dispatch }) => {
          const currentEditor = this.editor;
          if (!currentEditor) return false;
          const sections = SectionHelpers.getAllSections(currentEditor);
          const sectionToRemove = sections.find(({ node }) => node.attrs.id === id);
          if (!sectionToRemove) return false;

          const { pos, node } = sectionToRemove;
          const nodeStart = pos;
          const nodeEnd = nodeStart + node.nodeSize;

          // Delete the entire structured content block
          tr.delete(nodeStart, nodeEnd);

          if (dispatch) {
            tr.setMeta('documentSection', { action: 'delete', id });
            dispatch(tr);
          }

          return true;
        },

      /**
       * Lock section against edits
       * @category Command
       * @param {number} id - Section to lock
       * @example
       * editor.commands.lockSectionById(123)
       */
      lockSectionById:
        (id: number): Command =>
        ({ tr, dispatch }) => {
          const currentEditor = this.editor;
          if (!currentEditor) return false;
          const sections = SectionHelpers.getAllSections(currentEditor);
          const sectionToLock = sections.find(({ node }) => node.attrs.id === id);
          if (!sectionToLock) return false;

          tr.setNodeMarkup(sectionToLock.pos, null, { ...sectionToLock.node.attrs, isLocked: true });

          if (dispatch) {
            tr.setMeta('documentSection', { action: 'lock', id });
            dispatch(tr);
          }

          return true;
        },

      /**
       * Modify section attributes or content
       * @category Command
       * @param {SectionUpdate} options - Changes to apply
       * @example
       * editor.commands.updateSectionById({ id: 123, attrs: { isLocked: false } })
       * editor.commands.updateSectionById({ id: 123, html: '<p>New content</p>' })
       * editor.commands.updateSectionById({
       *   id: 123,
       *   html: '<p>Updated</p>',
       *   attrs: { title: 'New Title' }
       * })
       */
      updateSectionById:
        ({ id, html, json, attrs }: SectionUpdate): Command =>
        ({ tr, dispatch, editor }) => {
          const currentEditor = editor || this.editor;
          if (!currentEditor) return false;
          const sections = SectionHelpers.getAllSections(currentEditor);
          const sectionToUpdate = sections.find(({ node }) => node.attrs.id === id);
          if (!sectionToUpdate) return false;

          const { pos, node } = sectionToUpdate;
          let newContent: Fragment | PmNode | null = null;

          // If HTML is provided, parse it and convert to ProseMirror nodes
          if (html) {
            const htmlDoc = htmlHandler(html, editor || this.editor);
            const doc = PMDOMParser.fromSchema((editor || this.editor).schema).parse(htmlDoc);
            newContent = doc.content;
          }

          // JSON takes priority over HTML
          if (json) {
            newContent = (editor || this.editor).schema.nodeFromJSON(json);
          }

          // If no new content, keep the old content
          if (!newContent) {
            newContent = node.content;
          }

          const updatedNode = node.type.create({ ...node.attrs, ...attrs }, newContent, node.marks);

          tr.replaceWith(pos, pos + node.nodeSize, updatedNode);

          if (dispatch) {
            tr.setMeta('documentSection', { action: 'update', id, attrs });
            dispatch(tr);
          }

          return true;
        },
    } as Record<string, (...args: unknown[]) => unknown>;
  },

  addHelpers() {
    return {
      ...SectionHelpers,
    } as Record<string, (...args: unknown[]) => unknown>;
  },
});
