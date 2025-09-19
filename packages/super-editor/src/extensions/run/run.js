// @ts-check
import { Mark, Attribute } from '@core/index.js';

/**
 * Run mark emulates OOXML w:r (run) boundaries.
 * It can carry opaque run-level metadata without affecting visual style.
 */
export const Run = Mark.create({
  name: 'run',

  inclusive: false,

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      runProperties: {
        default: null,
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [
      {
        tag: 'span[data-run]',
      },
    ];
  },

  renderDOM({ htmlAttributes }) {
    const base = Attribute.mergeAttributes({ 'data-run': '1' }, this.options.htmlAttributes, htmlAttributes);
    return ['span', base, 0];
  },
});
