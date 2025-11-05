import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { OxmlNode, Attribute } from '@core/index.js';
import { getSpacingStyleString, getMarksStyle } from '@extensions/linked-styles/index.js';
import { getDefaultSpacing } from './helpers/getDefaultSpacing.js';
import { pixelsToTwips, linesToTwips, twipsToPixels, eighthPointsToPixels } from '@converter/helpers.js';
import { ParagraphNodeView } from './ParagraphNodeView.js';
import { createNumberingPlugin } from './numberingPlugin.js';

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
          if (!spacing) return { style: null };
          const spacingCopy = { ...spacing };
          if (attrs.lineHeight) delete spacingCopy.line; // we'll get line-height from lineHeight
          const style = getSpacingStyleString(
            spacingCopy,
            marksAttrs ?? [],
            Boolean(attrs.paragraphProperties?.numberingProperties),
          );
          if (style) return { style };
          return { style: null };
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
          if (!indent) return { style: null };
          const { left, right, firstLine, hanging } = indent;
          if (indent && Object.values(indent).every((v) => v === 0)) {
            return { style: null };
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
            if (['nil', 'none', undefined, null].includes(b.val)) {
              style += `border-${side}: none;`;
              return;
            }

            const width = b.size != null ? `${eighthPointsToPixels(b.size)}px` : '1px';
            const cssStyle = valToCss[b.val] || 'solid';
            const color = !b.color || b.color === 'auto' ? '#000000' : `#${b.color}`;

            style += `border-${side}: ${width} ${cssStyle} ${color};`;

            // Optionally handle space attribute (distance from text)
            if (b.space != null && side === 'bottom') {
              style += `padding-bottom: ${eighthPointsToPixels(b.space)}px;`;
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
      textAlign: {
        renderDOM: ({ textAlign }) => {
          if (!textAlign) return {};

          let style = '';
          if (textAlign === 'left') style += 'text-align: left;';
          else if (textAlign === 'right') style += 'text-align: right;';
          else if (textAlign === 'center') style += 'text-align: center;';
          else if (textAlign === 'both') style += 'text-align: justify;';

          return { style };
        },
      },
      tabStops: { rendered: false },
      listRendering: {
        keepOnSplit: false,
        renderDOM: ({ listRendering }) => {
          return {
            'data-marker-type': listRendering?.markerText,
            'data-list-level': listRendering?.path ? JSON.stringify(listRendering.path) : null,
            'data-list-numbering-type': listRendering?.numberingType,
          };
        },
      },
      numberingProperties: {
        keepOnSplit: true,
        renderDOM: ({ numberingProperties }) => {
          return {
            'data-num-id': numberingProperties?.numId,
            'data-level': numberingProperties?.ilvl,
          };
        },
      },
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

  addNodeView() {
    return ({ node, editor, getPos, decorations, extensionAttrs }) => {
      return new ParagraphNodeView(node, editor, getPos, decorations, extensionAttrs);
    };
  },
  addPmPlugins() {
    const { view } = this.editor;
    const dropcapWidthCache = new Map();

    /**
     * Determines whether the node is a margin dropcap paragraph.
     * @param {import('prosemirror-model').Node} node - Node to inspect.
     * @returns {boolean} True when the paragraph uses margin dropcaps.
     */
    const hasDropcapParagraph = (node) => node.type.name === 'paragraph' && node.attrs.dropcap?.type === 'margin';

    /**
     * Removes cached dropcap widths that fall within the affected document range.
     * @param {number} from - Start position of an updated range.
     * @param {number} to - End position of an updated range.
     * @returns {void}
     */
    const invalidateCacheForRange = (from, to) => {
      for (const [pos] of dropcapWidthCache) {
        if (pos >= from && pos <= to) {
          dropcapWidthCache.delete(pos);
        }
      }
    };

    const dropcapPlugin = new Plugin({
      name: 'dropcapPlugin',
      key: new PluginKey('dropcapPlugin'),
      state: {
        init(_, state) {
          const decorations = getDropcapDecorations(state, view, dropcapWidthCache);
          return DecorationSet.create(state.doc, decorations);
        },

        apply(tr, oldDecorationSet, oldState, newState) {
          if (!tr.docChanged) return oldDecorationSet;

          // Early exit if no dropcaps in document
          let hasDropcaps = false;
          newState.doc.descendants((node) => {
            if (hasDropcapParagraph(node)) {
              hasDropcaps = true;
              return false;
            }
          });

          if (!hasDropcaps) {
            dropcapWidthCache.clear();
            return DecorationSet.empty;
          }

          // Check if transaction affects dropcap paragraphs
          let affectsDropcaps = false;

          tr.steps.forEach((step) => {
            if (step.slice?.content) {
              step.slice.content.descendants((node) => {
                if (hasDropcapParagraph(node)) {
                  affectsDropcaps = true;
                  return false;
                }
              });
            }

            if (step.jsonID === 'replace' && step.from !== undefined && step.to !== undefined) {
              try {
                oldState.doc.nodesBetween(step.from, step.to, (node) => {
                  if (hasDropcapParagraph(node)) {
                    affectsDropcaps = true;
                    return false;
                  }
                });
              } catch {
                affectsDropcaps = true;
              }
            }
          });

          if (!affectsDropcaps) {
            return oldDecorationSet.map(tr.mapping, tr.doc);
          }

          // Invalidate cached widths for affected ranges
          tr.steps.forEach((step) => {
            if (step.from !== undefined && step.to !== undefined) {
              invalidateCacheForRange(step.from, step.to);
            }
          });

          const decorations = getDropcapDecorations(newState, view, dropcapWidthCache);
          return DecorationSet.create(newState.doc, decorations);
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    });

    const numberingPlugin = createNumberingPlugin(this.editor);
    return [dropcapPlugin, numberingPlugin];
  },
});

const getDropcapDecorations = (state, view, widthCache) => {
  const decorations = [];

  state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph') {
      if (node.attrs.dropcap?.type === 'margin') {
        const width = getDropcapWidth(view, pos, widthCache);
        decorations.push(Decoration.inline(pos, pos + node.nodeSize, { style: `margin-left: -${width}px;` }));
      }
      return false;
    }
  });

  return decorations;
};

function getDropcapWidth(view, pos, widthCache) {
  if (widthCache.has(pos)) {
    return widthCache.get(pos);
  }

  const domNode = view.nodeDOM(pos);
  if (domNode) {
    const range = document.createRange();
    range.selectNodeContents(domNode);
    const width = range.getBoundingClientRect().width;
    widthCache.set(pos, width);
    return width;
  }

  return 0;
}
