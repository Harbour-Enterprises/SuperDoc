import { Attribute, Node } from '@core/index.js';
import { ImageRegistrationPlugin } from './imageHelpers/imageRegistrationPlugin.js';
import { ImagePositionPlugin } from './imageHelpers/imagePositionPlugin.js';
import { getNormalizedImageAttrs } from './imageHelpers/legacyAttributes.js';
import { getRotationMargins } from './imageHelpers/rotation.js';
import { inchesToPixels } from '@converter/helpers.js';

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
 * @property {number} [marginOffset.horizontal] - Left/right margin offset
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

      /**
       * @category Attribute
       * @param {Object} wrap - Wrapping options
       * @param {string} wrap.type - Wrap type: "None", "Square", "Through", "Tight", "TopAndBottom", "Inline"
       * @param {Object} [wrap.attrs] - Wrap attributes (only allowed attributes for the given type will be accepted)
       * @param {string} [wrap.attrs.wrapText] - Text wrapping mode for Square type: "bothSides", "largest", "left", "right"
       * @param {number} [wrap.attrs.distTop] - Top distance in pixels
       * @param {number} [wrap.attrs.distBottom] - Bottom distance in pixels
       * @param {number} [wrap.attrs.distLeft] - Left distance in pixels
       * @param {number} [wrap.attrs.distRight] - Right distance in pixels
       * @param {Array} [wrap.attrs.polygon] - Polygon points for Through/Tight types: [[x1,y1], [x2,y2], ...]
       * @param {boolean} [wrap.attrs.behindDoc] - Whether image should be behind document text (for wrapNone)
       */
      wrap: {
        default: { type: 'Inline' },
        rendered: false, // Handled in main renderDOM
      },

      anchorData: {
        default: null,
        rendered: false,
      },

      isAnchor: { rendered: false },

      /**
       * @category Attribute
       * @param {Object} [transformData] - Transform data for image (turn and flip)
       * @param {number} [transformData.rotation] - Turn angle in degrees
       * @param {boolean} [transformData.verticalFlip] - Whether to flip vertically
       * @param {boolean} [transformData.horizontalFlip] - Whether to flip horizontally
       * @param {Object} [transformData.sizeExtension] - Size extension for image due to transformation
       * @param {number} [transformData.sizeExtension.left] - Left size extension for image
       * @param {number} [transformData.sizeExtension.top] - Top size extension for image
       * @param {number} [transformData.sizeExtension.right] - Right size extension for image
       * @param {number} [transformData.sizeExtension.bottom] - Bottom size extension for image
       *
       * @private
       */

      transformData: {
        default: {},
        renderDOM: ({ transformData }) => {
          let style = '';
          if (transformData?.rotation) {
            style += `rotate(${Math.round(transformData.rotation)}deg) `;
          }
          if (transformData?.verticalFlip) {
            style += 'scaleY(-1) ';
          }
          if (transformData?.horizontalFlip) {
            style += 'scaleX(-1) ';
          }
          style = style.trim();
          if (style.length > 0) {
            return { style: `transform: ${style};` };
          }
          return;
        },
      },

      /**
       * @category Attribute
       * @param {boolean} [simplePos] - Simple positioning flag
       * @private
       */
      simplePos: { rendered: false },

      extension: { rendered: false },

      size: {
        default: {},
        renderDOM: ({ size, extension }) => {
          let style = '';
          let { width, height } = size ?? {};
          if (width) style += `width: ${width}px;`;
          if (height && ['emf', 'wmf'].includes(extension))
            style += `height: ${height}px; border: 1px solid black; position: absolute;`;
          else if (height) style += 'height: auto;';
          return { style };
        },
      },

      padding: {
        default: {},
        rendered: false, // Handled in main renderDOM
      },

      marginOffset: {
        default: {},
        rendered: false, // Handled in main renderDOM
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

  renderDOM({ node, htmlAttributes }) {
    // multiple attributes influence the margin sizes, so we handle them here together rather than separately.
    // Also, the editor context is needed for wrap styling in some cases.

    const { anchorData, padding, transformData = {}, size = { width: 0, height: 0 } } = node.attrs;
    const { wrap, marginOffset } = getNormalizedImageAttrs(node.attrs);
    const wrapAttrs = wrap?.attrs ?? {};
    const anchorHorizontalAlignment = anchorData?.alignH;
    const horizontalOffsetBase = marginOffset?.horizontal ?? 0;

    const margin = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    let centered = false;
    let floatRight = false;
    let baseHorizontal = marginOffset?.horizontal || 0;

    let style = '';

    // Handle padding
    if (padding) {
      if (padding.left) margin.left += padding.left;
      if (padding.right) margin.right += padding.right;
      if (padding.top) margin.top += padding.top;
      if (padding.bottom) margin.bottom += padding.bottom;
    }

    // Handle extra padding due to rotation
    // TODO: The wp:effectExtent (transformData.sizeExtension) sometimes
    // gives the right data (as calculated by getRotationMargins)
    // and sometimes it doesn't. We should investigate why there is a discrepancy.
    // if (transformData?.sizeExtension) {
    //   left += transformData.sizeExtension.left || 0;
    //   right += transformData.sizeExtension.right || 0;
    //   top += transformData.sizeExtension.top || 0;
    //   bottom += transformData.sizeExtension.bottom || 0;
    // }
    const { rotation } = transformData;
    const { height, width } = size;
    if (rotation && height && width) {
      const { horizontal, vertical } = getRotationMargins(width, height, rotation);
      margin.left += horizontal;
      margin.right += horizontal;
      margin.top += vertical;
      margin.bottom += vertical;
    }

    // Handle wrap styling (needs editor context)
    if (wrap && wrap.type) {
      const { type } = wrap;
      switch (type) {
        case 'None':
          style += 'position: absolute;';
          if (wrapAttrs.behindDoc) {
            style += 'z-index: -1;';
          } else {
            style += 'z-index: 1;';
          }
          break;

        case 'Square': {
          // TODO: HTML/CSS currently does not support floating an item to the top of the paragraph. So if
          // the image is further down in the paragraph, it will be positioned further down on the page.
          style += 'shape-outside: border-box;';
          if (!anchorData) {
            style += ' clear: both;';
          }
          let anchorAlignmentHandled = false;
          if (anchorHorizontalAlignment === 'left') {
            style += 'float: left;';
            anchorAlignmentHandled = true;
          } else if (anchorHorizontalAlignment === 'right') {
            style += 'float: right;';
            floatRight = true;
            anchorAlignmentHandled = true;
          } else if (anchorHorizontalAlignment === 'center') {
            style += 'display: block;';
            centered = true;
            anchorAlignmentHandled = true;
          }
          // Default to float left, allow wrapText to override
          if (wrapAttrs.wrapText === 'right') {
            if (!anchorAlignmentHandled) style += 'float: left;';
          } else if (wrapAttrs.wrapText === 'left') {
            if (!anchorAlignmentHandled) {
              style += 'float: right;';
              floatRight = true;
            }
          } else if (['largest', 'bothSides'].includes(wrapAttrs.wrapText)) {
            // TODO: HTML/CSS doesn't support true both-sides wrapping
            // We use 'largest' as best approximation
            //
            // For 'largest', float to the side that would leave the most space for text
            if (!anchorAlignmentHandled) {
              const pageStyles = this.editor?.converter?.pageStyles;
              if (pageStyles?.pageSize && pageStyles?.pageMargins && size.width) {
                const pageWidth = inchesToPixels(pageStyles.pageSize.width);
                const leftMargin = inchesToPixels(pageStyles.pageMargins.left);
                const rightMargin = inchesToPixels(pageStyles.pageMargins.right);
                const contentWidth = pageWidth - leftMargin - rightMargin;
                const imageWidth = size.width + (wrapAttrs.distLeft || 0) + (wrapAttrs.distRight || 0);

                // marginOffset.horizontal is space on the left when wrapText === "largest"
                // We can therefore calculate the space on the right vs on the left:
                const leftSpace = horizontalOffsetBase;
                const rightSpace = contentWidth - leftSpace - imageWidth;

                if (rightSpace < 0) {
                  // There is not enough space, float the image to the left
                  style += 'float: left;';
                } else if (rightSpace > leftSpace) {
                  style += 'float: left;';
                } else {
                  style += 'float: right;';
                  floatRight = true;
                  baseHorizontal = rightSpace;
                }
              } else {
                // Fallback to left if page dimensions unavailable
                style += 'float: left;';
              }
            }
          }
          if (wrapAttrs.distTop) margin.top += wrapAttrs.distTop;
          if (wrapAttrs.distBottom) margin.bottom += wrapAttrs.distBottom;
          if (wrapAttrs.distLeft) margin.left += wrapAttrs.distLeft;
          if (wrapAttrs.distRight) margin.right += wrapAttrs.distRight;
          break;
        }

        case 'Through':
        case 'Tight':
          if (!anchorData) {
            style += 'clear: both;';
          }
          let anchorAlignmentHandled = false;
          if (anchorHorizontalAlignment === 'left') {
            style += 'float: left;';
            anchorAlignmentHandled = true;
          } else if (anchorHorizontalAlignment === 'right') {
            style += 'float: right;';
            floatRight = true;
            anchorAlignmentHandled = true;
          } else if (anchorHorizontalAlignment === 'center') {
            style += 'display: block;';
            centered = true;
            anchorAlignmentHandled = true;
          }
          if (!anchorAlignmentHandled) {
            const pageStyles = this.editor?.converter?.pageStyles;
            if (pageStyles?.pageSize && pageStyles?.pageMargins && size.width) {
              const pageWidth = inchesToPixels(pageStyles.pageSize.width);
              const leftMargin = inchesToPixels(pageStyles.pageMargins.left);
              const rightMargin = inchesToPixels(pageStyles.pageMargins.right);
              const contentWidth = pageWidth - leftMargin - rightMargin;
              const imageWidth = size.width + (wrapAttrs.distLeft || 0) + (wrapAttrs.distRight || 0);

              // marginOffset.horizontal is space on the left when wrapText === "largest"
              // We can therefore calculate the space on the right vs on the left:
              const leftSpace = horizontalOffsetBase;
              const rightSpace = contentWidth - leftSpace - imageWidth;
              if (rightSpace < 0) {
                // There is not enough space, float the image to the left
                style += 'float: left;';
              } else if (rightSpace > leftSpace) {
                style += 'float: left;';
              } else {
                style += 'float: right;';
                floatRight = true;
                baseHorizontal = rightSpace;
              }
            } else {
              // Fallback to left if page dimensions unavailable
              style += 'float: left;';
            }
          }
          // Use float and shape-outside if polygon is provided

          if (wrapAttrs.distTop) margin.top += wrapAttrs.distTop;
          if (wrapAttrs.distBottom) margin.bottom += wrapAttrs.distBottom;
          if (wrapAttrs.distLeft) margin.left += wrapAttrs.distLeft;
          if (wrapAttrs.distRight) margin.right += wrapAttrs.distRight;
          if (wrapAttrs.polygon) {
            // Convert polygon points to CSS polygon string
            // For left floating images - we add 15 to the horizontal offset to prevent overlap with text.
            // For right floating images - we pick the smallest x value of the polygon. Difference is due to
            // the polygons in HTML/CSS being defined in relation to the image's bounding box.
            let horizontalOffset = floatRight ? wrapAttrs.polygon[0][0] || 0 : horizontalOffsetBase + 15;

            let maxX = 0;
            let minX = 0;
            let minY = 0;
            let maxY = 0;
            wrapAttrs.polygon.forEach(([x, y]) => {
              if (floatRight && x < horizontalOffset) horizontalOffset = x;
              if (x > maxX) maxX = x;
              if (x < minX) minX = x;
              if (y > maxY) maxY = y;
              if (y < minY) minY = y;
            });
            const originalWidth = maxX - minX;
            const originalHeight = maxY - minY;
            const scaleWidth = Math.min(1, size.width / originalWidth);
            const scaleHeight = Math.min(1, size.height / originalHeight);
            // TODO: Calculating the scale factors based on the declared size of the image and the size of the
            // polygon will work if the polygon touch all the edges of the images (typical case). It will give
            // somewhat incorrect values not if the polygon does not touch the right and bottom edges of the image.
            // To solve this properly, we need to determine the actual image size based on the image file and
            // base the scale factors on that.
            const verticalOffset = Math.max(0, marginOffset.top);
            const points = wrapAttrs.polygon
              .map(([x, y]) => `${horizontalOffset + x * scaleWidth}px ${verticalOffset + y * scaleHeight}px`)
              .join(', ');
            style += `shape-outside: polygon(${points});`;
          }
          break;

        case 'TopAndBottom':
          style += 'display: block; clear: both;';
          if (wrapAttrs.distTop) margin.top += wrapAttrs.distTop;
          if (wrapAttrs.distBottom) margin.bottom += wrapAttrs.distBottom;
          centered = true;
          break;

        case 'Inline':
        default:
          // No extra styling needed
          break;
      }
    }

    // Calculate margin data based on anchor data, margin offsets and float direction
    const hasAnchorData = Boolean(anchorData);
    const hasMarginOffsets = marginOffset?.horizontal != null || marginOffset?.top != null;
    if (hasAnchorData || hasMarginOffsets) {
      const relativeFromPageV = anchorData?.vRelativeFrom === 'page';
      const maxMarginV = 500;
      const baseTop = Math.max(0, marginOffset?.top ?? 0);
      // TODO: Images that go into the margin have negative offsets - often by high values.
      // These values will not be shown correctly when rendered in browser. Adjusting to zero is smallest possible
      // adjustment that continues to give a result close to the original.

      let rotationHorizontal = 0;
      let rotationTop = 0;
      const { rotation } = transformData ?? {};
      const { height, width } = size ?? {};
      if (rotation && height && width) {
        const { horizontal, vertical } = getRotationMargins(width, height, rotation);
        rotationHorizontal = horizontal;
        rotationTop = vertical;
      }

      const horizontal = baseHorizontal + rotationHorizontal;
      const top = baseTop + rotationTop;

      if (horizontal) {
        if (floatRight) {
          margin.right += horizontal;
        } else {
          margin.left += horizontal;
        }
      }

      if (top) {
        if (relativeFromPageV && top >= maxMarginV) margin.top += maxMarginV;
        else margin.top += top;
      }
    }

    if (anchorData?.hRelativeFrom === 'margin') {
      const distLeft = wrapAttrs.distLeft || 0;
      const distRight = wrapAttrs.distRight || 0;
      if (anchorHorizontalAlignment === 'left') {
        margin.left = (margin.left || 0) - (size.width + distLeft);
      } else if (anchorHorizontalAlignment === 'right') {
        margin.right = (margin.right || 0) - (size.width + distRight);
      }
    }

    if (centered) {
      style += 'margin-left: auto; margin-right: auto;';
    } else {
      if (margin.left) style += `margin-left: ${margin.left}px;`;
      if (margin.right) style += `margin-right: ${margin.right}px;`;
    }
    if (margin.top) style += `margin-top: ${margin.top}px;`;
    if (margin.bottom) style += `margin-bottom: ${margin.bottom}px;`;

    // Merge wrap styling with existing htmlAttributes style
    const finalAttributes = { ...htmlAttributes };
    if (style) {
      const existingStyle = finalAttributes.style || '';
      finalAttributes.style = existingStyle + (existingStyle ? ' ' : '') + style;
    }

    return ['img', Attribute.mergeAttributes(this.options.htmlAttributes, finalAttributes)];
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

      /**
       * Set the wrapping mode and attributes for the selected image
       * @category Command
       * @param {Object} options - Wrapping options
       * @param {string} options.type - Wrap type: "None", "Square", "Through", "Tight", "TopAndBottom", "Inline"
       * @param {Object} [options.attrs] - Wrap attributes (only allowed attributes for the given type will be accepted)
       * @param {string} [options.attrs.wrapText] - Text wrapping mode for Square type: "bothSides", "largest", "left", "right"
       * @param {number} [options.attrs.distTop] - Top distance in pixels
       * @param {number} [options.attrs.distBottom] - Bottom distance in pixels
       * @param {number} [options.attrs.distLeft] - Left distance in pixels
       * @param {number} [options.attrs.distRight] - Right distance in pixels
       * @param {Array} [options.attrs.polygon] - Polygon points for Through/Tight types: [[x1,y1], [x2,y2], ...]
       * @param {boolean} [options.attrs.behindDoc] - Whether image should be behind document text (for wrapNone)
       * @example
       * // No wrapping, behind document
       * editor.commands.setWrapping({ type: 'None', attrs: {behindDoc: true} })
       *
       * // Square wrapping on both sides with distances
       * editor.commands.setWrapping({
       *   type: 'Square',
       *   attrs: {
       *     wrapText: 'bothSides',
       *     distTop: 10,
       *     distBottom: 10,
       *     distLeft: 10,
       *     distRight: 10
       *   }
       * })
       *
       * // Tight wrapping with polygon
       * editor.commands.setWrapping({
       *   type: 'Tight',
       *   attrs: {
       *     polygon: [[0, 0], [100, 0], [100, 100], [0, 100]]
       *   }
       * })
       *
       * // Top and bottom wrapping
       * editor.commands.setWrapping({
       *   type: 'TopAndBottom',
       *   attrs: {
       *     distTop: 15,
       *     distBottom: 15
       *   }
       * })
       */
      setWrapping:
        (options) =>
        ({ chain, state }) => {
          const { selection } = state;
          const { $from } = selection;
          const node = $from.nodeAfter;

          if (!node || node.type.name !== this.name) {
            return false;
          }

          const { type, attrs = {} } = options;

          // Filter attributes based on allowed ones for the wrap type
          const allowedAttrs = {};
          const allowedAttributes = {
            None: ['behindDoc'],
            Square: ['wrapText', 'distTop', 'distBottom', 'distLeft', 'distRight'],
            Through: ['distTop', 'distBottom', 'distLeft', 'distRight', 'polygon'],
            Tight: ['distTop', 'distBottom', 'distLeft', 'distRight', 'polygon'],
            TopAndBottom: ['distTop', 'distBottom'],
            Inline: [],
          };

          const allowedForType = allowedAttributes[type] || [];
          Object.keys(attrs).forEach((key) => {
            if (allowedForType.includes(key)) {
              allowedAttrs[key] = attrs[key];
            }
          });

          // Update the wrap object
          const updatedAttrs = {
            ...node.attrs,
            wrap: {
              type,
              attrs: allowedAttrs,
            },
            isAnchor: type !== 'Inline',
          };

          return chain().updateAttributes(this.name, updatedAttrs).run();
        },
    };
  },

  addPmPlugins() {
    return [ImageRegistrationPlugin({ editor: this.editor }), ImagePositionPlugin({ editor: this.editor })];
  },
});
