import { Node, Attribute } from '@core/index.js';
import { ImagePlaceholderPlugin } from './imageHelpers/imagePlaceholderPlugin.js';

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
        default: null,
      },

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

      size: {
        default: {},
        renderDOM: ({ size }) => {
          let style = '';
          let { width, height } = size ?? {};
          if (width) style += `width: ${width}px;`;
          if (height) style += `height: auto;`;
          return { style };
        },
      },

      marginOffset: {
        default: {},
        renderDOM: ({ marginOffset }) => {
          let { left = 0, top = 0 } = marginOffset ?? {};
          let style = '';
          if (left) style += `margin-left: ${left}px;`;
          if (top) style += `margin-top: ${top}px;`;
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
    return [ImagePlaceholderPlugin()];
  },
});
