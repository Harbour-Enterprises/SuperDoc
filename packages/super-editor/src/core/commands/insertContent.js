//@ts-check
import { processContent } from '../helpers/contentProcessor.js';

export const insertContent =
  (value, options = {}) =>
  ({ tr, state, commands, editor }) => {
    // If contentType is specified, use the new processor
    if (options.contentType) {
      const validTypes = ['html', 'markdown', 'text', 'schema'];
      if (!validTypes.includes(options.contentType)) {
        console.error(`[insertContent] Invalid contentType: "${options.contentType}". Use: ${validTypes.join(', ')}`);
        return false;
      }

      try {
        const processedDoc = processContent({
          content: value,
          type: options.contentType,
          schema: state.schema,
          editor,
        });

        const jsonContent = processedDoc.toJSON();

        return commands.insertContentAt({ from: tr.selection.from, to: tr.selection.to }, jsonContent, options);
      } catch (error) {
        console.error(`[insertContent] Failed to process ${options.contentType}:`, error);
        return false;
      }
    }

    // Otherwise use the original behavior for backward compatibility
    return commands.insertContentAt({ from: tr.selection.from, to: tr.selection.to }, value, options);
  };
