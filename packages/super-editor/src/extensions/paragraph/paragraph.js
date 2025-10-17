import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { OxmlNode, Attribute } from '@core/index.js';
import { getSpacingStyleString, getMarksStyle } from '@extensions/linked-styles/index.js';
import { getDefaultSpacing } from './helpers/getDefaultSpacing.js';
import { pixelsToTwips, linesToTwips, twipsToPixels, eigthPointsToPixels } from '@converter/helpers.js';

/**
 * Configuration options for Paragraph
 * @typedef {Object} ParagraphOptions
 * @category Options
 * @property {number[]} [headingLevels=[1,2,3,4,5,6]] - Supported heading levels
 * @property {Object} [htmlAttributes={}] - HTML attributes for paragraph elements
 */

/**
 * Attributes for paragraph nodes
 * @typedef {Object} ParagraphAttributes
 * @category Attributes
 * @property {Object} [spacing] - Paragraph spacing configuration
 * @property {Object} [extraAttrs={}] - Additional HTML attributes
 * @property {Array} [marksAttrs] - Text formatting marks
 * @property {Object} [indent] - Indentation settings
 * @property {Object} [borders] - Paragraph borders
 * @property {string} [class] - CSS class name
 * @property {string} [styleId] - Linked style identifier
 * @property {Object} [justify] - Text justification
 * @property {Array} [tabStops] - Tab stop positions
 * @property {string} [sdBlockId] @internal - Internal block tracking ID
 * @property {string} [paraId] @internal - Paragraph identifier
 * @property {string} [textId] @internal - Text identifier
 * @property {string} [rsidR] @internal - Revision save ID
 * @property {string} [rsidRDefault] @internal - Default revision save ID
 * @property {string} [rsidP] @internal - Paragraph revision save ID
 * @property {string} [rsidRPr] @internal - Run properties revision save ID
 * @property {string} [rsidDel] @internal - Deletion revision save ID
 * @property {Object} [attributes] @internal - Internal attributes storage
 * @property {string} [filename] @internal - Associated filename
 * @property {boolean} [keepLines] @internal - Keep lines together
 * @property {boolean} [keepNext] @internal - Keep with next paragraph
 * @property {Object} [paragraphProperties] @internal - Internal paragraph properties
 * @property {Object} [dropcap] @internal - Drop cap configuration
 * @property {string} [pageBreakSource] @internal - Page break source
 */

/**
 * @module Paragraph
 * @sidebarTitle Paragraph
 * @snippetPath /snippets/extensions/paragraph.mdx
 */
