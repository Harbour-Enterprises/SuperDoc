// @ts-check
/**
 * Link attributes
 * @typedef {Object} LinkAttributes
 * @property {string} href - URL or anchor reference
 * @property {string} [target='_blank'] - Link target
 * @property {string} [rel='noopener noreferrer nofollow'] - Relationship attributes
 * @property {string} [rId] - Word relationship ID for internal links
 * @property {string} [text] - Display text for the link
 * @property {string} [name] - Anchor name for internal references
 */

/**
 * Target frame options
 * @typedef {'_top' | '_self' | '_parent' | '_blank' | string} TargetFrameOptions
 */

import { Mark, Attribute } from '@core/index.js';
import { getMarkRange } from '@core/helpers/getMarkRange.js';
import { insertNewRelationship } from '@core/super-converter/docx-helpers/document-rels.js';

/**
 * @module Link
 * @sidebarTitle Link
 * @snippetPath /snippets/extensions/link.mdx
 * @note Non-inclusive mark that doesn't expand when typing at edges
 */
export const Link = Mark.create({
  name: 'link',
  priority: 1000,
  keepOnSplit: false,
  inclusive: false,

  addOptions() {
    return {
      /**
       * Allowed URL protocols
       * @type {string[]}
       * @default ['http', 'https']
       */
      protocols: ['http', 'https'],
      htmlAttributes: {
        target: null,
        rel: 'noopener noreferrer nofollow',
        class: null,
        title: null,
      },
    };
  },

  parseDOM() {
    return [{ tag: 'a' }];
  },

  renderDOM({ htmlAttributes }) {
    if (!isAllowedUri(htmlAttributes.href, this.options.protocols)) {
      return ['a', Attribute.mergeAttributes(this.options.htmlAttributes, { ...htmlAttributes, href: '' }), 0];
    }
    return ['a', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addAttributes() {
    return {
      /**
       * @category Attribute
       * @param {string} [href] - URL or anchor reference
       */
      href: {
        default: null,
        renderDOM: ({ href, name }) => {
          if (href && isAllowedUri(href, this.options.protocols)) return { href };
          else if (name) return { href: `#${name}` };
          return {};
        },
      },
      /**
       * @category Attribute
       * @param {TargetFrameOptions} [target='_blank'] - Link target window
       */
      target: {
        default: this.options.htmlAttributes.target,
        renderDOM: ({ target, href }) => {
          if (target) return { target };
          else if (href && !href.startsWith('#')) return { target: '_blank' };
          return {};
        },
      },
      /**
       * @category Attribute
       * @param {string} [rel='noopener noreferrer nofollow'] - Relationship attributes
       */
      rel: { default: this.options.htmlAttributes.rel },
      /**
       * @private
       * @category Attribute
       * @param {string} [rId] - Word relationship ID for internal links
       */
      rId: { default: this.options.htmlAttributes.rId || null },
      /**
       * @category Attribute
       * @param {string} [text] - Display text for the link
       */
      text: { default: null },
      /**
       * @category Attribute
       * @param {string} [name] - Anchor name for internal references
       */
      name: { default: null },
      /**
       * @category Attribute
       * @param {boolean} [history] - Specifies whether the target of the hyperlink  shall be added to a list of viewed hyperlinks when it is invoked.
       */
      history: { default: true, rendered: false },
      /**
       * @category Attribute
       * @param {string|null} [anchor] - Specifies the name of a bookmark that is the target of this link. If the rId and href attributes are specified, then this attribute is ignored.
       */
      anchor: { rendered: false },
      /**
       * @category Attribute
       * @param {string|null} [docLocation] - Specifies a location in the target of the hyperlink.
       */
      docLocation: { rendered: false },
      /**
       * @category Attribute
       * @param {string|null} [tooltip] - A tooltip for the link
       */
      tooltip: {
        default: null,
        renderDOM: ({ tooltip }) => {
          if (tooltip) return { title: tooltip };
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
       * @param {Object} options - Link configuration
       * @param {string} [options.href] - URL for the link
       * @param {string} [options.text] - Display text (uses selection if omitted)
       * @returns {Function} Command - Creates link with underline
       * @example
       * // Link selected text
       * setLink({ href: 'https://example.com' })
       *
       * // Link with custom text
       * setLink({
       *   href: 'https://example.com',
       *   text: 'Visit Example'
       * })
       * @note Automatically adds underline formatting and trims whitespace from link boundaries
       */
      setLink:
        ({ href, text } = {}) =>
        ({ state, dispatch, editor }) => {
          const { selection } = state;
          const linkMarkType = editor.schema.marks.link;
          const underlineMarkType = editor.schema.marks.underline;

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
              const linkRange = fromLinkRange || toLinkRange;
              from = linkRange.from;
              to = linkRange.to;
            }
          }

          ({ from, to } = trimRange(state.doc, from, to));

          const currentText = state.doc.textBetween(from, to);
          const computedText = text ?? currentText;
          const finalText = computedText && computedText.length > 0 ? computedText : href || '';
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
            const id = addLinkRelationship({ editor, href });
            if (id) rId = id;
          }

          const newLinkMarkType = linkMarkType.create({ href, text: finalText, rId });
          tr = tr.addMark(from, to, newLinkMarkType);

          dispatch(tr.scrollIntoView());
          return true;
        },

      /**
       * Remove link and associated formatting
       * @category Command
       * @returns {Function} Command - Removes link, underline, and color
       * @example
       * unsetLink()
       * @note Also removes underline and text color
       */
      unsetLink:
        () =>
        ({ chain }) => {
          return chain()
            .unsetMark('underline', { extendEmptyMarkRange: true })
            .unsetColor()
            .unsetMark('link', { extendEmptyMarkRange: true })
            .run();
        },

      /**
       * Toggle link on selection
       * @category Command
       * @param {Object} [options] - Link configuration
       * @param {string} [options.href] - URL for the link
       * @param {string} [options.text] - Display text
       * @returns {Function} Command - Creates link if href provided, removes otherwise
       * @example
       * // Add link
       * toggleLink({ href: 'https://example.com' })
       *
       * // Remove link
       * toggleLink()
       */
      toggleLink:
        ({ href, text } = {}) =>
        ({ commands }) => {
          if (!href) return commands.unsetLink();
          return commands.setLink({ href, text });
        },
    };
  },
});

/**
 * Validate URI against allowed protocols
 * @private
 * @param {string} uri - URI to validate
 * @param {string[]} protocols - Allowed protocols
 * @returns {boolean} Whether URI is allowed
 */
const ATTR_WHITESPACE = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;
function isAllowedUri(uri, protocols) {
  const allowedProtocols = ['http', 'https', 'mailto'];

  if (protocols) {
    protocols.forEach((protocol) => {
      const nextProtocol = typeof protocol === 'string' ? protocol : protocol.scheme;
      if (nextProtocol) {
        allowedProtocols.push(nextProtocol);
      }
    });
  }

  return (
    !uri ||
    uri
      .replace(ATTR_WHITESPACE, '')
      .match(new RegExp(`^(?:(?:${allowedProtocols.join('|')}):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))`, 'i'))
  );
}

/**
 * Trim node boundaries from range
 * @private
 * @param {Object} doc - Document node
 * @param {number} from - Start position
 * @param {number} to - End position
 * @returns {{from: number, to: number}} Trimmed range
 * @note A "non-user" position is one that produces **no text** when we ask
 * `doc.textBetween(pos, pos + 1, '')`.
 * That happens at node boundaries (between the doc node and its first child,
 * between paragraphs, etc.).
 *
 * A regular space typed by the user **does** produce text (" "), so it will
 * NOT be trimmed.
 */
const trimRange = (doc, from, to) => {
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

function addLinkRelationship({ editor, href }) {
  const target = href;
  const type = 'hyperlink';
  try {
    const id = insertNewRelationship(target, type, editor);
    return id;
  } catch {
    return null;
  }
}
