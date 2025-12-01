import { OxmlNode, Attribute, type AttributeValue } from '@core/index.js';
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
import type { Node as PmNode } from 'prosemirror-model';
import type { Decoration } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';
import type { CommandProps } from '@core/types/ChainedCommands.js';

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

  addAttributes() {
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
        parseDOM: (element: Element) => {
          const extra: Record<string, string> = {};
          Array.from(element.attributes).forEach((attr: Attr) => {
            extra[attr.name] = attr.value;
          });
          return extra;
        },
        renderDOM: (attributes: { extraAttrs?: Record<string, string> }) => {
          return attributes.extraAttrs || {};
        },
      },
      sdBlockId: {
        default: null,
        keepOnSplit: false,
        parseDOM: (elem: Element) => elem.getAttribute('data-sd-block-id'),
        renderDOM: (attrs: { sdBlockId?: string | null }) => {
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
          listRendering?: { markerText?: string; path?: string | unknown; numberingType?: string };
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
        getAttrs: (node: Element) => {
          const numberingProperties: { numId?: number; ilvl?: number } = {};
          let indent: Record<string, number> | undefined;
          let spacing: Record<string, number> | undefined;
          const { styleid: styleId, ...extraAttrs } = Array.from(node.attributes).reduce(
            (acc: Record<string, string>, attr: Attr) => {
              if (attr.name === 'data-num-id') {
                numberingProperties.numId = parseInt(attr.value, 10);
              } else if (attr.name === 'data-level') {
                numberingProperties.ilvl = parseInt(attr.value, 10);
              } else if (attr.name === 'data-indent') {
                try {
                  const parsed = JSON.parse(attr.value) as Record<string, number>;
                  indent = {};
                  Object.entries(parsed || {}).forEach(([key, val]) => {
                    indent![key] = Number(val);
                  });
                } catch {
                  // ignore invalid indent value
                }
              } else if (attr.name === 'data-spacing') {
                try {
                  const parsed = JSON.parse(attr.value) as Record<string, number>;
                  spacing = {};
                  Object.entries(parsed || {}).forEach(([key, val]) => {
                    spacing![key] = Number(val);
                  });
                } catch {
                  // ignore invalid spacing value
                }
              } else {
                acc[attr.name] = attr.value;
              }
              return acc;
            },
            {} as Record<string, string>,
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
        getAttrs: (node: Element) => {
          const extra: Record<string, string> = {};
          Array.from(node.attributes).forEach((attr: Attr) => {
            extra[attr.name] = attr.value;
          });
          return { extraAttrs: extra };
        },
      },
      {
        tag: 'blockquote',
        attrs: { paragraphProperties: { styleId: 'BlockQuote' } },
      },
      ...(this.options?.headingLevels ?? []).map((level) => ({
        tag: `h${level}`,
        attrs: { level, paragraphProperties: { styleId: `Heading${level}` } },
      })),
    ];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes?: Record<string, AttributeValue> }) {
    return [
      'p',
      Attribute.mergeAttributes(
        (this.options?.htmlAttributes ?? {}) as Record<string, AttributeValue>,
        htmlAttributes || {},
      ),
      0,
    ];
  },

  addNodeView(): unknown {
    if (!this.editor || shouldSkipNodeView(this.editor)) return null;
    return ({
      node,
      editor,
      getPos,
      decorations,
      extensionAttrs,
    }: {
      node: PmNode;
      editor: Editor;
      getPos: () => number;
      decorations: readonly Decoration[];
      extensionAttrs?: unknown;
    }) => {
      return new ParagraphNodeView(
        node,
        editor,
        getPos,
        decorations,
        (extensionAttrs as Record<string, unknown>) || {},
      );
    };
  },

  addShortcuts(): Record<string, (...args: unknown[]) => unknown> {
    if (!this.editor) return {};
    const editor = this.editor;
    return {
      'Mod-Shift-7': () => {
        return editor.commands.toggleOrderedList();
      },
      'Mod-Shift-8': () => {
        return editor.commands.toggleBulletList();
      },
      Enter: (params: unknown) => {
        return removeNumberingProperties({ checkType: 'empty' })({
          ...(params as CommandProps),
          tr: editor.state.tr,
          state: editor.state,
          dispatch: editor.view.dispatch,
        });
      },

      'Shift-Enter': () => {
        return editor.commands.first(({ commands }: CommandProps) => [
          () => commands.createParagraphNear(),
          splitBlock({
            attrsToRemoveOverride: ['paragraphProperties.numberingProperties', 'listRendering', 'numberingProperties'],
          }),
        ]);
      },

      Tab: () => {
        return editor.commands.first(({ commands }: CommandProps) => [() => commands.increaseListIndent()]);
      },

      'Shift-Tab': () => {
        return editor.commands.first(({ commands }: CommandProps) => [() => commands.decreaseListIndent()]);
      },
    };
  },

  addInputRules() {
    if (!this.editor) return [];
    const editor = this.editor;
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
              editor,
            });
          },
        }),
    );
  },

  addCommands(): Record<string, (...args: unknown[]) => unknown> {
    if (!this.editor) return {};
    return {
      /**
       * Toggle ordered list formatting
       * @category Command
       * @example
       * editor.commands.toggleOrderedList()
       * @note Converts selection to ordered list or back to paragraphs
       */
      toggleOrderedList: () => (params: CommandProps) => {
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
      toggleBulletList: () => (params: CommandProps) => {
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
    if (!this.editor) return [];
    const dropcapPlugin = createDropcapPlugin(this.editor);
    const numberingPlugin = createNumberingPlugin(this.editor);
    return [dropcapPlugin, numberingPlugin];
  },
});
