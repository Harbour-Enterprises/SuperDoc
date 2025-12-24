import { Node } from '@core/index.js';

/**
 * Configuration options for PermStart
 * @typedef {Object} PermStartOptions
 * @category Options
 */

/**
 * @module PermStart
 * @sidebarTitle PermStart
 * @snippetPath /snippets/extensions/perm-start.mdx
 */
export const PermStart = Node.create({
  name: 'permStart',
  group: 'inline',
  inline: true,

  renderDOM() {
    return ['span', { style: 'display: none;' }];
  },

  parseDOM() {
    return [{ tag: 'span' }];
  },

  addAttributes() {
    return {
      id: {
        default: '',
        parseDOM: (elem) => elem.getAttribute('data-id'),
        renderDOM: (attrs) => {
          if (!attrs.id) return {};
          return {
            'data-id': attrs.id,
          };
        },
      },
      edGrp: {
        default: '',
        parseDOM: (elem) => elem.getAttribute('data-ed-grp'),
        renderDOM: (attrs) => {
          if (!attrs.edGrp) return {};
          return {
            'data-ed-grp': attrs.edGrp,
          };
        },
      },
    };
  },
});
