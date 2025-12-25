import { Node, Attribute } from '@core/index.js';
import { PaginationPluginKey } from '@extensions/pagination/pagination-helpers.js';

/**
 * Get the page number for a given document position based on pagination decorations
 * @param {Object} state - Editor state
 * @param {number} pos - Document position
 * @returns {number} Page number (1-indexed)
 */
function getPageNumberForPosition(state, pos) {
  const paginationState = PaginationPluginKey.getState(state);

  // If pagination is not enabled, return 1
  if (!paginationState?.isEnabled) {
    return 1;
  }

  const decorationSet = paginationState.decorations;
  if (!decorationSet) {
    return 1;
  }

  // Get all decorations from the document using DecorationSet.find()
  // Count unique page break positions before this position
  // Multiple decorations can exist at the same position (spacer, header, footer)
  // so we count unique positions, not decorations
  const pageBreakPositions = Array.from(
    new Set(decorationSet.find(0, state.doc.content.size).map((decoration) => decoration.from)),
  ).sort((a, b) => a - b);

  let pageNumber = 0;

  for (const pageBreakPos of pageBreakPositions) {
    // Skip if this decoration is after our target position
    if (pageBreakPos > pos) {
      break;
    }

    // Count unique page break positions
    if (pageBreakPos <= pos) {
      pageNumber += 1;
    }
  }

  return pageNumber;
}

