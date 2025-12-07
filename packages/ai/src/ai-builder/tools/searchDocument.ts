import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for searchDocument tool
 */
interface SearchDocumentParams {
  query: string;
  caseSensitive?: boolean;
  regex?: boolean;
  findAll?: boolean;
}

export default SearchDocumentParams

/**
 * Search result containing match information
 */
export interface SearchMatch {
  text: string;
  from: number;
  to: number;
}

/**
 * Tool for searching text in the document.
 * Returns positions of matches that can be used with other tools like replaceContent.
 *
 * @example
 * // Search for all occurrences of "privacy"
 * const result = await executeTool('searchDocument', {
 *   query: 'privacy',
 *   caseSensitive: false,
 *   findAll: true
 * }, editor);
 * // Returns: { matches: [{ text: 'privacy', from: 100, to: 107 }, ...] }
 *
 * // Then use with replaceContent:
 * await executeTool('replaceContent', {
 *   from: result.data.matches[0].from,
 *   to: result.data.matches[0].to,
 *   content: [{ type: 'paragraph', content: [{ type: 'text', text: 'confidentiality' }] }]
 * }, editor);
 */
export const searchDocument: SuperDocTool = {
  name: 'searchDocument',
  description:
    'Search for text or patterns in the document. Returns an array of matches with their positions (from/to character offsets). Use this before replaceContent to find exact positions to replace.',
  category: 'read',

  async execute(editor: Editor, params: SearchDocumentParams): Promise<ToolResult> {
    try {
      const { query, caseSensitive = false, regex = false, findAll = true } = params;

      if (!query) {
        return {
          success: false,
          error: 'Query parameter is required',
          docChanged: false,
        };
      }

      if (!editor.commands?.search) {
        return {
          success: false,
          error: 'Search command not available in editor',
          docChanged: false,
        };
      }

      let pattern: string | RegExp;
      if (regex) {
        try {
          pattern = new RegExp(query, caseSensitive ? '' : 'i');
        } catch (error) {
          return {
            success: false,
            error: `Invalid regular expression: ${error instanceof Error ? error.message : 'Unknown error'}`,
            docChanged: false,
          };
        }
      } else {
        pattern = query;
      }

      const rawMatches = editor.commands.search(pattern);

      if (!rawMatches || !Array.isArray(rawMatches)) {
        return {
          success: false,
          error: 'Search command returned invalid results',
          docChanged: false,
        };
      }

      const matches: SearchMatch[] = rawMatches.map((match) => ({
        text: match.text,
        from: match.from,
        to: match.to,
      }));

      let filteredMatches = matches;
      if (!regex && caseSensitive) {
        filteredMatches = matches.filter((match) => match.text === query);
      }

      const finalMatches = findAll ? filteredMatches : filteredMatches.slice(0, 1);

      return {
        success: true,
        data: {
          matches: finalMatches,
          count: finalMatches.length,
          query,
        },
        docChanged: false,
        message: `Found ${finalMatches.length} match(es) for "${query}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        docChanged: false,
      };
    }
  },
};
