import { Extension } from '@core/index.js';
import { getMarksFromSelection } from '@core/helpers/getMarksFromSelection.js';
import { toggleMarkCascade } from '@core/commands/toggleMarkCascade.js';
import type { Mark } from '@tiptap/pm/model';

/**
 * Stored format style
 */
export interface StoredStyle {
  /**
   * Mark name
   */
  name: string;
  /**
   * Mark attributes
   */
  attrs: Record<string, unknown>;
}

/**
 * Configuration options for FormatCommands
 * @category Options
 */
export type FormatCommandsOptions = Record<string, never>;

/**
 * Storage for FormatCommands
 */
export interface FormatCommandsStorage extends Record<string, unknown> {
  /**
   * @private
   */
  storedStyle: Mark[] | null;
}

/**
 * @module FormatCommands
 * @sidebarTitle Format Commands
 * @snippetPath /snippets/extensions/format-commands.mdx
 * @shortcut Mod-Alt-c | clearFormat | Clear all formatting
 */
export const FormatCommands = Extension.create<FormatCommandsOptions, FormatCommandsStorage>({
  name: 'formatCommands',

  addOptions() {
    return {};
  },

  addStorage() {
    return {
      storedStyle: null,
    };
  },

  addCommands() {
    return {
      toggleMarkCascade,
      /**
       * Clear all formatting (nodes and marks)
       * @category Command
       * @example
       * editor.commands.clearFormat()
       * @note Removes all marks and resets nodes to default paragraph
       */
      clearFormat:
        () =>
        ({ chain }: { chain: () => { clearNodes: () => { unsetAllMarks: () => { run: () => boolean } } } }) => {
          return chain().clearNodes().unsetAllMarks().run();
        },

      /**
       * Clear only mark formatting
       * @category Command
       * @example
       * editor.commands.clearMarksFormat()
       * @note Removes bold, italic, underline, colors, etc. but preserves block structure
       */
      clearMarksFormat:
        () =>
        ({ chain }: { chain: () => { unsetAllMarks: () => { run: () => boolean } } }) => {
          return chain().unsetAllMarks().run();
        },

      /**
       * Clear only node formatting
       * @category Command
       * @example
       * editor.commands.clearNodesFormat()
       * @note Converts headings, lists, etc. to paragraphs but preserves text marks
       */
      clearNodesFormat:
        () =>
        ({ chain }: { chain: () => { clearNodes: () => { run: () => boolean } } }) => {
          return chain().clearNodes().run();
        },

      /**
       * Copy format from selection or apply copied format
       * @category Command
       * @example
       * editor.commands.copyFormat()
       * @note Works like format painter - first click copies, second click applies
       */
      copyFormat:
        () =>
        ({ chain }: { chain: () => Record<string, (...args: unknown[]) => unknown> }) => {
          if (!this.editor) return false;
          // If we don't have a saved style, save the current one
          const storedMarks = this.storage.storedStyle;
          if (!storedMarks) {
            const marks = getMarksFromSelection(this.editor.state);
            this.storage.storedStyle = marks;
            return true;
          }

          // Special case: if there are no stored marks, but this is still an apply action
          // We just clear the format
          if (!storedMarks.length) {
            this.storage.storedStyle = null;
            const chainObj = chain() as { clearFormat?: () => { run?: () => boolean } };
            const res = chainObj.clearFormat?.();
            const run = res?.run;
            return typeof run === 'function' ? run.call(res) : true;
          }

          // If we do have a stored style, apply it
          const processedMarks: StoredStyle[] = [];
          storedMarks.forEach((mark) => {
            const { type, attrs } = mark;
            const { name } = type;

            if (name === 'textStyle') {
              Object.keys(attrs).forEach((key) => {
                if (!attrs[key]) return;
                const attributes: Record<string, unknown> = {};
                attributes[key] = attrs[key];
                processedMarks.push({ name: key, attrs: attributes });
              });
            } else {
              processedMarks.push({ name, attrs });
            }
          });

          const marksToCommands: Record<string, [string, string, unknown?]> = {
            bold: ['setBold', 'unsetBold'],
            italic: ['setItalic', 'unsetItalic'],
            underline: ['setUnderline', 'unsetUnderline'],
            color: ['setColor', 'setColor', null],
            fontSize: ['setFontSize', 'unsetFontSize'],
            fontFamily: ['setFontFamily', 'unsetFontFamily'],
          };

          // Apply marks present, clear ones that are not, by chaining commands
          let result = chain() as Record<string, (...args: unknown[]) => unknown>;
          Object.keys(marksToCommands).forEach((key) => {
            const [setCommand, unsetCommand, defaultParam] = marksToCommands[key];
            const markToApply = processedMarks.find((mark) => mark.name === key);
            const hasEmptyAttrs = markToApply?.attrs && markToApply?.attrs[key];

            let cmd: { command: string; argument: unknown };
            if (!markToApply && !hasEmptyAttrs) cmd = { command: unsetCommand, argument: defaultParam };
            else cmd = { command: setCommand, argument: markToApply?.attrs[key] || defaultParam };
            const commandFn = result[cmd.command];
            if (typeof commandFn === 'function') {
              result = commandFn.call(result, cmd.argument) as typeof result;
            }
          });

          this.storage.storedStyle = null;
          const run = (result as unknown as { run?: () => boolean }).run;
          return typeof run === 'function' ? run.call(result) : true;
        },
    };
  },

  addShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor?.commands.clearFormat() ?? false,
    };
  },
});
