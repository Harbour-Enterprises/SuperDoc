import { Node, Attribute } from '@core/index';
import { StructuredContentBlockView } from './StructuredContentBlockView';

export const structuredContentClass = 'sd-structured-content-block';
export const structuredContentInnerClass = 'sd-structured-content-block__content';

export const StructuredContentBlock = Node.create({
  name: 'structuredContentBlock',

  group: 'block structuredContent',

  content: 'block*',

  isolating: true,

  atom: false, // false - has editable content.

  draggable: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: structuredContentClass,
        'aria-label': 'Structured content block node',
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-id'),
        renderDOM: (attrs) => {
          if (!attrs.id) return {};
          return { 'data-id': attrs.id };
        },
      },

      sdtPr: {
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'div[data-structured-content-block]' }];
  },

  renderDOM({ htmlAttributes }) {
    return [
      'div',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        'data-structured-content-block': '',
      }),
      0,
    ];
  },

  addNodeView() {
    return (props) => {
      return new StructuredContentBlockView({ ...props });
    };
  },
});
