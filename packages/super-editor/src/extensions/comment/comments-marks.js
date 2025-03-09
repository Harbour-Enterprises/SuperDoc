import { Mark, Attribute } from '@core/index.js';
import { CommentMarkName } from './comments-constants.js';

export const CommentsMark = Mark.create({
  name: CommentMarkName,

  group: 'comments',

  inclusive: false,

  addOptions() {
    return {
      htmlAttributes: { class: 'super-editor-comment' },
    };
  },

  addAttributes() {
    return {
    };
  },

  addAttributes() {
    return {
      commentId: {
        rendered: false,
      },
      importedId: {
        rendered: false,
      },
      internal: {
        default: true,
        rendered: false,
      },
    };
  },

  parseDOM() {
    return [{ tag: CommentMarkName }];
  },

  renderDOM({ htmlAttributes}) {
    return [CommentMarkName, Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes)];
  },
});
