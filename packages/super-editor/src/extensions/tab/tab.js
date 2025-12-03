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

    // Helper: Merge overlapping ranges to avoid redundant recalculations
    const mergeRanges = (ranges) => {
      if (ranges.length === 0) return [];

      const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
      const merged = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const [start, end] = sorted[i];
        const last = merged[merged.length - 1];

        if (start <= last[1]) {
          // Overlapping - extend the last range
          last[1] = Math.max(last[1], end);
        } else {
          merged.push([start, end]);
        }
      }

      return merged;
    };

    const tabPlugin = new Plugin({
      name: 'tabPlugin',
      key: new PluginKey('tabPlugin'),
      state: {
        init() {
          return { decorations: false, needsRecalc: null };
        },
        apply(tr, { decorations, needsRecalc }, _oldState, newState) {
          // Check if this transaction has a meta update for our plugin
          const meta = tr.getMeta(tabPlugin);
          if (meta) {
            return meta;
          }

          // Initialize decorations on first call
          if (!decorations) {
            decorations = DecorationSet.create(newState.doc, getTabDecorations(newState.doc, view, helpers));
            return { decorations, needsRecalc: null };
          }

          // Early return for non-document changes
          if (!tr.docChanged || tr.getMeta('blockNodeInitialUpdate')) {
            return { decorations, needsRecalc };
          }

          decorations = decorations.map(tr.mapping, tr.doc);

          const rangesToRecalculate = [];

          // Helper: Check if a node tree contains any tabs
          const containsTab = (node) => node.type.name === 'tab';

          tr.steps.forEach((step, index) => {
            if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) {
              return;
            }

            let hasTabInRange = false;

            // Fast check: does the inserted content contain tabs?
            if (step.slice?.content) {
              step.slice.content.descendants((node) => {
                if (containsTab(node)) {
                  hasTabInRange = true;
                  return false; // Stop early
                }
              });
            }

            // If no tabs inserted, check if the affected range had tabs
            if (!hasTabInRange) {
              tr.docs[index].nodesBetween(step.from, step.to, (node) => {
                if (containsTab(node)) {
                  hasTabInRange = true;
                  return false; // Stop early
                }
              });
            }

            if (!hasTabInRange) {
              return;
            }

            // Map positions from this step to final document
            let fromPos = step.from;
            let toPos = step.to;

            for (let i = index; i < tr.steps.length; i++) {
              const stepMap = tr.steps[i].getMap();
              fromPos = stepMap.map(fromPos, -1);
              toPos = stepMap.map(toPos, 1);
            }

            const $from = newState.doc.resolve(fromPos);
            const $to = newState.doc.resolve(toPos);
            const start = $from.start(Math.min($from.depth, 1));
            const end = $to.end(Math.min($to.depth, 1));

            rangesToRecalculate.push([start, end]);
          });

          if (rangesToRecalculate.length === 0) {
            return { decorations, needsRecalc: null };
          }

          // Merge overlapping ranges
          const mergedRanges = mergeRanges(rangesToRecalculate);

          // Recalculate decorations for merged ranges
          mergedRanges.forEach(([start, end]) => {
            const oldDecorations = decorations.find(start, end);
            decorations = decorations.remove(oldDecorations);
            const newDecorations = getTabDecorations(newState.doc, view, helpers, start, end);
            decorations = decorations.add(newState.doc, newDecorations);
          });

          // Mark ranges for post-DOM-update recalculation
          return { decorations, needsRecalc: mergedRanges };
        },
      },
      props: {
        decorations(state) {
          return this.getState(state).decorations;
        },
      },
      view: (editorView) => {
        return {
          update: (view, prevState) => {
            const pluginState = tabPlugin.getState(view.state);

            // If there are ranges that need recalculation after DOM update
            if (pluginState?.needsRecalc?.length > 0) {
              // Schedule recalculation after DOM has been updated
              requestAnimationFrame(() => {
                const currentPluginState = tabPlugin.getState(view.state);
                if (!currentPluginState?.needsRecalc) return;

                const { needsRecalc } = currentPluginState;
                let decorations = currentPluginState.decorations;

                // Recalculate decorations with fresh DOM measurements
                needsRecalc.forEach(([start, end]) => {
                  const oldDecorations = decorations.find(start, end);
                  decorations = decorations.remove(oldDecorations);
                  const newDecorations = getTabDecorations(view.state.doc, view, helpers, start, end);
                  decorations = decorations.add(view.state.doc, newDecorations);
                });

                // Update plugin state with new decorations and clear needsRecalc flag
                const tr = view.state.tr;
                tr.setMeta(tabPlugin, { decorations, needsRecalc: null });
                view.dispatch(tr);
              });
            }
          },
        };
      },
    });
    return [tabPlugin];
  },
});

export const __testing__ = {
  getTabDecorations,
};
