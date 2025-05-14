import { Node, Attribute } from '@core/index.js';

export const fieldAnnotationName = 'fieldAnnotation';
export const annotationClass = 'field-annotation';
export const annotationContentClass = 'field-annotation-content';

export const FillableField = Node.create({
  name: "fillableField",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  addAttributes() {
    return {

      displayLabel: {
        default: 'Text field',
        parseDOM: (elem) => elem.getAttribute('data-display-label'),
        renderDOM: (attrs) => {
          if (!attrs.displayLabel) return {};
          return {
            'data-display-label': attrs.displayLabel,
          };
        },
      },
      fieldId: {
        default: null,
        parseDOM: (elem) => elem.getAttribute('data-field-id'),
        renderDOM: (attrs) => {
          if (!attrs.fieldId) return {};
          return {
            'data-field-id': attrs.fieldId,
          };
        },
      },

    };
  },

  addOptions() {
    return {
      htmlAttributes: {
        class: annotationClass,
      },
      annotationClass,
      annotationContentClass,
    };
  },
  parseDOM() {
    return [
      {
        tag: `span.${this.options.annotationClass}`,
        priority: 60,
      },
    ];
  },
  renderDOM({ node, htmlAttributes }) {
    let { displayLabel } = node.attrs;
    return  [
        'span',
        Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes),
        displayLabel
    ];
  },
});
