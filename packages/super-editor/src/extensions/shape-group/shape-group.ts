import { Node, Attribute } from '@core/index.js';
import { ShapeGroupView } from './ShapeGroupView.js';
import type { ShapeGroupViewProps } from './ShapeGroupView.js';
import type { AttributeValue, AttributeSpec } from '@core/Attribute.js';
import type { ParseRule } from 'prosemirror-model';

type ShapeGroupSize = { width?: number | null; height?: number | null } | null;
type ShapeGroupPadding = {
  top?: number | null;
  right?: number | null;
  bottom?: number | null;
  left?: number | null;
} | null;
type ShapeGroupMarginOffset = { horizontal?: number | null; top?: number | null } | null;

type ShapeGroupAttributes = {
  groupTransform?: Record<string, unknown>;
  shapes?: unknown[];
  size?: ShapeGroupSize;
  padding?: ShapeGroupPadding;
  marginOffset?: ShapeGroupMarginOffset;
  drawingContent?: unknown;
  wrap?: { type?: string };
  anchorData?: unknown;
  originalAttributes?: unknown;
};

type ShapeGroupOptions = {
  htmlAttributes: Record<string, AttributeValue>;
};

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

  addAttributes(): Record<string, Partial<AttributeSpec>> {
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
        default: null as ShapeGroupSize,
        renderDOM: (attrs: ShapeGroupAttributes): Record<string, AttributeValue> => {
          if (!attrs.size) return {};
          const sizeData: Record<string, AttributeValue> = {};
          if (attrs.size.width != null) sizeData['data-width'] = attrs.size.width;
          if (attrs.size.height != null) sizeData['data-height'] = attrs.size.height;
          return sizeData;
        },
      },

      padding: {
        default: null as ShapeGroupPadding,
        renderDOM: (attrs: ShapeGroupAttributes): Record<string, AttributeValue> => {
          if (!attrs.padding) return {};
          const paddingData: Record<string, AttributeValue> = {};
          if (attrs.padding.top != null) paddingData['data-padding-top'] = attrs.padding.top;
          if (attrs.padding.right != null) paddingData['data-padding-right'] = attrs.padding.right;
          if (attrs.padding.bottom != null) paddingData['data-padding-bottom'] = attrs.padding.bottom;
          if (attrs.padding.left != null) paddingData['data-padding-left'] = attrs.padding.left;
          return paddingData;
        },
      },

      marginOffset: {
        default: null as ShapeGroupMarginOffset,
        renderDOM: (attrs: ShapeGroupAttributes): Record<string, AttributeValue> => {
          if (!attrs.marginOffset) return {};
          const offsetData: Record<string, AttributeValue> = {};
          if (attrs.marginOffset.horizontal != null) offsetData['data-offset-x'] = attrs.marginOffset.horizontal;
          if (attrs.marginOffset.top != null) offsetData['data-offset-y'] = attrs.marginOffset.top;
          return offsetData;
        },
      },

      drawingContent: {
        rendered: false,
      },

      wrap: {
        default: { type: 'Inline' },
        rendered: false,
      },

      anchorData: {
        default: null,
        rendered: false,
      },

      originalAttributes: {
        rendered: false,
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, AttributeValue> }) {
    return ['div', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, { 'data-shape-group': '' })];
  },

  addNodeView() {
    return (props: ShapeGroupViewProps) => {
      return new ShapeGroupView({ ...props });
    };
  },
});
