import { Mark, Attribute } from '@core/index.js';
import type { DOMOutputSpec } from 'prosemirror-model';
import { CommentMarkName } from './comments-constants.js';

interface CommentsMarkOptions extends Record<string, unknown> {
  htmlAttributes: Record<string, string>;
}

export const CommentsMark = Mark.create<CommentsMarkOptions>({
  name: CommentMarkName,

  group: 'comments',

  excludes: '',

  addOptions() {
    return {
      htmlAttributes: { class: 'sd-editor-comment' },
    };
  },

  addAttributes() {
    return {
      commentId: {},
      importedId: {},
      internal: {
        default: true,
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: CommentMarkName }];
  },

  renderDOM({ htmlAttributes }: { htmlAttributes: Record<string, unknown> }): DOMOutputSpec {
    return [CommentMarkName, Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },
});
