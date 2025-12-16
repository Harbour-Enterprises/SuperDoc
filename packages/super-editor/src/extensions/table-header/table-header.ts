import { Node, Attribute } from '@core/index.js';
import type { AttributeValue, RenderNodeContext } from '@core/index.js';
import type { DOMOutputSpec, ParseRule } from 'prosemirror-model';

/**
 * Configuration options for TableHeader
 * @category Options
 */
interface TableHeaderOptions extends Record<string, unknown> {
  /** HTML attributes for table headers */
  htmlAttributes: Record<string, AttributeValue>;
}

/**
 * Attributes for table header nodes
 * @typedef {Object} TableHeaderAttributes
 * @category Attributes
 * @property {number} [colspan=1] - Number of columns this header spans
 * @property {number} [rowspan=1] - Number of rows this header spans
 * @property {number[]} [colwidth] - Column widths array in pixels
 */

/**
 * @module TableHeader
 * @sidebarTitle Table Header
 * @snippetPath /snippets/extensions/table-header.mdx
 */
export const TableHeader = Node.create<TableHeaderOptions>({
  name: 'tableHeader',

  content: 'block+',

  tableRole: 'header_cell',

  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        'aria-label': 'Table head node',
      },
    };
  },

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },

      rowspan: {
        default: 1,
      },

      colwidth: {
        default: null,
        parseDOM: (element: Element) => {
          const colwidth = element.getAttribute('data-colwidth');
          const value = colwidth ? colwidth.split(',').map((width) => parseInt(width, 10)) : null;
          return value;
        },
        renderDOM: (attrs: { colwidth?: number[] | null }) => {
          if (!attrs.colwidth) return {};
          return {
            'data-colwidth': attrs.colwidth.join(','),
          };
        },
      },

      __placeholder: {
        default: null,
        parseDOM: (element: Element) => {
          const value = element.getAttribute('data-placeholder');
          return value || null;
        },
        renderDOM({ __placeholder }: { __placeholder?: string | null }) {
          if (!__placeholder) return {};
          return {
            'data-placeholder': __placeholder,
          };
        },
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [{ tag: 'th' }];
  },

  renderDOM({ htmlAttributes }: RenderNodeContext): DOMOutputSpec {
    return [
      'th',
      Attribute.mergeAttributes(this.options?.htmlAttributes ?? {}, htmlAttributes as Record<string, AttributeValue>),
      0,
    ];
  },
});
