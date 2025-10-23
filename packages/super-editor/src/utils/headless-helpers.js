/**
 * Determine if the node view should be skipped in headless mode.
 * @param {import('../core/Editor.js').Editor} editor - The editor instance.
 * @returns {boolean} - Whether the node view should be skipped.
 */
export const shouldSkipNodeView = (editor) => {
  return editor.options.isHeadless;
};
