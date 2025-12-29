import { Node } from '@core/index.js';

/**
 * Configuration options for PermEnd
 * @typedef {Object} PermEndOptions
 * @category Options
 */

/**
 * @module PermEnd
 * @sidebarTitle PermEnd
 * @snippetPath /snippets/extensions/perm-end.mdx
 */
export const PermEnd = Node.create({
  name: 'permEnd',
  group: 'inline',
  inline: true,

  renderDOM() {
    return ['span', { style: 'display: none;' }];
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
