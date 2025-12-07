import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';
import { enrichParagraphNodes } from '../helpers/enrichContent';

/**
 * Params for replaceContent tool
 */
export interface ReplaceContentParams {
  query?: string;
  from?: number;
  to?: number;
  content: any[];
  replaceAll?: boolean;
}

/**
 * Tool for replacing content in a specific range of the document.
 * Removes content from 'from' to 'to' positions and inserts new content.
 */
export const replaceContent: SuperDocTool = {
  name: 'replaceContent',
  description:
    'Replace content in the document. Either provide a query to search and replace text, or specify exact from/to positions.',
  category: 'write',

  async execute(editor: Editor, params: ReplaceContentParams): Promise<ToolResult> {
    try {
      const { query, from, to, content, replaceAll = false } = params;

      if (!content || !Array.isArray(content)) {
        return {
          success: false,
          error: 'Content must be an array of nodes',
          docChanged: false,
        };
      }

      const { state } = editor;
      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      const enrichedContent = enrichParagraphNodes(content);
      if (query) {
        if (!editor.commands?.search) {
          return {
            success: false,
            error: 'Search command not available in editor',
            docChanged: false,
          };
        }

        const matches = editor.commands.search(query);
        if (!matches || !Array.isArray(matches) || matches.length === 0) {
          return {
            success: false,
            error: `No matches found for "${query}"`,
            docChanged: false,
          };
        }

        let inlineContent = enrichedContent;
        if (
          enrichedContent.length === 1 &&
          enrichedContent[0].type === 'paragraph' &&
          Array.isArray(enrichedContent[0].content)
        ) {
          // Extract just the inline content (text nodes) from the paragraph
          inlineContent = enrichedContent[0].content;
        }

        // Replace matches (in reverse order to maintain positions)
        const matchesToReplace = replaceAll ? [...matches].reverse() : [matches[0]];
        let replacedCount = 0;

        for (const match of matchesToReplace) {
          const success = editor.commands.insertContentAt({ from: match.from, to: match.to }, inlineContent);
          if (success) replacedCount++;
        }

        return {
          success: replacedCount > 0,
          data: {
            replacedCount,
            totalMatches: matches.length,
            query,
          },
          docChanged: replacedCount > 0,
          message: `Replaced ${replacedCount} of ${matches.length} occurrence(s) of "${query}"`,
        };
      }

      if (typeof from !== 'number' || typeof to !== 'number') {
        return {
          success: false,
          error: 'Either query or from/to positions must be provided',
          docChanged: false,
        };
      }

      if (from < 0 || to < from) {
        return {
          success: false,
          error: 'Invalid range: from must be >= 0 and to must be >= from',
          docChanged: false,
        };
      }

      const docSize = state.doc.content.size;
      const validFrom = Math.max(0, Math.min(from, docSize));
      const validTo = Math.max(0, Math.min(to, docSize));

      if (validFrom === 0 && validTo === docSize) {
        const success = editor.commands.setContent({ type: 'doc', content: enrichedContent });

        return {
          success,
          data: { replacedRange: { from: validFrom, to: validTo } },
          docChanged: success,
          message: success ? 'Replaced entire document' : 'Failed to replace document',
        };
      }

      const success = editor.commands.insertContentAt(
        { from: validFrom, to: validTo },
        { type: 'doc', content: enrichedContent },
      );

      if (!success) {
        return {
          success: false,
          error: 'Failed to replace content',
          docChanged: false,
        };
      }

      return {
        success: true,
        data: { replacedRange: { from: validFrom, to: validTo } },
        docChanged: true,
        message: `Replaced content from position ${validFrom} to ${validTo}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        docChanged: false,
      };
    }
  },
};
