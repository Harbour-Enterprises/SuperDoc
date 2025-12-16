import { Node, Attribute } from '@core/index';
import { StructuredContentInlineView } from './StructuredContentInlineView';
import type { AttributeValue } from '@core/Attribute.js';
import type { DOMOutputSpec, ParseRule } from 'prosemirror-model';
import type { StructuredContentViewProps } from './StructuredContentViewBase';

export const structuredContentClass = 'sd-structured-content';
export const structuredContentInnerClass = 'sd-structured-content__content';

/**
 * Configuration options for StructuredContent
 * @typedef {Object} StructuredContentOptions
 * @category Options
 * @property {string} [structuredContentClass='sd-structured-content-tag'] - CSS class for the inline element
 * @property {Object} [htmlAttributes] - HTML attributes for structured content elements
 */

/**
 * Attributes for structured content nodes
 * @typedef {Object} StructuredContentAttributes
 * @category Attributes
 * @property {string} [id] Unique identifier for the structured content field
 * @property {string} [tag] Content control tag (e.g., 'inline_text_sdt')
 * @property {string} [alias] Display name for the field (falls back to 'Structured content' when omitted)
 * @property {Object} [sdtPr] @internal Internal structured document tag properties
 * @example
 * // Get attributes from a structured content field
 * const attrs = editor.getAttributes('structuredContent')
 * console.log(attrs.id, attrs.alias)
 */

/**
 * @module StructuredContent
 * @sidebarTitle Structured Content
 * @snippetPath /snippets/extensions/structured-content.mdx
 */
export const StructuredContent = Node.create<{
  htmlAttributes: Record<string, AttributeValue>;
}>({
  name: 'structuredContent',

  group: 'inline structuredContent',

  inline: true,

  content: 'inline*',

  isolating: true,

  atom: false, // false - has editable content.

  draggable: true,

  addOptions() {
    return {
      htmlAttributes: {
        class: structuredContentClass,
        'aria-label': 'Structured content node',
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseDOM: (elem: Element) => elem.getAttribute('data-id'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.id) return {};
          return { 'data-id': attrs.id };
        },
      },

      tag: {
        default: null,
        parseDOM: (elem: Element) => elem.getAttribute('data-tag'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.tag) return {};
          return { 'data-tag': attrs.tag };
        },
      },

      alias: {
        default: null,
        parseDOM: (elem: Element) => elem.getAttribute('data-alias'),
        renderDOM: (attrs: Record<string, AttributeValue>) => {
          if (!attrs.alias) return {};
          return { 'data-alias': attrs.alias };
        },
      },

      sdtPr: {
        rendered: false,
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [{ tag: 'span[data-structured-content]' }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, AttributeValue> }): DOMOutputSpec {
    return [
      'span',
      Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes, {
        'data-structured-content': '',
      }),
      0,
    ];
  },

  addNodeView() {
    return (props: StructuredContentViewProps) => {
      return new StructuredContentInlineView({ ...props });
    };
  },
});
