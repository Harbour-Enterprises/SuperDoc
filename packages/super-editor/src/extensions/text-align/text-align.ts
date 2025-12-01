import { Extension } from '@core/index.js';
import type { Command, CommandProps } from '@core/types/ChainedCommands.js';
import type { Editor } from '@core/Editor.js';

/**
 * Configuration options for TextAlign
 * @category Options
 */
export interface TextAlignOptions extends Record<string, unknown> {
  /**
   * Available alignment options
   * @default ['left', 'center', 'right', 'justify']
   */
  alignments: string[];
}

/**
 * @module TextAlign
 * @sidebarTitle Text Align
 * @snippetPath /snippets/extensions/text-align.mdx
 * @shortcut Mod-Shift-l | setTextAlign('left') | Align text left
 * @shortcut Mod-Shift-e | setTextAlign('center') | Align text center
 * @shortcut Mod-Shift-r | setTextAlign('right') | Align text right
 * @shortcut Mod-Shift-j | setTextAlign('justify') | Justify text
 */
export const TextAlign = Extension.create<TextAlignOptions>({
  name: 'textAlign',

  addOptions() {
    return {
      alignments: ['left', 'center', 'right', 'justify'],
    };
  },

  addCommands() {
    return {
      /**
       * Set text alignment
       * @category Command
       * @param {string} alignment - Alignment value (left, center, right, justify)
       * @example
       * editor.commands.setTextAlign('center')
       * editor.commands.setTextAlign('justify')
       */
      setTextAlign:
        (alignment: string): Command =>
        ({ commands }: CommandProps) => {
          const cmds = commands as unknown as {
            updateAttributes?: (type: string, attrs: Record<string, unknown>) => boolean;
          };
          const alignments = (this.options as TextAlignOptions).alignments ?? [];
          const containsAlignment = Array.isArray(alignments) && alignments.includes(alignment);
          if (!containsAlignment) return false;

          return Boolean(cmds.updateAttributes?.('paragraph', { 'paragraphProperties.justification': alignment }));
        },

      /**
       * Remove text alignment (reset to default)
       * @category Command
       * @example
       * editor.commands.unsetTextAlign()
       * @note Resets alignment to the default value
       */
      unsetTextAlign:
        (): Command =>
        ({ commands }: CommandProps) => {
          const cmds = commands as unknown as { resetAttributes?: (type: string, attr: string) => boolean };
          return Boolean(cmds.resetAttributes?.('paragraph', 'paragraphProperties.justification'));
        },
    };
  },

  addShortcuts() {
    const editor = (this as unknown as { editor?: Editor }).editor;
    return {
      'Mod-Shift-l': () => editor?.commands?.setTextAlign('left') ?? false,
      'Mod-Shift-e': () => editor?.commands?.setTextAlign('center') ?? false,
      'Mod-Shift-r': () => editor?.commands?.setTextAlign('right') ?? false,
      'Mod-Shift-j': () => editor?.commands?.setTextAlign('justify') ?? false,
    };
  },
});
