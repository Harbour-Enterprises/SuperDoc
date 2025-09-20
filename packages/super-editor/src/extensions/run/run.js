// @ts-check
import { Attribute, OxmlNode } from '@core/index.js';
import { splitRun } from './commands/index.js';

/**
 * Run node emulates OOXML w:r (run) boundaries while remaining transparent to layout.
 * It carries run-level metadata (runProperties, rsid attributes) without affecting visual style.
 */
export const Run = OxmlNode.create({
  name: 'run',
  oXmlName: 'w:r',
  group: 'inline',
  inline: true,
  content: 'inline*',
  selectable: false,
  childToAttributes: ['runProperties'],

  addOptions() {
    return {
      htmlAttributes: {
        'data-run': '1',
      },
    };
  },

  addAttributes() {
    return {
      runProperties: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },
      rsidR: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },
      rsidRPr: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },
      rsidDel: {
        default: null,
        rendered: false,
        keepOnSplit: true,
      },
    };
  },

  addCommands() {
    return {
      splitRun,
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-run]' }];
  },

  renderDOM({ htmlAttributes }) {
    const base = Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes);
    return ['span', base, 0];
  },
});
