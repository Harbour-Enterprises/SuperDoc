import { Node } from '@core/index.js';

/**
 * Configuration options for RunItem
 * @typedef {Object} RunItemOptions
 * @category Options
 */

/**
 * Attributes for run nodes
 * @typedef {Object} RunItemAttributes
 * @category Attributes
 * @property {Object} [attributes] @internal - Internal attributes storage
 */

/**
 * @module RunItem
 * @sidebarTitle Run Item
 * @snippetPath /snippets/extensions/run-item.mdx
 */
export const RunItem = Node.create({
  name: 'run',

  group: 'inline',

  content: 'text*',

  inline: true,

  addOptions() {
    return {};
  },

  parseDOM() {
    return [{ tag: 'run' }];
  },

  renderDOM() {
    return ['run', 0];
  },

  addAttributes() {
    return {
      attributes: {
        rendered: false,
        'aria-label': 'Run node',
      },
    };
  },
});
