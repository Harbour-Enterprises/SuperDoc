import { Node, Attribute, type AttributeValue } from '@core/index.js';

/**
 * Configuration options for ShapeContainer
 * @category Options
 */
interface ShapeContainerOptions extends Record<string, unknown> {
  /** HTML attributes for shape container elements */
  htmlAttributes: Record<string, string>;
}

/**
 * Attributes for shape container nodes
 * @typedef {Object} ShapeContainerAttributes
 * @category Attributes
 * @property {string} [fillcolor] - Background color for the shape
 * @property {string} [style] - CSS style string
 * @property {string} [sdBlockId] @internal - Internal block tracking ID
 * @property {Object} [wrapAttributes] @internal - Internal wrapper attributes
 * @property {Object} [attributes] @internal - Internal attributes storage
 */

/**
 * @module ShapeContainer
 * @sidebarTitle Shape Container
 * @snippetPath /snippets/extensions/shape-container.mdx
 */
export const ShapeContainer = Node.create<ShapeContainerOptions>({
  name: 'shapeContainer',

  group: 'block',

  content: 'block+',

  isolating: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: 'sd-editor-shape-container',
        'aria-label': 'Shape container node',
      },
    };
  },

  addAttributes() {
    return {
      fillcolor: {
        renderDOM: (attrs: { fillcolor?: string }) => {
          if (!attrs.fillcolor) return {};
          return {
            style: `background-color: ${attrs.fillcolor}`,
          };
        },
      },
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem: Element) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs: { sdBlockId?: string | null }) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
      style: {
        renderDOM: (attrs: { style?: string }) => {
          if (!attrs.style) return {};
          return {
            style: attrs.style,
          };
        },
      },

      wrapAttributes: {
        rendered: false,
      },

      attributes: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, unknown> }) {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes as Record<string, AttributeValue>, {
        'data-type': this.name,
      }),
      0,
    ];
  },
});