export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',

  content: 'paragraph+',

  inline: false,

  addOptions() {
    return {
      htmlAttributes: {
        'data-id': 'table-of-contents',
        'aria-label': 'Table of Contents',
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: 'div[data-id="table-of-contents"]',
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      instruction: {
        default: null,
        rendered: false,
      },
      /**
       * @private
       * @category Attribute
       * @param {string} [sdBlockId] - Internal block tracking ID (not user-configurable)
       */
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
    };
  },

  addCommands() {
    return {
      /**
       * Delete the table of contents at the current cursor position
       * @category Command
       * @param {number} [options.pos] - Optional position to search for TOC (used when right-clicking)
       * @example
       * editor.commands.deleteTableOfContents()
       * editor.commands.deleteTableOfContents({ pos: 100 })
       */
      deleteTableOfContents:
        (options = {}) =>
        ({ state, tr, dispatch }) => {
          const { selection } = state;

          // Use provided position or fall back to current selection
          const searchPos = options.pos !== undefined ? options.pos : selection.from;
          const $searchPos = state.doc.resolve(searchPos);

          // Find the TOC node - check for documentPartObject FIRST to ensure we delete the entire structure
          let tocNodeInfo = null;

          // Search up the tree for TOC nodes
          for (let depth = $searchPos.depth; depth > 0; depth--) {
            const node = $searchPos.node(depth);
            // Check for documentPartObject first (outer wrapper)
            if (node.type.name === 'documentPartObject' && node.attrs?.docPartGallery === 'Table of Contents') {
              tocNodeInfo = { node, pos: $searchPos.before(depth), depth };
              break;
            }
            // Only check for standalone tableOfContents if no documentPartObject found
            if (node.type.name === 'tableOfContents') {
              tocNodeInfo = { node, pos: $searchPos.before(depth), depth };
              // Don't break yet - continue searching for documentPartObject at higher depth
            }
          }

          if (!tocNodeInfo) {
            return false;
          }

          if (dispatch) {
            const { pos, node } = tocNodeInfo;
            tr.delete(pos, pos + node.nodeSize);
            tr.setMeta('forceUpdatePagination', true);
            dispatch(tr);
          }

          return true;
        },

      /**
       * Update the table of contents by regenerating it from document headings
       * @category Command
       * @param {number} [options.pos] - Optional position to search for TOC (used when right-clicking)
       * @example
       * editor.commands.updateTableOfContents()
       * editor.commands.updateTableOfContents({ pos: 100 })
       */
      updateTableOfContents:
        (options = {}) =>
        ({ state, tr, dispatch, editor }) => {
          // Ensure we're working with the most current state
          const currentDoc = tr.doc;
          const { selection, schema } = state;

          // Use provided position or fall back to current selection
          const searchPos = options.pos !== undefined ? options.pos : selection.from;
          const $searchPos = state.doc.resolve(searchPos);

          // Find the TOC node starting from the search position
          let tocNodeInfo = null;
          let isDocPartObject = false;
          let innerTocNode = null;

          for (let depth = $searchPos.depth; depth > 0; depth--) {
            const node = $searchPos.node(depth);
            // Check for documentPartObject first (outer wrapper)
            if (node.type.name === 'documentPartObject' && node.attrs?.docPartGallery === 'Table of Contents') {
              tocNodeInfo = { node, pos: $searchPos.before(depth), depth };
              isDocPartObject = true;
              // Find the inner tableOfContents node
              node.descendants((child) => {
                if (!innerTocNode && child.type.name === 'tableOfContents') {
                  innerTocNode = child;
                  return false; // Stop searching
                }
              });
              break;
            }
            // Only check for standalone tableOfContents if no documentPartObject found
            if (node.type.name === 'tableOfContents') {
              tocNodeInfo = { node, pos: $searchPos.before(depth), depth };
              // Don't break - keep looking for documentPartObject
            }
          }

          if (!tocNodeInfo) {
            return false;
          }

          // Collect all headings from the current document with their bookmark names and page numbers
          const headings = [];
          currentDoc.descendants((node, pos) => {
            if (node.type.name === 'paragraph') {
              // Fix: Check attrs.styleId instead of attrs.paragraphProperties.styleId
              const styleId = node.attrs?.styleId;
              if (styleId && /^Heading(\d)$/.test(styleId)) {
                const level = parseInt(styleId.match(/^Heading(\d)$/)[1]);
                // Get text directly from the current document node
                const text = node.textContent;

                // Try to find a bookmark in this heading paragraph
                let bookmarkName = null;
                node.descendants((child) => {
                  if (child.type.name === 'bookmarkStart' && child.attrs?.name) {
                    bookmarkName = child.attrs.name;
                    return false; // Stop searching
                  }
                });

                // Get page number from pagination system
                const pageNumber = getPageNumberForPosition(state, pos);

                headings.push({ level, text, pos, bookmarkName, pageNumber });
              }
            }
          });

          if (dispatch) {
            const { pos, node } = tocNodeInfo;

            // Generate TOC entry paragraphs with links and tabs
            const tocEntries = headings.map((heading) => {
              // Create the content for the TOC entry
              const content = [];

              // Use the page number from pagination, or fallback to "1" if not available
              const pageNumberText = heading.pageNumber ? heading.pageNumber.toString() : '1';

              // If we have a bookmark, create a link, otherwise just use plain text
              if (heading.bookmarkName) {
                // Create link mark
                const linkMark = schema.marks.link.create({
                  href: `#${heading.bookmarkName}`,
                  anchor: heading.bookmarkName,
                });

                // Add heading text with link mark
                content.push(schema.text(heading.text, [linkMark]));

                // Add tab node (dotted line separator)
                if (schema.nodes.tab) {
                  content.push(schema.nodes.tab.create());
                }

                // Add page number with link mark
                content.push(schema.text(pageNumberText, [linkMark]));
              } else {
                // Fallback: no bookmark found, just use plain text
                content.push(schema.text(heading.text));

                // Add tab node (dotted line separator)
                if (schema.nodes.tab) {
                  content.push(schema.nodes.tab.create());
                }

                // Add page number
                content.push(schema.text(pageNumberText));
              }

              return schema.nodes.paragraph.create(
                {
                  styleId: `TOC${heading.level}`,
                  isTocEntry: true,
                },
                content,
              );
            });

            if (isDocPartObject) {
              // Always create a fresh TOC title paragraph (don't reuse to avoid duplicates)
              const tocTitleNode = schema.nodes.paragraph.create(
                {
                  styleId: 'TOCHeading',
                },
                schema.text('Table of Contents'),
              );

              // Use the inner TOC node's attributes if available, otherwise use empty object
              const tocAttrs = innerTocNode?.attrs || {};

              // Create new tableOfContents with ONLY the entries (no title inside)
              const newTocContent = schema.nodes.tableOfContents.create(tocAttrs, tocEntries);

              // Create documentPartObject with title as first child, TOC as second
              const newDocPartObject = schema.nodes.documentPartObject.create(node.attrs, [
                tocTitleNode,
                newTocContent,
              ]);

              tr.replaceWith(pos, pos + node.nodeSize, newDocPartObject);
            } else {
              // If it's just a standalone tableOfContents node, include title inside
              const tocTitleNode = schema.nodes.paragraph.create(
                {
                  styleId: 'TOCHeading',
                },
                schema.text('Table of Contents'),
              );

              const newTocNode = schema.nodes.tableOfContents.create(node.attrs, [tocTitleNode, ...tocEntries]);
              tr.replaceWith(pos, pos + node.nodeSize, newTocNode);
            }

            // Trigger pagination update on the same transaction
            // This ensures decorations are properly mapped and page numbers are recalculated
            tr.setMeta('forceUpdatePagination', true);

            dispatch(tr);
          }

          return true;
        },
    };
  },
});
