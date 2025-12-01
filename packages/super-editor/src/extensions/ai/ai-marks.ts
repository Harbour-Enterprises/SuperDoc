import { Mark, Attribute, type AttributeValue } from '@core/index.js';
import type { DOMOutputSpec } from 'prosemirror-model';
import { AiMarkName, AiAnimationMarkName } from './ai-constants.js';

export const AiMark = Mark.create({
  name: AiMarkName,

  group: 'ai',

  inclusive: false,

  excludeFromSummaryJSON: true,

  addOptions() {
    return {
      htmlAttributes: { class: 'sd-ai-highlight' },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: AiMarkName }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, unknown> }): DOMOutputSpec {
    return [
      AiMarkName,
      Attribute.mergeAttributes(
        (this.options as { htmlAttributes: Record<string, AttributeValue> }).htmlAttributes,
        htmlAttributes as Record<string, AttributeValue>,
      ),
    ];
  },
});

export const AiAnimationMark = Mark.create({
  name: AiAnimationMarkName,

  group: 'ai',

  inclusive: false,
  spanning: false,
  excludes: AiAnimationMarkName,

  excludeFromSummaryJSON: true,

  addOptions() {
    return {
      htmlAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        rendered: false,
      },
      class: {
        default: null,
        rendered: true,
      },
      dataMarkId: {
        default: null,
        rendered: true,
      },
    };
  },

  parseDOM() {
    return [{ tag: AiAnimationMarkName }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, unknown> }): DOMOutputSpec {
    return [
      AiAnimationMarkName,
      Attribute.mergeAttributes(
        (this.options as { htmlAttributes: Record<string, AttributeValue> }).htmlAttributes,
        htmlAttributes as Record<string, AttributeValue>,
      ),
    ];
  },
});
