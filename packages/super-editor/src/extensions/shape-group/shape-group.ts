import { Node, Attribute } from '@core/index.js';
import { ShapeGroupView, type ShapeGroupViewProps } from './ShapeGroupView.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { DOMOutputSpec } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';

interface ShapeGroupOptions extends Record<string, unknown> {
  htmlAttributes: Record<string, AttributeValue>;
}

type SizeAttr = { width?: number | null; height?: number | null };
type PaddingAttr = { top?: number | null; right?: number | null; bottom?: number | null; left?: number | null };
type MarginOffsetAttr = { horizontal?: number | null; top?: number | null };

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
        renderDOM: (attrs: { size?: SizeAttr | null }): Record<string, AttributeValue> => {
          if (!attrs.size || typeof attrs.size !== 'object') return {};
          const sizeData: Record<string, AttributeValue> = {};
          const size = attrs.size as SizeAttr;
          if (size.width) sizeData['data-width'] = size.width;
          if (size.height) sizeData['data-height'] = size.height;
          return sizeData;
        },
      },

      padding: {
        default: null,
        renderDOM: (attrs: { padding?: PaddingAttr | null }): Record<string, AttributeValue> => {
          if (!attrs.padding || typeof attrs.padding !== 'object') return {};
          const paddingData: Record<string, AttributeValue> = {};
          const padding = attrs.padding as PaddingAttr;
          if (padding.top != null) paddingData['data-padding-top'] = padding.top;
          if (padding.right != null) paddingData['data-padding-right'] = padding.right;
          if (padding.bottom != null) paddingData['data-padding-bottom'] = padding.bottom;
          if (padding.left != null) paddingData['data-padding-left'] = padding.left;
          return paddingData;
        },
      },

      marginOffset: {
        default: null,
        renderDOM: (attrs: { marginOffset?: MarginOffsetAttr | null }): Record<string, AttributeValue> => {
          if (!attrs.marginOffset || typeof attrs.marginOffset !== 'object') return {};
          const offsetData: Record<string, AttributeValue> = {};
          const marginOffset = attrs.marginOffset as MarginOffsetAttr;
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

  renderDOM(this: Node<ShapeGroupOptions>, ...args: unknown[]): DOMOutputSpec {
    const [{ htmlAttributes } = { htmlAttributes: {} as Record<string, AttributeValue> }] = args as [
      { htmlAttributes?: Record<string, AttributeValue> }?,
    ];
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes as Record<string, AttributeValue>, htmlAttributes || {}, {
        'data-shape-group': '',
      }),
    ];
  },

  addNodeView() {
    return (props: ShapeGroupViewProps): NodeView | null => {
      return new ShapeGroupView({ ...props });
    };
  },
});
