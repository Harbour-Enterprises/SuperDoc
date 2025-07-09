import { Node, Attribute } from '@core/index.js';
import { TocNodeView } from './toc-nodeview.js';

export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',

  content: 'tocEntry*',

  defining: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-table-of-contents',
        'aria-label': 'Table of contents node'
      },
    };
  },

  addAttributes() {
    return {
      // Implementation plan attributes (Step 1)
      headingLevels: {
        default: [1, 2, 3],
        rendered: false,
      },
      hasLeaders: {
        default: true,
        rendered: false,
      },
      leaderType: {
        default: 'dot',
        rendered: false,
      },
      // Legacy attributes (for backward compatibility)
      tocStyle: {
        default: 'standard',
        rendered: false,
      },
      title: {
        default: 'Table of Contents',
        rendered: false,
      },
      showPageNumbers: {
        default: true,
        rendered: false,
      },
      rightAlignPageNumbers: {
        default: true,
        rendered: false,
      },
      useHyperlinks: {
        default: true,
        rendered: false,
      },
      // Note: includeHeadingLevels and useLeaders are deprecated in favor of headingLevels and hasLeaders
      // Keeping them for backward compatibility but they should not be used in new code
      includeHeadingLevels: {
        default: [1, 2, 3],
        rendered: false,
      },
      useLeaders: {
        default: true,
        rendered: false,
      },
      attributes: {
        rendered: false,
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => new TocNodeView(node, getPos, editor);
  },

  parseDOM() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
        priority: 60,
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        'data-type': this.name,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertTableOfContents: (attributes = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
          content: [],
        });
      },
    };
  },
}); 