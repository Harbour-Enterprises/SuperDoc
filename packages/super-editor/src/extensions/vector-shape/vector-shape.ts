import { Node, Attribute } from '@core/index.js';
import { VectorShapeView, type VectorShapeViewProps } from './VectorShapeView.js';
import type { AttributeValue } from '@core/Attribute.js';
import type { DOMOutputSpec } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';

interface VectorShapeOptions extends Record<string, unknown> {
  htmlAttributes: Record<string, AttributeValue>;
}

export const VectorShape = Node.create<VectorShapeOptions>({
  name: 'vectorShape',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      kind: {
        default: 'rect',
        renderDOM: (attrs) => {
          if (!attrs.kind) return {};
          return { 'data-kind': attrs.kind };
        },
      },

      width: {
        default: 100,
        renderDOM: (attrs) => {
          if (attrs.width == null) return {};
          return { 'data-width': attrs.width };
        },
      },

      height: {
        default: 100,
        renderDOM: (attrs) => {
          if (attrs.height == null) return {};
          return { 'data-height': attrs.height };
        },
      },

      fillColor: {
        default: '#5b9bd5',
        renderDOM: (attrs) => {
          if (!attrs.fillColor) return {};
          return { 'data-fill-color': attrs.fillColor };
        },
      },

      strokeColor: {
        default: '#000000',
        renderDOM: (attrs) => {
          if (!attrs.strokeColor) return {};
          return { 'data-stroke-color': attrs.strokeColor };
        },
      },

      strokeWidth: {
        default: 1,
        renderDOM: (attrs) => {
          if (attrs.strokeWidth == null) return {};
          return { 'data-stroke-width': attrs.strokeWidth };
        },
      },

      rotation: {
        default: 0,
        renderDOM: (attrs) => {
          if (attrs.rotation == null) return {};
          return { 'data-rotation': attrs.rotation };
        },
      },

      flipH: {
        default: false,
        renderDOM: (attrs) => {
          if (!attrs.flipH) return {};
          return { 'data-flip-h': attrs.flipH };
        },
      },

      flipV: {
        default: false,
        renderDOM: (attrs) => {
          if (!attrs.flipV) return {};
          return { 'data-flip-v': attrs.flipV };
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

  renderDOM(this: Node<VectorShapeOptions>, ...args: unknown[]): DOMOutputSpec {
    const [{ htmlAttributes } = { htmlAttributes: {} as Record<string, AttributeValue> }] = args as [
      { htmlAttributes?: Record<string, AttributeValue> }?,
    ];
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes as Record<string, AttributeValue>, htmlAttributes || {}, {
        'data-vector-shape': '',
      }),
    ];
  },

  addNodeView() {
    return (props: VectorShapeViewProps): NodeView | null => {
      return new VectorShapeView({ ...props });
    };
  },
});
