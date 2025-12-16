import { Attribute, type AttributeValue, OxmlNode } from '@core/index.js';
import { splitRunToParagraph, splitRunAtCursor } from './commands/index.js';
import { cleanupEmptyRunsPlugin } from './cleanupEmptyRunsPlugin.js';
import { wrapTextInRunsPlugin } from './wrapTextInRunsPlugin.js';
import { splitRunsAfterMarkPlugin } from './splitRunsAfterMarkPlugin.js';
import { calculateInlineRunPropertiesPlugin } from './calculateInlineRunPropertiesPlugin.js';

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

  addCommands(): Record<string, (...args: unknown[]) => unknown> {
    return {
      splitRunToParagraph,
      splitRunAtCursor,
    };
  },

  parseDOM() {
    return [{ tag: 'span[data-run]' }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes?: Record<string, unknown> }) {
    const base = Attribute.mergeAttributes(
      this.options?.htmlAttributes ?? {},
      (htmlAttributes as Record<string, AttributeValue>) || {},
    );
    return ['span', base, 0];
  },
  addPmPlugins() {
    return [
      wrapTextInRunsPlugin(),
      splitRunsAfterMarkPlugin,
      calculateInlineRunPropertiesPlugin(this.editor),
      cleanupEmptyRunsPlugin,
    ];
  },
});
