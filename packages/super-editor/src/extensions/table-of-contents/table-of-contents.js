import { Node, Attribute } from '@core/index.js';

/**
 * Get the page number for a given document position based on layout engine pages
 * @param {Object} editor - Editor instance
 * @param {number} pos - Document position
 * @returns {number} Page number (1-indexed)
 */
function getPageNumberForPosition(editor, pos) {
  // Get pages from the layout engine via PresentationEditor
  const pages = editor?.presentationEditor?.getPages?.();

  if (!pages || pages.length === 0) {
    return 1;
  }

  // Find the page that contains this position by checking fragments
  for (const page of pages) {
    if (!page.fragments) {
      continue;
    }

    // Check if any fragment on this page contains the position
    for (const fragment of page.fragments) {
      const pmStart = fragment.pmStart;
      const pmEnd = fragment.pmEnd;

      // If the fragment has ProseMirror range and contains our position
      if (pmStart !== undefined && pmEnd !== undefined) {
        if (pos >= pmStart && pos <= pmEnd) {
          return page.number;
        }
      }
    }
  }

  // If position is not found in any fragment, find the nearest page
  // This handles positions between content blocks or in special nodes
  let closestPage = pages[0];
  let closestDistance = Infinity;

  for (const page of pages) {
    if (!page.fragments || page.fragments.length === 0) {
      continue;
    }

    for (const fragment of page.fragments) {
      const pmStart = fragment.pmStart;
      const pmEnd = fragment.pmEnd;

      if (pmStart !== undefined && pmEnd !== undefined) {
        // Calculate distance to this fragment
        let distance;
        if (pos < pmStart) {
          distance = pmStart - pos;
        } else if (pos > pmEnd) {
          distance = pos - pmEnd;
        } else {
          // Position is within fragment (should have been caught above)
          return page.number;
        }

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = page;
        }
      }
    }
  }

  return closestPage.number;
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
              tocNodeInfo = { node, pos: $searchPos.before(depth) };
              break;
            }
            // Only check for standalone tableOfContents if no documentPartObject found
            if (node.type.name === 'tableOfContents') {
              tocNodeInfo = { node, pos: $searchPos.before(depth) };
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

          for (let depth = $searchPos.depth; depth > 0; depth--) {
            if (tocNodeInfo) {
              break;
            }
            const node = $searchPos.node(depth);
            // Check for documentPartObject first (outer wrapper)
            if (node.type.name === 'documentPartObject' && node.attrs?.docPartGallery === 'Table of Contents') {
              // Find the inner tableOfContents node
              const outerTocPos = $searchPos.before(depth) + 1;
              node.descendants((child, pos) => {
                if (tocNodeInfo) {
                  // Already found.
                  return false;
                }
                if (child.type.name === 'tableOfContents') {
                  tocNodeInfo = {
                    node: child,
                    pos: outerTocPos + pos,
                    depth,
                  };
                  return false; // Stop searching
                }
              });
              break;
            }
            // Alternatively check for tableOfContents node.
            if (node.type.name === 'tableOfContents') {
              tocNodeInfo = { node, pos: $searchPos.before(depth), depth };
              break;
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
              const styleId = node.attrs?.paragraphProperties?.styleId;
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

                // Get page number from layout engine
                const pageNumber = getPageNumberForPosition(editor, pos);

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
                  paragraphProperties: {
                    styleId: `TOC${heading.level}`,
                  },
                  isTocEntry: true,
                },
                content,
              );
            });

            // Use the inner TOC node's attributes if available, otherwise use empty object
            const tocAttrs = tocNodeInfo.node.attrs || {};

            // Create new inner tableOfcontents
            const newInnerToc = schema.nodes.tableOfContents.create(tocAttrs, tocEntries);
            tr.replaceWith(tocNodeInfo.pos, tocNodeInfo.pos + tocNodeInfo.node.nodeSize, newInnerToc);

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
