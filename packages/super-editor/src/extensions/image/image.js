import { Attribute, Node } from '@core/index.js';
import { ImagePlaceholderPlugin } from './imageHelpers/imagePlaceholderPlugin.js';
import { ImagePositionPlugin } from './imageHelpers/imagePositionPlugin.js';

/**
 * Configuration options for Image
 * @typedef {Object} ImageOptions
 * @category Options
 * @property {boolean} [allowBase64=true] - Allow base64 encoded images
 * @property {Object} [htmlAttributes] - Default HTML attributes for image elements
 */

/**
 * Attributes for image nodes
 * @typedef {Object} ImageAttributes
 * @category Attributes
 * @property {string} [src] - Image source URL or path
 * @property {string} [alt='Uploaded picture'] - Alternative text for accessibility
 * @property {string} [title] - Image title/tooltip text
 * @property {Object} [size] - Image dimensions
 * @property {number} [size.width] - Width in pixels
 * @property {number} [size.height] - Height in pixels
 * @property {Object} [padding] - Image padding/margins
 * @property {number} [padding.left] - Left padding in pixels
 * @property {number} [padding.top] - Top padding in pixels
 * @property {number} [padding.bottom] - Bottom padding in pixels
 * @property {number} [padding.right] - Right padding in pixels
 * @property {Object} [marginOffset] - Margin offset for anchored images
 * @property {number} [marginOffset.left] - Left margin offset
 * @property {number} [marginOffset.top] - Top margin offset
 * @property {string} [style] - Custom inline CSS styles
 * @property {string} [id] @internal Image element ID
 * @property {string} [rId] @internal Relationship ID for Word export
 * @property {Object} [originalPadding] @internal Original padding values from Word import
 * @property {Object} [originalAttributes] @internal Original attributes from Word import
 * @property {boolean} [wrapTopAndBottom] @internal Wrap text above and below image
 * @property {Object} [anchorData] @internal Anchor positioning data for Word
 * @property {boolean} [isAnchor] @internal Whether image is anchored
 * @property {boolean} [simplePos] @internal Simple positioning flag
 * @property {string} [wrapText] @internal Text wrapping style
 */

/**
 * Options for inserting an image
 * @typedef {Object} ImageInsertOptions
 * @property {string} src - Image source URL or data URI
 * @property {string} [alt] - Alternative text
 * @property {string} [title] - Image title
 * @property {Object} [size] - Image dimensions
 * @property {number} [size.width] - Width in pixels
 * @property {number} [size.height] - Height in pixels
 */

/**
 * @module Image
 * @sidebarTitle Image
 * @snippetPath /snippets/extensions/image.mdx
 */
export const Image = Node.create({
  name: 'image',

  group: 'inline',

  inline: true,

  draggable: true,

  addOptions() {
    return {
      allowBase64: true,
      htmlAttributes: {
        style: 'display: inline-block;',
        'aria-label': 'Image node',
      },
    };
  },

  addStorage() {
    return {
      media: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        renderDOM: ({ src }) => {
          return {
            src: this.storage.media[src] ?? src,
          };
        },
      },

      alt: {
        default: 'Uploaded picture',
      },

      id: { rendered: false },

      title: {
        default: null,
      },

      rId: {
        default: null,
        rendered: false,
      },

      originalPadding: {
        default: null,
        rendered: false,
      },

      originalAttributes: { rendered: false },

      wrapTopAndBottom: { rendered: false },

      anchorData: {
        default: null,
        rendered: false,
      },

      isAnchor: { rendered: false },

      simplePos: { rendered: false },

      wrapText: { rendered: false },
      extension: { rendered: false },

      size: {
        default: {},
        renderDOM: ({ size, extension }) => {
          let style = '';

          const { width, height } = size ?? {};
          if (width) style += `width: ${width}px;`;
          if (height && ['emf', 'wmf'].includes(extension))
            style += `height: ${height}px; border: 1px solid black; position: absolute;`;
          else if (height) style += 'height: auto;';
          return { style };
        },
      },

      padding: {
        default: {},
        renderDOM: ({ padding, marginOffset }) => {
          const { left = 0, top = 0, bottom = 0, right = 0 } = padding ?? {};
          let style = '';
          if (left && !marginOffset?.left) style += `margin-left: ${left}px;`;
          if (top && !marginOffset?.top) style += `margin-top: ${top}px;`;
          if (bottom) style += `margin-bottom: ${bottom}px;`;
          if (right) style += `margin-right: ${right}px;`;
          return { style };
        },
      },

      marginOffset: {
        default: {},
        renderDOM: ({ marginOffset, anchorData }) => {
          const relativeFromPageV = anchorData?.vRelativeFrom === 'page';
          const maxMarginV = 500;
          const { left = 0, top = 0 } = marginOffset ?? {};

          let style = '';
          if (left) style += `margin-left: ${left}px;`;
          if (top) {
            if (relativeFromPageV && top >= maxMarginV) style += `margin-top: ${maxMarginV}px;`;
            else style += `margin-top: ${top}px;`;
          }
          return { style };
        },
      },

      style: {
        default: null,
        rendered: true,
        renderDOM: ({ style }) => {
          if (!style) return {};
          return { style };
        },
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['img', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },

  addCommands() {
    return {
      /**
       * Insert an image at the current position
       * @category Command
       * @param {ImageInsertOptions} options - Image insertion options
       * @example
       * editor.commands.setImage({ src: 'https://example.com/image.jpg' })
       * editor.commands.setImage({
       *   src: 'data:image/png;base64,...',
       *   alt: 'Company logo',
       *   size: { width: 200 }
       * })
       * @note Supports URLs, relative paths, and base64 data URIs
       */
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addPmPlugins() {
    return [ImagePlaceholderPlugin(), ImagePositionPlugin({ editor: this.editor })];
  },
});
