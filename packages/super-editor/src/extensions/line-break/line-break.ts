import { Node, Attribute, type AttributeValue } from '@core/index.js';
import type { ParseRule, DOMOutputSpec } from 'prosemirror-model';

/**
 * Configuration options for LineBreak
 * @category Options
 */
export type LineBreakOptions = Record<string, never>;

/**
 * Attributes for line break nodes
 * @category Attributes
 */
export interface LineBreakAttributes {
  /** @internal Type of line break - passthrough in this node */
  lineBreakType?: string;
  /** @internal Clear attribute - passthrough in this node */
  clear?: string;
}

/**
 * @module LineBreak
 * @sidebarTitle Line Break
 * @snippetPath /snippets/extensions/line-break.mdx
 */
export const LineBreak = Node.create<LineBreakOptions>({
  name: 'lineBreak',
  group: 'inline',
  inline: true,
  marks: '',
  defining: true,
  selectable: false,
  content: '',
  atom: true,

  addOptions() {
    return {};
  },

  parseDOM(): ParseRule[] {
    return [{ tag: 'br' }];
  },

  renderDOM() {
    return ['br', {}];
  },

  addAttributes() {
    return {
      lineBreakType: { rendered: false },
      clear: { rendered: false },
    };
  },

  addCommands() {
    return {
      /**
       * Insert a line break
       * @category Command
       * @example
       * editor.commands.insertLineBreak()
       * @note Creates a soft break within the same paragraph
       */
      insertLineBreak:
        () =>
        ({ commands }: { commands: { insertContent: (content: { type: string }) => boolean } }) => {
          return commands.insertContent({ type: 'lineBreak' });
        },
    };
  },
});

/**
 * Configuration options for HardBreak
 * @category Options
 */
export interface HardBreakOptions extends Record<string, unknown> {
  /** HTML attributes for the break element */
  htmlAttributes: Record<string, unknown>;
}

/**
 * Attributes for hard break nodes
 * @category Attributes
 */
export interface HardBreakAttributes {
  /** @internal Source of the page break */
  pageBreakSource?: string | null;
  /** @internal Type of page break */
  pageBreakType?: string | null;
  /** @internal Type of line break - passthrough in this node */
  lineBreakType?: string;
  /** @internal Clear attribute - passthrough in this node */
  clear?: string;
}

/**
 * @module HardBreak
 * @sidebarTitle Hard Break
 * @snippetPath /snippets/extensions/hard-break.mdx
 */
export const HardBreak = Node.create<HardBreakOptions>({
  name: 'hardBreak',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      htmlAttributes: {
        contentEditable: 'false',
        lineBreakType: 'page',
        'aria-hidden': 'true',
        'aria-label': 'Hard break node',
      },
    };
  },

  addAttributes() {
    return {
      pageBreakSource: {
        rendered: false,
        default: null,
      },

      pageBreakType: {
        default: null,
        rendered: false,
      },

      lineBreakType: { rendered: false },

      clear: { rendered: false },
    };
  },

  parseDOM(): ParseRule[] {
    return [
      {
        tag: 'span[linebreaktype="page"]',
        getAttrs: (dom: HTMLElement | string) => {
          if (!(dom instanceof HTMLElement)) return false;
          return {
            pageBreakSource: dom.getAttribute('pagebreaksource') || null,
            pageBreakType: dom.getAttribute('linebreaktype') || null,
          };
        },
      },
    ];
  },

  renderDOM(
    this: { options: HardBreakOptions },
    { htmlAttributes }: { htmlAttributes?: Record<string, unknown> } = {},
  ): DOMOutputSpec {
    const options = this.options;
    const merged = Attribute.mergeAttributes(
      (options?.htmlAttributes as Record<string, AttributeValue>) ?? {},
      (htmlAttributes as Record<string, AttributeValue>) ?? {},
    );
    return ['span', merged];
  },

  addCommands() {
    return {
      /**
       * Insert a page break
       * @category Command
       * @example
       * editor.commands.insertPageBreak()
       * @note Forces content to start on a new page when printed
       */
      insertPageBreak:
        () =>
        ({
          commands,
        }: {
          commands: { insertContent: (content: { type: string; attrs: { pageBreakType: string } }) => boolean };
        }) => {
          return commands.insertContent({
            type: 'hardBreak',
            attrs: { pageBreakType: 'page' },
          });
        },
    };
  },
});
