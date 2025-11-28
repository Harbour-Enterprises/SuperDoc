import { Attribute, type AttributeValue, Node } from '@core/index.js';
import { ImageRegistrationPlugin } from './imageHelpers/imageRegistrationPlugin.js';
import { ImagePositionPlugin } from './imageHelpers/imagePositionPlugin.js';
import { getNormalizedImageAttrs } from './imageHelpers/legacyAttributes.js';
import { getRotationMargins } from './imageHelpers/rotation.js';
import { inchesToPixels } from '@converter/helpers.js';
import type { DOMOutputSpec, Node as PmNode } from 'prosemirror-model';

/**
 * Configuration options for Image
 * @category Options
 */
export interface ImageOptions extends Record<string, unknown> {
  /** Allow base64 encoded images */
  allowBase64: boolean;
  /** Default HTML attributes for image elements */
  htmlAttributes: Record<string, string>;
}

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

interface ImageInsertOptions {
  src: string;
  alt?: string;
  title?: string;
  size?: {
    width?: number;
    height?: number;
  };
}

interface SetWrappingOptions {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ImageStorage extends Record<string, unknown> {
  media: Record<string, string>;
}

type ImageMargin = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type ImageWrapAttrs = {
  wrapText?: 'bothSides' | 'largest' | 'left' | 'right';
  distTop?: number;
  distBottom?: number;
  distLeft?: number;
  distRight?: number;
  polygon?: Array<[number, number]>;
  behindDoc?: boolean;
};

type ImageAttrs = {
  wrap?: { type?: string; attrs?: ImageWrapAttrs };
  marginOffset?: { horizontal?: number; top?: number };
  anchorData?: { hRelativeFrom?: string; vRelativeFrom?: string; alignH?: string };
  padding?: { left?: number; right?: number; top?: number; bottom?: number };
  transformData?: { rotation?: number; verticalFlip?: boolean; horizontalFlip?: boolean };
  size?: { width?: number; height?: number };
  extension?: string;
};

/**
 * @module Image
 * @sidebarTitle Image
 * @snippetPath /snippets/extensions/image.mdx
 */
export const Image = Node.create<ImageOptions, ImageStorage>({
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

  addStorage(): ImageStorage {
    return {
      media: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        renderDOM: ({ src }: { src?: unknown }) => {
          const srcKey = Array.isArray(src) || typeof src === 'object' ? String(src) : src;
          return {
            src: (typeof srcKey === 'string' ? this.storage.media[srcKey] : null) ?? src,
          } as Record<string, AttributeValue>;
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
        renderDOM: ({ transformData }: { transformData?: ImageAttrs['transformData'] }) => {
          let style = '';
          if (transformData && typeof transformData === 'object' && !Array.isArray(transformData)) {
            const rotation = 'rotation' in transformData ? transformData.rotation : undefined;
            const verticalFlip = 'verticalFlip' in transformData ? transformData.verticalFlip : undefined;
            const horizontalFlip = 'horizontalFlip' in transformData ? transformData.horizontalFlip : undefined;

            if (rotation && typeof rotation === 'number') {
              style += `rotate(${Math.round(rotation)}deg) `;
            }
            if (verticalFlip) {
              style += 'scaleY(-1) ';
            }
            if (horizontalFlip) {
              style += 'scaleX(-1) ';
            }
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

      shouldStretch: {
        default: false,
        rendered: false,
      },

      size: {
        default: {},
        renderDOM: ({
          size,
          extension,
          shouldStretch,
        }: {
          size?: ImageAttrs['size'];
          extension?: string;
          shouldStretch?: boolean;
        }) => {
          let style = '';
          if (size && typeof size === 'object' && !Array.isArray(size)) {
            const width = 'width' in size ? size.width : undefined;
            const height = 'height' in size ? size.height : undefined;
            if (width && typeof width === 'number') style += `width: ${width}px;`;
            if (
              height &&
              typeof height === 'number' &&
              typeof extension === 'string' &&
              ['emf', 'wmf'].includes(extension)
            )
              style += `height: ${height}px; border: 1px solid black; position: absolute;`;
            else if (height && typeof height === 'number' && shouldStretch) {
              style += `height: ${height}px; object-fit: fill;`;
            } else if (height) style += 'height: auto;';
          }
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
        renderDOM: ({ style }: { style?: string | null }) => {
          if (!style) return {};
          return { style };
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex attribute structure for ProseMirror
    } as any;
  },

  parseDOM() {
    return [
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderDOM({ node, htmlAttributes }: { node: PmNode; htmlAttributes: Record<string, unknown> }): DOMOutputSpec {
    // multiple attributes influence the margin sizes, so we handle them here together rather than separately.
    // Also, the editor context is needed for wrap styling in some cases.

    const normalizedAttrs = getNormalizedImageAttrs(node.attrs as ImageAttrs) as ImageAttrs;
    const { wrap, marginOffset } = normalizedAttrs;
    const {
      anchorData,
      padding,
      transformData = {},
      size: rawSize = { width: 0, height: 0 },
    } = node.attrs as ImageAttrs;
    const size = rawSize ?? { width: 0, height: 0 };

    const margin: ImageMargin = {
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
    const { height = 0, width = 0 } = size ?? {};
    if (rotation && height && width) {
      const { horizontal, vertical } = getRotationMargins(width, height, rotation);
      margin.left += horizontal;
      margin.right += horizontal;
      margin.top += vertical;
      margin.bottom += vertical;
    }

    // Handle wrap styling (needs editor context)
    if (wrap && wrap.type) {
      const { type, attrs = {} as ImageWrapAttrs } = wrap;

      switch (type) {
        case 'None':
          style += 'position: absolute;';
          // Use relativeHeight from OOXML for proper z-ordering of overlapping elements
          const relativeHeight = node.attrs.originalAttributes?.relativeHeight;
          if (relativeHeight != null) {
            // Scale down the relativeHeight value to a reasonable CSS z-index range
            // OOXML uses large numbers (e.g., 251659318), we normalize to a smaller range
            const zIndex = Math.floor(relativeHeight / 1000000);
            style += `z-index: ${zIndex};`;
          } else if (attrs.behindDoc) {
            style += 'z-index: -1;';
          } else {
            style += 'z-index: 1;';
          }
          break;

        case 'Square':
          // TODO: HTML/CSS currently does not support floating an item to the top of the paragraph. So if
          // the image is further down in the paragraph, it will be positioned further down on the page.
          style += 'shape-outside: border-box; clear: both;';
          // Default to float left, allow wrapText to override
          if (attrs.wrapText === 'right') {
            style += 'float: left;';
          } else if (attrs.wrapText === 'left') {
            style += 'float: right;';
            floatRight = true;
          } else if (attrs.wrapText && ['largest', 'bothSides'].includes(attrs.wrapText)) {
            // TODO: HTML/CSS doesn't support true both-sides wrapping
            // We use 'largest' as best approximation
            //
            // For 'largest', float to the side that would leave the most space for text
            const editorInstance = this.editor;
            if (editorInstance) {
              const pageStylesData = getDataFromPageStyles({
                editor: editorInstance,
                marginOffset,
                size,
                attrs,
              });

              style += pageStylesData.style;
              floatRight = pageStylesData.floatRight;
              baseHorizontal = pageStylesData.baseHorizontal;
            }
          }
          if (attrs.distTop) margin.top += attrs.distTop;
          if (attrs.distBottom) margin.bottom += attrs.distBottom;
          if (attrs.distLeft) margin.left += attrs.distLeft;
          if (attrs.distRight) margin.right += attrs.distRight;
          break;

        case 'Through':
        case 'Tight': {
          style += 'clear: both;';

          if (this.editor) {
            const pageStylesData = getDataFromPageStyles({
              editor: this.editor,
              marginOffset,
              size,
              attrs,
            });

            style += pageStylesData.style;
            floatRight = pageStylesData.floatRight;
            baseHorizontal = pageStylesData.baseHorizontal;
          }

          // Use float and shape-outside if polygon is provided

          if (attrs.distTop) margin.top += attrs.distTop;
          if (attrs.distBottom) margin.bottom += attrs.distBottom;
          if (attrs.distLeft) margin.left += attrs.distLeft;
          if (attrs.distRight) margin.right += attrs.distRight;
          if (attrs.polygon && Array.isArray(attrs.polygon)) {
            // Convert polygon points to CSS polygon string
            // For left floating images - we add 15 to the horizontal offset to prevent overlap with text.
            // For right floating images - we pick the smallest x value of the polygon. Difference is due to
            // the polygons in HTML/CSS being defined in relation to the image's bounding box.
            let horizontalOffset = floatRight ? attrs.polygon[0][0] || 0 : (marginOffset?.horizontal || 0) + 15;

            let maxX = 0;
            let minX = 0;
            let minY = 0;
            let maxY = 0;
            attrs.polygon.forEach(([x, y]) => {
              if (floatRight && x < horizontalOffset) horizontalOffset = x;
              if (x > maxX) maxX = x;
              if (x < minX) minX = x;
              if (y > maxY) maxY = y;
              if (y < minY) minY = y;
            });
            const originalWidth = maxX - minX;
            const originalHeight = maxY - minY;
            const sizeWidth = size?.width ?? 0;
            const sizeHeight = size?.height ?? 0;
            const scaleWidth = originalWidth ? Math.min(1, sizeWidth / originalWidth) : 0;
            const scaleHeight = originalHeight ? Math.min(1, sizeHeight / originalHeight) : 0;
            // TODO: Calculating the scale factors based on the declared size of the image and the size of the
            // polygon will work if the polygon touch all the edges of the images (typical case). It will give
            // somewhat incorrect values not if the polygon does not touch the right and bottom edges of the image.
            // To solve this properly, we need to determine the actual image size based on the image file and
            // base the scale factors on that.
            const verticalOffset = Math.max(0, marginOffset?.top || 0);
            const points = attrs.polygon
              .map(([x, y]) => `${horizontalOffset + x * scaleWidth}px ${verticalOffset + y * scaleHeight}px`)
              .join(', ');
            style += `shape-outside: polygon(${points});`;
          }
          break;
        }
        case 'TopAndBottom':
          style += 'display: block; clear: both;';
          if (!anchorData) {
            centered = true;
          }

          if (attrs.distTop) margin.top += attrs.distTop;
          if (attrs.distBottom) margin.bottom += attrs.distBottom;
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

    if (hasAnchorData) {
      switch (anchorData?.hRelativeFrom) {
        case 'page':
          const pageStyles =
            this.editor?.converter?.pageStyles || this.editor?.options.parentEditor?.converter?.pageStyles;
          margin.left -= inchesToPixels(pageStyles?.pageMargins?.left) || 0;
          break;
        case 'margin':
          if (anchorData?.alignH === 'center') {
            style += 'position: absolute; left: 50%; transform: translateX(-50%);';
          }
          if (anchorData?.alignH === 'left' || anchorData?.alignH === 'right') {
            style += `position: absolute; ${anchorData.alignH}: 0;`;
          }
          break;
        case 'column':
          if (anchorData?.alignH === 'center') {
            centered = true;
          } else if (anchorData?.alignH === 'right') {
            floatRight = true;
            if (!style.includes('float: right;')) {
              style += 'float: right;';
            }
          } else if (anchorData?.alignH === 'left') {
            if (!style.includes('float: left;')) {
              style += 'float: left;';
            }
          } else if (!anchorData.alignH && marginOffset?.horizontal != null) {
            // When positioned relative to column with a posOffset (not alignment),
            // and the element is absolutely positioned (e.g., wrap type 'None'),
            // we need to use 'left' positioning to allow negative offsets
            // This handles cases like full-width images that extend into margins
            const isAbsolutelyPositioned = style.includes('position: absolute;');
            if (isAbsolutelyPositioned) {
              // Don't apply horizontal offset via margins - will use 'left' instead
              // Set a flag to apply the offset directly as 'left' property
              style += `left: ${baseHorizontal}px;`;
              // Override max-width: 100% to allow image to extend beyond container into margins
              style += 'max-width: none;';
              baseHorizontal = 0; // Reset to prevent double-application
            }
          }
          break;
        default:
          break;
      }
    }

    if (hasAnchorData || hasMarginOffsets) {
      const relativeFromPageV = anchorData?.vRelativeFrom === 'page';
      const relativeFromMarginV = anchorData?.vRelativeFrom === 'margin';
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

      // Don't apply vertical offset as margin-top for images positioned relative to margin
      // as this causes double-counting of the offset
      if (top && !relativeFromMarginV) {
        if (relativeFromPageV && top >= maxMarginV) margin.top += maxMarginV;
        else margin.top += top;
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
    const finalAttributes: Record<string, unknown> = { ...htmlAttributes };
    if (style) {
      const existingStyle = typeof finalAttributes.style === 'string' ? finalAttributes.style : '';
      finalAttributes.style = existingStyle + (existingStyle ? ' ' : '') + style;
    }

    return [
      'img',
      Attribute.mergeAttributes(this.options.htmlAttributes, finalAttributes as Record<string, AttributeValue>),
    ];
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
        (options: ImageInsertOptions) =>
        ({ commands }: { commands: { insertContent: (content: unknown) => boolean } }): boolean => {
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
        (options: SetWrappingOptions) =>
        ({
          chain,
          state,
        }: {
          chain: () => { updateAttributes: (...args: unknown[]) => { run: () => boolean } };
          state: { selection: { $from: { nodeAfter: PmNode | null } } };
        }): boolean => {
          const { selection } = state;
          const { $from } = selection;
          const node = $from.nodeAfter;

          if (!node || node.type.name !== this.name) {
            return false;
          }

          const { type, attrs = {} } = options;

          // Filter attributes based on allowed ones for the wrap type
          const allowedAttrs: Record<string, unknown> = {};
          const allowedAttributes: Record<string, string[]> = {
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
    } as Record<string, (...args: unknown[]) => unknown>;
  },

  addPmPlugins() {
    if (!this.editor) return [];
    return [ImageRegistrationPlugin({ editor: this.editor }), ImagePositionPlugin({ editor: this.editor })];
  },
});

const getDataFromPageStyles = ({
  editor,
  marginOffset,
  size,
  attrs,
}: {
  editor: import('@core/Editor.js').Editor;
  marginOffset: { horizontal?: number; top?: number } | undefined;
  size: { width?: number; height?: number };
  attrs: ImageWrapAttrs;
}): { style: string; floatRight: boolean; baseHorizontal: number } => {
  let style = '';
  let floatRight = false;
  let baseHorizontal = marginOffset?.horizontal || 0;
  const pageStyles = editor?.converter?.pageStyles || editor?.options.parentEditor?.converter?.pageStyles;

  if (pageStyles?.pageSize && pageStyles?.pageMargins && size.width) {
    const pageWidth = inchesToPixels(pageStyles.pageSize.width);
    const leftMargin = inchesToPixels(pageStyles.pageMargins.left);
    const rightMargin = inchesToPixels(pageStyles.pageMargins.right);
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const imageWidth = size.width + (attrs.distLeft || 0) + (attrs.distRight || 0);

    // marginOffset.horizontal is space on the left when wrapText === "largest"
    // We can therefore calculate the space on the right vs on the left:
    const leftSpace = marginOffset?.horizontal ?? 0;
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

  return {
    style,
    floatRight,
    baseHorizontal,
  };
};
