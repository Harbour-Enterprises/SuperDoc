import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { ReplaceStep, ReplaceAroundStep } from 'prosemirror-transform';
import { getTabDecorations } from './helpers/tabDecorations.js';

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
    const { view, helpers } = this.editor;
    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init() {
          return { decorations: false };
        },
        apply(tr, { decorations }, _oldState, newState) {
          if (!decorations) {
            decorations = DecorationSet.create(newState.doc, getTabDecorations(newState.doc, view, helpers));
          }

          if (!tr.docChanged) {
            return { decorations };
          }
          decorations = decorations.map(tr.mapping, tr.doc);

          let rangesToRecalculate = [];
          tr.steps.forEach((step, index) => {
            const stepMap = step.getMap();
            if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
              const $from = tr.docs[index].resolve(step.from);
              const $to = tr.docs[index].resolve(step.to);
              const start = $from.start(Math.min($from.depth, 1)); // start of node at level 1
              const end = $to.end(Math.min($to.depth, 1)); // end of node at level 1
              let addRange = false;
              tr.docs[index].nodesBetween(start, end, (node) => {
                if (node.type.name === 'tab') {
                  // Node contains or contained a tab
                  addRange = true;
                }
              });
              if (!addRange && step.slice?.content) {
                step.slice.content.descendants((node) => {
                  if (node.type.name === 'tab') {
                    // A tab was added.
                    addRange = true;
                  }
                });
              }
              if (addRange) {
                rangesToRecalculate.push([start, end]);
              }
            }
            rangesToRecalculate = rangesToRecalculate.map(([from, to]) => {
              const mappedFrom = stepMap.map(from, -1);
              const mappedTo = stepMap.map(to, 1);
              return [mappedFrom, mappedTo];
            });
          });
          rangesToRecalculate.forEach(([start, end]) => {
            const oldDecorations = decorations.find(start, end);
            decorations = decorations.remove(oldDecorations);
            const newDecorations = getTabDecorations(newState.doc, view, helpers, start, end);
            decorations = decorations.add(newState.doc, newDecorations);
          });
          return { decorations };
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

export const __testing__ = {
  getTabDecorations,
};
