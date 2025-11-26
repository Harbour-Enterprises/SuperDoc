import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { isHeadless } from '@/utils/headless-helpers.js';
import { createLayoutRequest, calculateTabLayout, applyLayoutResult } from './helpers/tabAdapter.js';

/**
 * Configuration options for TabNode
 * @typedef {Object} TabNodeOptions
 * @category Options
 * @property {Object} [htmlAttributes] - HTML attributes for tab elements
 */

/**
 * Attributes for tab nodes
 * @typedef {Object} TabNodeAttributes
 * @category Attributes
 * @property {number} [tabSize] - Width of the tab in pixels
 */

/**
 * @module TabNode
 * @sidebarTitle Tab
 * @snippetPath /snippets/extensions/tab.mdx
 */
export const TabNode = Node.create({
  name: 'tab',
  group: 'inline',
  inline: true,
  // need this prop so Prosemirror doesn't treat tab as an
  // empty node and doesn't insert separator after
  content: 'inline*',
  selectable: false,
  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-tab',
        // this works together with content prop:
        // since tab can't have content inside but content prop is defined I have to manually add attribute
        contentEditable: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'span.sd-editor-tab' }];
  },

  renderDOM({ htmlAttributes }) {
    return ['span', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      tabSize: {
        renderDOM: ({ tabSize }) => {
          if (!tabSize) return {};
          const style = `width: ${tabSize}px; min-width: ${tabSize}px;`;
          return { style };
        },
      },
    };
  },

  addPmPlugins() {
    // Skip tab plugin entirely in headless mode
    if (isHeadless(this.editor)) {
      return [];
    }

    const { view, helpers } = this.editor;

    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init() {
          return { decorations: false, revision: 0 };
        },
        apply(tr, { decorations, revision }, _oldState, newState) {
          // Initialize decorations on first call
          if (!decorations) {
            const newDecorations = buildDecorations(newState.doc, view, helpers, 0);
            return { decorations: newDecorations, revision: 0 };
          }

          // Early return for non-document changes
          if (!tr.docChanged || tr.getMeta('blockNodeInitialUpdate')) {
            return { decorations, revision };
          }

          // Recompute decorations for the document (coarse-grained; can be optimized later)
          const nextRevision = revision + 1;
          const newDecorations = buildDecorations(newState.doc, view, helpers, nextRevision);
          return { decorations: newDecorations, revision: nextRevision };
        },
      },
      props: {
        decorations(state) {
          return this.getState(state).decorations;
        },
      },
    });
    return [tabPlugin];
  },
});

function buildDecorations(doc, view, helpers, revision) {
  const decorations = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return;
    let hasTab = false;
    node.descendants((child) => {
      if (child.type.name === 'tab') {
        hasTab = true;
        return false;
      }
      return true;
    });
    if (!hasTab) return;

    const request = createLayoutRequest(doc, pos + 1, view, helpers, revision);
    if (!request) return;
    const result = calculateTabLayout(request, undefined, view);
    const paragraphDecorations = applyLayoutResult(result, node, pos);
    decorations.push(...paragraphDecorations);
  });
  return DecorationSet.create(doc, decorations);
}