export const Paragraph = OxmlNode.create({
  name: 'paragraph',

  oXmlName: 'w:p',

  priority: 1000,

  group: 'block',

  content: 'inline*',

  inline: false,

  addOptions() {
    return {
      headingLevels: [1, 2, 3, 4, 5, 6],
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      paraId: { rendered: false },
      textId: { rendered: false },
      rsidR: { rendered: false },
      rsidRDefault: { rendered: false },
      rsidP: { rendered: false },
      rsidRPr: { rendered: false },
      rsidDel: { rendered: false },

      spacing: {
        default: getDefaultSpacing(),
        parseDOM: (element) => {
          // Check if this element is within imported content, if so we can assign some different
          // default spacing which is needed to make the docx look correct
          if (element && element.closest('[data-superdoc-import]')) {
            return {
              after: pixelsToTwips(11),
              before: 0,
              line: linesToTwips(1.15),
              lineRule: 'auto',
            };
          }
          return undefined;
        },
        renderDOM: (attrs) => {
          const { spacing, marksAttrs } = attrs;
          if (!spacing) return {};
          const spacingCopy = { ...spacing };
          if (attrs.lineHeight) delete spacingCopy.line; // we'll get line-height from lineHeight
          const style = getSpacingStyleString(spacingCopy, marksAttrs ?? []);
          if (style) return { style };
          return {};
        },
      },

      extraAttrs: {
        default: {},
        parseDOM: (element) => {
          const extra = {};
          Array.from(element.attributes).forEach((attr) => {
            extra[attr.name] = attr.value;
          });
          return extra;
        },
        renderDOM: (attributes) => {
          return attributes.extraAttrs || {};
        },
      },
      marksAttrs: {
        renderDOM: (attrs) => {
          const { marksAttrs } = attrs;
          if (!marksAttrs?.length) return {};

          const style = getMarksStyle(marksAttrs);
          if (style) return { style };
          return {};
        },
      },
      indent: {
        default: null,
        renderDOM: ({ indent }) => {
          if (!indent) return {};
          const { left, right, firstLine, hanging } = indent;
          if (indent && Object.values(indent).every((v) => v === 0)) {
            return {};
          }

          let style = '';
          if (left) style += `margin-left: ${twipsToPixels(left)}px;`;
          if (right) style += `margin-right: ${twipsToPixels(right)}px;`;
          if (firstLine && !hanging) style += `text-indent: ${twipsToPixels(firstLine)}px;`;
          if (firstLine && hanging) style += `text-indent: ${twipsToPixels(firstLine - hanging)}px;`;
          if (!firstLine && hanging) style += `text-indent: ${twipsToPixels(-hanging)}px;`;

          return { style };
        },
      },
      borders: {
        default: null,
        renderDOM: ({ borders }) => {
          if (!borders) return {};

          const sideOrder = ['top', 'right', 'bottom', 'left'];
          const valToCss = {
            single: 'solid',
            dashed: 'dashed',
            dotted: 'dotted',
            double: 'double',
          };

          let style = '';
          sideOrder.forEach((side) => {
            const b = borders[side];
            if (!b) return;
            // Remove border if style is 'nil' or undefined
            if (['nil', 'none', undefined].includes(b.val)) {
              style += `border-${side}: none;`;
              return;
            }

            const width = b.size != null ? `${eigthPointsToPixels(b.size)}px` : '1px';
            const cssStyle = valToCss[b.val] || 'solid';
            const color = !b.color || b.color === 'auto' ? '#000000' : `#${b.color}`;

            style += `border-${side}: ${width} ${cssStyle} ${color};`;

            // Optionally handle space attribute (distance from text)
            if (b.space != null && side === 'bottom') {
              style += `padding-bottom: ${eigthPointsToPixels(b.space)}px;`;
            }
          });

          return style ? { style } : {};
        },
      },
      class: {
        renderDOM: (attributes) => {
          if (attributes.dropcap) {
            return { class: `sd-editor-dropcap` };
          }
          return null;
        },
      },
      styleId: {},
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs) => {
          return attrs.sdBlockId ? { 'data-sd-block-id': attrs.sdBlockId } : {};
        },
      },
      attributes: {
        rendered: false,
      },
      filename: { rendered: false },
      keepLines: { rendered: false },
      keepNext: { rendered: false },
      paragraphProperties: { rendered: false },
      dropcap: { rendered: false },
      pageBreakSource: { rendered: false },
      justify: {
        renderDOM: ({ justify }) => {
          const { val: jc } = justify || {};
          if (!jc) return {};

          let style = '';
          if (jc === 'left') style += 'text-align: left;';
          else if (jc === 'right') style += 'text-align: right;';
          else if (jc === 'center') style += 'text-align: center;';
          else if (jc === 'both') style += 'text-align: justify;';

          return { style };
        },
      },
      tabStops: { rendered: false },
    };
  },

  parseDOM() {
    return [
      {
        tag: 'p',
        getAttrs: (node) => {
          const { styleid, ...extraAttrs } = Array.from(node.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {});

          return {
            styleId: styleid || null,
            extraAttrs,
          };
        },
      },
      {
        tag: 'div',
        getAttrs: (node) => {
          const extra = {};
          Array.from(node.attributes).forEach((attr) => {
            extra[attr.name] = attr.value;
          });
          return { extraAttrs: extra };
        },
      },
      {
        tag: 'blockquote',
        attrs: { styleId: 'BlockQuote' },
      },
      ...this.options.headingLevels.map((level) => ({
        tag: `h${level}`,
        attrs: { level, styleId: `Heading${level}` },
      })),
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['p', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addPmPlugins() {
    const { view } = this.editor;
    const dropcapPlugin = new Plugin({
      name: 'dropcapPlugin',
      key: new PluginKey('dropcapPlugin'),
      state: {
        init(_, state) {
          let decorations = getDropcapDecorations(state, view);
          return DecorationSet.create(state.doc, decorations);
        },

        apply(tr, oldDecorationSet, oldState, newState) {
          if (!tr.docChanged) return oldDecorationSet;
          const decorations = getDropcapDecorations(newState, view);
          return DecorationSet.create(newState.doc, decorations);
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    });

    return [dropcapPlugin];
  },
});

const getDropcapDecorations = (state, view) => {
  let decorations = [];

  state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph') {
      if (node.attrs.dropcap?.type === 'margin') {
        const width = getDropcapWidth(view, pos);
        decorations.push(Decoration.inline(pos, pos + node.nodeSize, { style: `margin-left: -${width}px;` }));
      }

      return false; // no need to descend into a paragraph
    }
  });
  return decorations;
};

function getDropcapWidth(view, pos) {
  const domNode = view.nodeDOM(pos);
  if (domNode) {
    const range = document.createRange();
    range.selectNodeContents(domNode);
    return range.getBoundingClientRect().width;
  }
  return 0;
}
