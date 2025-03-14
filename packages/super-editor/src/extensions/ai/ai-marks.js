import { Mark, Attribute } from '@core/index.js';
import { AiMarkName } from './ai-constants.js';

export const AiMark = Mark.create({
  name: AiMarkName,

  group: 'ai',

  inclusive: false,

  addOptions() {
    return {
      htmlAttributes: { class: 'super-editor-ai' },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        rendered: false,
      }
    };
  },

  parseDOM() {
    return [{ tag: AiMarkName }];
  },

  renderDOM({ htmlAttributes }) {
    return [AiMarkName, Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },
}); 