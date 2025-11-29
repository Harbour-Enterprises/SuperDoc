import { Mark, Attribute, type AttributeValue } from '@core/index.js';
import { getMarkRange } from '@core/helpers/getMarkRange.js';
import { insertNewRelationship } from '@core/super-converter/docx-helpers/document-rels.js';
import { sanitizeHref, encodeTooltip, UrlValidationConstants } from '@superdoc/url-validation';

/** URL protocol schemes allowed by url-validation */
type Protocol = 'http' | 'https' | 'mailto' | 'tel' | 'sms' | 'ftp' | 'sftp' | 'irc';
import type { ParseRule, DOMOutputSpec } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';

type SanitizedLink = { href: string; isExternal?: boolean };

/**
 * Configuration options for Link
 * @category Options
 */
export interface LinkOptions extends Record<string, unknown> {
  /** Allowed URL protocols */
  protocols: string[];
  /** HTML attributes for link elements */
  htmlAttributes: {
    target: string | null;
    rel: string;
    class: string | null;
    title: string | null;
    rId?: string | null;
  };
}

/**
 * @module Link
 * @sidebarTitle Link
 * @snippetPath /snippets/extensions/link.mdx
 * @note Non-inclusive mark that doesn't expand when typing at edges
 */
export const Link = Mark.create<LinkOptions>({
  name: 'link',
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,

  addOptions() {
    return {
      protocols: ['http', 'https'] as string[],
      htmlAttributes: {
        target: null as string | null,
        rel: 'noopener noreferrer nofollow' as string,
        class: null as string | null,
        title: null as string | null,
        rId: null as string | null,
      },
    };
  },

  parseDOM(): ParseRule[] {
    return [{ tag: 'a' }];
  },

  renderDOM(this: { options: LinkOptions }, props?: { htmlAttributes?: Record<string, unknown> }): DOMOutputSpec {
    const htmlAttributes = props?.htmlAttributes ?? {};
    const options = this.options;
    const sanitizedHref = sanitizeLinkHref(htmlAttributes.href as string | null | undefined, options?.protocols ?? []);
    const attrs = { ...htmlAttributes };
    attrs.href = sanitizedHref ? sanitizedHref.href : '';
    return ['a', Attribute.mergeAttributes(options?.htmlAttributes ?? {}, attrs as Record<string, AttributeValue>), 0];
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param href - URL or anchor reference
       */
      href: {
        default: null,
        renderDOM(this: { options: LinkOptions }, { href, name }: { href?: string; name?: string }) {
          const options = this.options;
          const sanitized = sanitizeLinkHref(href, options?.protocols ?? []);
          if (sanitized) return { href: sanitized.href };
          if (name) return { href: `#${name}` };
          return {};
        },
      },
      /**
       * @category Attribute
       * @param target - Link target window
       */
      target: {
        default: (this.options as LinkOptions | undefined)?.htmlAttributes?.target ?? null,
        renderDOM(this: { options: LinkOptions }, { target, href }: { target?: string; href?: string }) {
          if (target) return { target };
          const options = this.options;
          const sanitized = sanitizeLinkHref(href, options?.protocols ?? []);
          if (sanitized && sanitized.isExternal) return { target: '_blank' };
          return {};
        },
      },
      /**
       * @category Attribute
       * @param rel - Relationship attributes
       */
      rel: {
        default: (this.options as LinkOptions | undefined)?.htmlAttributes?.rel ?? 'noopener noreferrer nofollow',
      },
      /**
       * @private
       * @category Attribute
       * @param rId - Word relationship ID for internal links
       */
      rId: { default: (this.options as LinkOptions | undefined)?.htmlAttributes?.rId || null },
      /**
       * @category Attribute
       * @param text - Display text for the link
       */
      text: { default: null },
      /**
       * @category Attribute
       * @param name - Anchor name for internal references
       */
      name: { default: null },
      /**
       * @category Attribute
       * @param history - Specifies whether the target of the hyperlink  shall be added to a list of viewed hyperlinks when it is invoked.
       */
      history: { default: true, rendered: false },
      /**
       * @category Attribute
       * @param anchor - Specifies the name of a bookmark that is the target of this link. If the rId and href attributes are specified, then this attribute is ignored.
       */
      anchor: { rendered: false },
      /**
       * @category Attribute
       * @param docLocation - Specifies a location in the target of the hyperlink.
       */
      docLocation: { rendered: false },
      /**
       * @category Attribute
       * @param tooltip - A tooltip for the link
       */
      tooltip: {
        default: null,
        renderDOM: ({ tooltip }: { tooltip?: string }) => {
          const result = encodeTooltip(tooltip);
          if (result) {
            // Use raw text - browser will escape when setting attribute
            const attrs: Record<string, string> = { title: result.text };
            if (result.wasTruncated) {
              attrs['data-link-tooltip-truncated'] = 'true';
            }
            return attrs;
          }
          return {};
        },
      },
    };
  },

  addCommands() {
    return {
      /**
       * Create or update a link
       * @category Command
       * @param options - Link configuration
       * @example
       * editor.commands.setLink({ href: 'https://example.com' })
       * editor.commands.setLink({
       *   href: 'https://example.com',
       *   text: 'Visit Example'
       * })
       * @note Automatically adds underline formatting and trims whitespace from link boundaries
       */
      setLink:
        ({ href, text }: { href?: string; text?: string } = {}) =>
        ({
          state,
          dispatch,
          editor,
        }: {
          state: EditorState;
          dispatch: (tr: Transaction) => void;
          editor: import('@core/Editor.js').Editor;
        }) => {
          const { selection } = state;
          const linkMarkType = editor.schema.marks.link;
          const underlineMarkType = editor.schema.marks.underline;

          const options = this.options as LinkOptions | undefined;
          const sanitizedHref = href ? sanitizeLinkHref(href, options?.protocols ?? []) : null;
          if (href && !sanitizedHref) {
            return false;
          }

          let from = selection.from;
          let to = selection.to;

          // Expand empty selection to cover existing link
          if (selection.empty) {
            const range = getMarkRange(selection.$from, linkMarkType);
            if (range) {
              from = range.from;
              to = range.to;
            }
          } else {
            // Handle partial link selections
            const fromLinkRange = getMarkRange(selection.$from, linkMarkType);
            const toLinkRange = getMarkRange(selection.$to, linkMarkType);
            if (fromLinkRange || toLinkRange) {
              const linkRange = fromLinkRange ?? toLinkRange;
              if (linkRange) {
                from = linkRange.from;
                to = linkRange.to;
              }
            }
          }

          ({ from, to } = trimRange(state.doc, from, to));

          const currentText = state.doc.textBetween(from, to);
          const computedText = text ?? currentText;
          const fallbackHref = sanitizedHref?.href ?? '';
          const finalText = computedText && computedText.length > 0 ? computedText : fallbackHref;
          let tr = state.tr;

          if (finalText && currentText !== finalText) {
            tr = tr.insertText(finalText, from, to);
            to = from + finalText.length;
          }

          if (linkMarkType) tr = tr.removeMark(from, to, linkMarkType);
          if (underlineMarkType) tr = tr.removeMark(from, to, underlineMarkType);

          if (underlineMarkType) tr = tr.addMark(from, to, underlineMarkType.create());

          let rId = null;
          if (editor.options.mode === 'docx') {
            const id = addLinkRelationship({ editor, href: href ?? '' });
            if (id) rId = id;
          }

          const linkAttrs: { text: string; rId: string | null; href?: string } = { text: finalText, rId };
          if (sanitizedHref?.href) {
            linkAttrs.href = sanitizedHref.href;
          }

          const newLinkMarkType = linkMarkType.create(linkAttrs);
          tr = tr.addMark(from, to, newLinkMarkType);

          dispatch(tr.scrollIntoView());
          return true;
        },

      /**
       * Remove link and associated formatting
       * @category Command
       * @example
       * editor.commands.unsetLink()
       * @note Also removes underline and text color
       */
      unsetLink:
        () =>
        ({ chain }: { chain: () => import('@core/types/ChainedCommands.js').ChainableCommandObject }) => {
          return chain()
            .unsetMark('underline', { extendEmptyMarkRange: true })
            .unsetColor()
            .unsetMark('link', { extendEmptyMarkRange: true })
            .run();
        },

      /**
       * Toggle link on selection
       * @category Command
       * @param options - Link configuration
       * @example
       * editor.commands.toggleLink({ href: 'https://example.com' })
       * editor.commands.toggleLink()
       */
      toggleLink:
        ({ href, text }: { href?: string; text?: string } = {}) =>
        ({ commands }: { commands: Record<string, (...args: unknown[]) => boolean> }) => {
          if (!href) return commands.unsetLink();
          return commands.setLink({ href, text });
        },
    };
  },
});

