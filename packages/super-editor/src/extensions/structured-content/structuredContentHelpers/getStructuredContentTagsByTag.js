import { findChildren } from '@core/helpers/findChildren';

/**
 * Get structured content tag(s) by tag value
 * @category Helper
 * @param {string | string[]} tagOrTags Single tag or array of tags to find
 * @param {import('prosemirror-state').EditorState} state Editor state
 * @returns {Array<{ node: import('prosemirror-model').Node, pos: number }>} Matching structured content nodes
 * @example
 * const fields = editor.helpers.getStructuredContentTagsByTag('customer-info', editor.state)
 * if (fields.length) console.log('Found', fields.length, 'fields with tag customer-info')
 */
export function getStructuredContentTagsByTag(tagOrTags, state) {
  const result = findChildren(state.doc, (node) => {
    const isStructuredContent = ['structuredContent', 'structuredContentBlock'].includes(node.type.name);
    if (Array.isArray(tagOrTags)) {
      return isStructuredContent && tagOrTags.includes(node.attrs.tag);
    } else {
      return isStructuredContent && node.attrs.tag === tagOrTags;
    }
  });
  return result;
}
