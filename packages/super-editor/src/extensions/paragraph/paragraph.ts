import { OxmlNode, Attribute } from '@core/index.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { splitBlock } from '@core/commands/splitBlock.js';
import { removeNumberingProperties } from '@core/commands/removeNumberingProperties.js';
import { isList } from '@core/commands/list-helpers';
import { findParentNode } from '@helpers/index.js';
import { InputRule } from '@core/InputRule.js';
import { toggleList } from '@core/commands/index.js';
import { restartNumbering } from '@core/commands/restartNumbering.js';
import { ParagraphNodeView } from './ParagraphNodeView.js';
import { createNumberingPlugin } from './numberingPlugin.js';
import { createDropcapPlugin } from './dropcapPlugin.js';
import { shouldSkipNodeView } from '../../utils/headless-helpers.js';

/**
 * Input rule regex that matches a bullet list marker (-, +, or *)
 * @private
 */
const bulletInputRegex = /^\s*([-+*])\s$/;

/**
 * Input rule regex that matches an ordered list marker (e.g., "1. ")
 * @private
 */
const orderedInputRegex = /^(\d+)\.\s$/;

/**
 * Configuration options for Paragraph
 * @category Options
 */
export interface ParagraphOptions extends Record<string, unknown> {
  /** Supported heading levels */
  headingLevels: number[];
  /** HTML attributes for paragraph elements */
  htmlAttributes: Record<string, unknown>;
}

/**
 * @module Paragraph
 * @sidebarTitle Paragraph
 * @snippetPath /snippets/extensions/paragraph.mdx
 */