/**
 * Normalize protocol values into a consistent array format.
 *
 * Converts protocol configuration (string or object format) into a normalized
 * array of lowercase protocol strings, filtering out invalid entries.
 *
 * @private
 * @param protocols - Protocol configurations
 * @returns Array of normalized lowercase protocol strings
 * @example
 * normalizeProtocols(['HTTP', { scheme: 'FTP' }]) // Returns: ['http', 'ftp']
 */
function normalizeProtocols(protocols: Array<string | { scheme: string }> = []): string[] {
  const result: string[] = [];
  protocols.forEach((protocol) => {
    if (!protocol) return;
    if (typeof protocol === 'string' && protocol.trim()) {
      result.push(protocol.trim().toLowerCase());
    } else if (
      typeof protocol === 'object' &&
      'scheme' in protocol &&
      typeof protocol.scheme === 'string' &&
      protocol.scheme.trim()
    ) {
      result.push(protocol.scheme.trim().toLowerCase());
    }
  });
  return result;
}

/**
 * Sanitize a link href using the url-validation package.
 *
 * Wraps the external sanitizeHref function with protocol merging logic,
 * combining default allowed protocols with custom protocols from configuration.
 *
 * @private
 * @param href - URL string to sanitize
 * @param protocols - Additional protocols to allow
 * @returns Sanitized link object or null
 * @example
 * sanitizeLinkHref('https://example.com', ['ftp'])
 * // Returns: { href: 'https://example.com', protocol: 'https', isExternal: true }
 */
