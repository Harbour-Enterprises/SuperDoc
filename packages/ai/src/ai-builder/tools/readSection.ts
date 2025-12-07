import type { Node } from 'prosemirror-model';
import type { Editor } from '../../types';
import type { SuperDocTool, ToolResult } from '../types';

/**
 * Params for readSection tool
 */
export interface ReadSectionParams {
  heading?: string;
  from?: number;
  to?: number;
}

/**
 * Tool for reading a specific section of the document by heading name.
 * Use after getDocumentOutline to read content of a specific section.
 *
 * @example
 * // Read by heading name
 * const section = await executeTool('readSection', { heading: 'Introduction' }, editor);
 *
 * // Read by position (from outline)
 * const section = await executeTool('readSection', { from: 150, to: 450 }, editor);
 */
export const readSection: SuperDocTool = {
  name: 'readSection',
  description:
    'Read a specific section of the document by heading name or position range. Use heading parameter to find by name, or from/to for exact positions.',
  category: 'read',

  async execute(editor: Editor, params: ReadSectionParams): Promise<ToolResult> {
    try {
      const { heading, from, to } = params;
      const { state } = editor;

      if (!state) {
        return {
          success: false,
          error: 'Editor state not available',
          docChanged: false,
        };
      }

      const doc = state.doc;

      if (typeof from === 'number' && typeof to === 'number') {
        const clampedFrom = Math.max(0, Math.min(from, doc.content.size));
        const clampedTo = Math.max(clampedFrom, Math.min(to, doc.content.size));
        const content = doc.cut(clampedFrom, clampedTo);

        return {
          success: true,
          data: {
            from: clampedFrom,
            to: clampedTo,
            content: content.toJSON(),
          },
          docChanged: false,
          message: `Read section from position ${clampedFrom} to ${clampedTo}`,
        };
      }

      if (!heading) {
        return {
          success: false,
          error: 'Either "heading" or "from"/"to" parameters are required',
          docChanged: false,
        };
      }

      const searchTerm = heading.toLowerCase();
      let sectionStart: number | null = null;
      let sectionEnd: number | null = null;
      let foundHeadingLevel: number | null = null;
      let foundHeadingText: string | null = null;

      doc.descendants((node: Node, pos: number) => {
        if (node.type.name === 'paragraph') {
          const styleId = node.attrs?.styleId;
          if (styleId && typeof styleId === 'string') {
            const match = styleId.match(/^Heading(\d)$/i);
            if (match) {
              const level = parseInt(match[1], 10);
              let text = '';
              node.content.forEach((child: Node) => {
                if (child.isText) text += child.text;
              });

              if (sectionStart === null) {
                if (text.toLowerCase().includes(searchTerm)) {
                  sectionStart = pos;
                  foundHeadingLevel = level;
                  foundHeadingText = text.trim();
                }
              } else {
                if (level <= foundHeadingLevel!) {
                  sectionEnd = pos;
                  return false;
                }
              }
            }
          }
        }
        return true;
      });

      if (sectionStart === null) {
        return {
          success: false,
          error: `No heading found matching "${heading}"`,
          docChanged: false,
        };
      }

      const finalEnd = sectionEnd ?? doc.content.size;
      const content = doc.cut(sectionStart, finalEnd);

      return {
        success: true,
        data: {
          heading: foundHeadingText,
          from: sectionStart,
          to: finalEnd,
          content: content.toJSON(),
        },
        docChanged: false,
        message: `Read section "${foundHeadingText}" (positions ${sectionStart}-${finalEnd})`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read section',
        docChanged: false,
      };
    }
  },
};
