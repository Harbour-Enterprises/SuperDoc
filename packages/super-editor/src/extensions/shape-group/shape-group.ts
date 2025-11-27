import { Node, Attribute } from '@core/index.js';
import { ShapeGroupView } from './ShapeGroupView.js';

interface ShapeGroupOptions extends Record<string, unknown> {
  htmlAttributes: Record<string, unknown>;
}

export const ShapeGroup = Node.create<ShapeGroupOptions>({
  name: 'shapeGroup',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        contenteditable: false,
      },
    };
  },

  addAttributes() {
    return {
      groupTransform: {
        default: {},
        renderDOM: () => ({}),
      },

      shapes: {
        default: [],
        renderDOM: () => ({}),
      },

      size: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.size || typeof attrs.size !== 'object') return {};
          const sizeData: Record<string, unknown> = {};
          const size = attrs.size as { width?: number; height?: number };
          if (size.width) sizeData['data-width'] = size.width;
          if (size.height) sizeData['data-height'] = size.height;
          return sizeData;
        },
      },

      padding: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.padding || typeof attrs.padding !== 'object') return {};
          const paddingData: Record<string, unknown> = {};
          const padding = attrs.padding as { top?: number; right?: number; bottom?: number; left?: number };
          if (padding.top != null) paddingData['data-padding-top'] = padding.top;
          if (padding.right != null) paddingData['data-padding-right'] = padding.right;
          if (padding.bottom != null) paddingData['data-padding-bottom'] = padding.bottom;
          if (padding.left != null) paddingData['data-padding-left'] = padding.left;
          return paddingData;
        },
      },

      marginOffset: {
        default: null,
        renderDOM: (attrs) => {
          if (!attrs.marginOffset || typeof attrs.marginOffset !== 'object') return {};
          const offsetData: Record<string, unknown> = {};
          const marginOffset = attrs.marginOffset as { horizontal?: number; top?: number };
          if (marginOffset.horizontal != null) offsetData['data-offset-x'] = marginOffset.horizontal;
          if (marginOffset.top != null) offsetData['data-offset-y'] = marginOffset.top;
          return offsetData;
        },
      },

      drawingContent: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [];
  },

  renderDOM({ htmlAttributes }) {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, { 'data-shape-group': '' })];
  },

  addNodeView() {
    return (props) => {
      return new ShapeGroupView({ ...props });
    };
  },
});