function sanitizeLinkHref(
  href: string | null | undefined,
  protocols: Array<string | { scheme: string }>,
): SanitizedLink | null {
  if (!href) return null;

  // Validate protocols is array-like before processing
  const normalizedProtocols = Array.isArray(protocols) ? normalizeProtocols(protocols) : [];

  const allowedProtocols = Array.from(
    new Set([...UrlValidationConstants.DEFAULT_ALLOWED_PROTOCOLS, ...normalizedProtocols]),
  ) as Protocol[];
  return sanitizeHref(href, { allowedProtocols });
}

/**
 * Trim node boundaries from range
 * @private
 * @param doc - Document node
 * @param from - Start position
 * @param to - End position
 * @returns Trimmed range
 * @note A "non-user" position is one that produces **no text** when we ask
 * `doc.textBetween(pos, pos + 1, '')`.
 * That happens at node boundaries (between the doc node and its first child,
 * between paragraphs, etc.).
 *
 * A regular space typed by the user **does** produce text (" "), so it will
 * NOT be trimmed.
 */
const trimRange = (doc: import('prosemirror-model').Node, from: number, to: number): { from: number; to: number } => {
  // Skip positions that produce no text output (node boundaries).
  while (from < to && doc.textBetween(from, from + 1, '') === '') {
    from += 1;
  }

  while (to > from && doc.textBetween(to - 1, to, '') === '') {
    to -= 1;
  }

  // This should now normalize the from and to selections to require
  // starting and ending without doc specific whitespace
  return { from, to };
};

function addLinkRelationship({
  editor,
  href,
}: {
  editor: import('@core/Editor.js').Editor;
  href: string;
}): string | null {
  const target = href;
  const type = 'hyperlink';
  try {
    const id = insertNewRelationship(target, type, editor);
    return id;
  } catch {
    return null;
  }
}