export const Paragraph = OxmlNode.create<ParagraphOptions>({
  name: 'paragraph',

  oXmlName: 'w:p',

  priority: 1000,

  group: 'block',

  content: 'inline*',

  inline: false,

  summary: 'The paragraph node mirrors MS Word w:p paragraphs, and also represents lists in the schema.',

  addOptions() {
    return {
      headingLevels: [1, 2, 3, 4, 5, 6],
      htmlAttributes: {},
    };
  },

  addAttributes(): Record<string, unknown> {
    return {
      paraId: { rendered: false },
      textId: { rendered: false },
      rsidR: { rendered: false },
      rsidRDefault: { rendered: false },
      rsidP: { rendered: false },
      rsidRPr: { rendered: false },
      rsidDel: { rendered: false },
      extraAttrs: {
        default: {},
        parseDOM: (element) => {
          const extra: Record<string, string> = {};
          Array.from(element.attributes).forEach((attr) => {
            extra[attr.name] = attr.value;
          });
          return extra;
        },
        renderDOM: (attributes) => {
          return attributes.extraAttrs || {};
        },
      },
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
      paragraphProperties: { rendered: false },
      pageBreakSource: { rendered: false },
      sectionMargins: { rendered: false },
      listRendering: {
        keepOnSplit: false,
        renderDOM: ({
          listRendering,
        }: {
          listRendering?: { markerText?: string; path?: string; numberingType?: string };
        }) => {
          return {
            'data-marker-type': listRendering?.markerText,
            'data-list-level': listRendering?.path ? JSON.stringify(listRendering.path) : null,
            'data-list-numbering-type': listRendering?.numberingType,
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
          const numberingProperties: { numId?: number; ilvl?: number } = {};
          let indent: Record<string, number> | undefined;
          let spacing: Record<string, number> | undefined;
          const { styleid: styleId, ...extraAttrs } = Array.from(node.attributes).reduce(
            (acc: Record<string, string>, attr) => {
              if (attr.name === 'data-num-id') {
                numberingProperties.numId = parseInt(attr.value);
              } else if (attr.name === 'data-level') {
                numberingProperties.ilvl = parseInt(attr.value);
              } else if (attr.name === 'data-indent') {
                try {
                  indent = JSON.parse(attr.value);
                  // Ensure numeric values
                  if (indent) {
                    Object.keys(indent).forEach((key) => {
                      if (indent) {
                        indent[key] = Number(indent[key]);
                      }
                    });
                  }
                } catch {
                  // ignore invalid indent value
                }
              } else if (attr.name === 'data-spacing') {
                try {
                  spacing = JSON.parse(attr.value);
                  // Ensure numeric values
                  if (spacing) {
                    Object.keys(spacing).forEach((key) => {
                      if (spacing) {
                        spacing[key] = Number(spacing[key]);
                      }
                    });
                  }
                } catch {
                  // ignore invalid spacing value
                }
              } else {
                acc[attr.name] = attr.value;
              }
              return acc;
            },
            {},
          );

          if (Object.keys(numberingProperties).length > 0) {
            return {
              paragraphProperties: {
                numberingProperties,
                indent,
                spacing,
                styleId: styleId || null,
              },
              extraAttrs,
            };
          }

          return {
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
        attrs: { paragraphProperties: { styleId: 'BlockQuote' } },
      },
      ...this.options.headingLevels.map((level) => ({
        tag: `h${level}`,
        attrs: { level, paragraphProperties: { styleId: `Heading${level}` } },
      })),
    ];
  },

  renderDOM({ htmlAttributes }) {
    return ['p', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addNodeView(): unknown {
    if (shouldSkipNodeView(this.editor)) return null;
    return ({ node, editor, getPos, decorations, extensionAttrs }: Record<string, unknown>) => {
      return new ParagraphNodeView(node, editor, getPos, decorations, extensionAttrs);
    };
  },

  addShortcuts(): unknown {
    return {
      'Mod-Shift-7': () => {
        return this.editor.commands.toggleOrderedList();
      },
      'Mod-Shift-8': () => {
        return this.editor.commands.toggleBulletList();
      },
      Enter: (params: Record<string, unknown>) => {
        return removeNumberingProperties({ checkType: 'empty' })({
          ...params,
          tr: this.editor.state.tr,
          state: this.editor.state,
          dispatch: this.editor.view.dispatch,
        });
      },

      'Shift-Enter': () => {
        return this.editor.commands.first(({ commands }) => [
          () => commands.createParagraphNear(),
          splitBlock({
            attrsToRemoveOverride: ['paragraphProperties.numberingProperties', 'listRendering', 'numberingProperties'],
          }),
        ]);
      },

      Tab: () => {
        return this.editor.commands.first(({ commands }) => [() => commands.increaseListIndent()]);
      },

      'Shift-Tab': () => {
        return this.editor.commands.first(({ commands }) => [() => commands.decreaseListIndent()]);
      },
    };
  },

  addInputRules() {
    return [
      { regex: orderedInputRegex, type: 'orderedList' },
      { regex: bulletInputRegex, type: 'bulletList' },
    ].map(
      ({ regex, type }) =>
        new InputRule({
          match: regex,
          handler: ({ state, range }) => {
            // Check if we're currently inside a list item
            const parentListItem = findParentNode(isList)(state.selection);
            if (parentListItem) {
              // Inside a list item, do not create a new list
              return null;
            }

            // Not inside a list item, proceed with creating new list
            const { tr } = state;
            tr.delete(range.from, range.to);

            ListHelpers.createNewList({
              listType: type,
              tr,
              editor: this.editor,
            });
          },
        }),
    );
  },

  addCommands(): unknown {
    return {
      /**
       * Toggle ordered list formatting
       * @category Command
       * @example
       * editor.commands.toggleOrderedList()
       * @note Converts selection to ordered list or back to paragraphs
       */
      toggleOrderedList: () => (params: Record<string, unknown>) => {
        return toggleList('orderedList')(params);
      },

      /**
       * Toggle a bullet list at the current selection
       * @category Command
       * @example
       * // Toggle bullet list on selected text
       * editor.commands.toggleBulletList()
       * @note Converts selected paragraphs to list items or removes list formatting
       */
      toggleBulletList: () => (params: Record<string, unknown>) => {
        return toggleList('bulletList')(params);
      },

      /**
       * Restart numbering for the current list
       * @category Command
       * @example
       * // Restart numbering for the current list item
       * editor.commands.restartNumbering()
       * @note Resets list numbering for the current list item and following items
       */
      restartNumbering: () => restartNumbering,
    };
  },

  addPmPlugins() {
    const dropcapPlugin = createDropcapPlugin(this.editor);
    const numberingPlugin = createNumberingPlugin(this.editor);
    return [dropcapPlugin, numberingPlugin];
  },
});
