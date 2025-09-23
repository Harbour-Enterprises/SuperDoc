import { Attribute, Node } from '@core/index.js';
import { ImageRegistrationPlugin } from './imageHelpers/imageRegistrationPlugin.js';
import { ImagePositionPlugin } from './imageHelpers/imagePositionPlugin.js';

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
    /**
     * @typedef {Object} ImageOptions
     * @category Options
     * @property {boolean} [allowBase64=true] - Allow base64 encoded images
     * @property {Object} [htmlAttributes] - Default HTML attributes for image elements
     */
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
      /**
       * @category Attribute
       * @param {string} [src] - Image source URL or path
       */
      src: {
        default: null,
        renderDOM: ({ src }) => {
          return {
            src: this.storage.media[src] ?? src,
          };
        },
      },

      /**
       * @category Attribute
       * @param {string} [alt='Uploaded picture'] - Alternative text for accessibility
       */
      alt: {
        default: 'Uploaded picture',
      },

      /**
       * @category Attribute
       * @param {string} [id] - Image element ID
       * @private
       */
      id: { rendered: false },

      /**
       * @category Attribute
       * @param {string} [title] - Image title/tooltip text
       */
      title: {
        default: null,
      },

      /**
       * @category Attribute
       * @param {string} [rId] - Relationship ID for Word export
       * @private
       */
      rId: {
        default: null,
        rendered: false,
      },

      /**
       * @category Attribute
       * @param {Object} [originalPadding] - Original padding values from Word import
       * @private
       */
      originalPadding: {
        default: null,
        rendered: false,
      },

      /**
       * @category Attribute
       * @param {Object} [originalAttributes] - Original attributes from Word import
       * @private
       */
      originalAttributes: { rendered: false },

      /**
       * @category Attribute
       * @param {boolean} [wrapTopAndBottom] - Wrap text above and below image
       * @private
       */
      wrapTopAndBottom: { rendered: false },

      /**
       * @category Attribute
       * @param {Object} [anchorData] - Anchor positioning data for Word
       * @private
       */
      anchorData: {
        default: null,
        rendered: false,
      },

      /**
       * @category Attribute
       * @param {boolean} [isAnchor] - Whether image is anchored
       * @private
       */
      isAnchor: { rendered: false },

      /**
       * @category Attribute
       * @param {boolean} [simplePos] - Simple positioning flag
       * @private
       */
      simplePos: { rendered: false },

      /**
       * @category Attribute
       * @param {string} [wrapText] - Text wrapping style
       * @private
       */
      wrapText: { rendered: false },
      extension: { rendered: false },

      /**
       * @category Attribute
       * @param {Object} [size] - Image dimensions
       * @param {number} [size.width] - Width in pixels
       * @param {number} [size.height] - Height in pixels
       */
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

      /**
       * @category Attribute
       * @param {Object} [padding] - Image padding/margins
       * @param {number} [padding.left] - Left padding in pixels
       * @param {number} [padding.top] - Top padding in pixels
       * @param {number} [padding.bottom] - Bottom padding in pixels
       * @param {number} [padding.right] - Right padding in pixels
       */
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

      /**
       * @category Attribute
       * @param {Object} [marginOffset] - Margin offset for anchored images
       * @param {number} [marginOffset.left] - Left margin offset
       * @param {number} [marginOffset.top] - Top margin offset
       */
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

      /**
       * @category Attribute
       * @param {string} [style] - Custom inline CSS styles
       */
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
       * @param {Object} options - Image attributes
       * @param {string} options.src - Image source URL or data URI
       * @param {string} [options.alt] - Alternative text
       * @param {string} [options.title] - Image title
       * @param {Object} [options.size] - Image dimensions
       * @returns {Function} Command function
       * @example
       * // Insert an image from a URL
       * setImage({ src: 'https://example.com/image.jpg' })
       *
       * // Insert a base64 encoded image
       * setImage({
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
    return [ImageRegistrationPlugin({ editor: this.editor }), ImagePositionPlugin({ editor: this.editor })];
  },
});
