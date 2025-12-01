import { Node } from '@core/index.js';

/**
 * Configuration options for Text
 * @category Options
 */
export type TextOptions = Record<string, never>;

/**
 * @module Text
 * @sidebarTitle Text
 * @snippetPath /snippets/extensions/text.mdx
 */
export const Text = Node.create<TextOptions>({
  name: 'text',
  group: 'inline',
  inline: true,

  addOptions() {
    return {};
  },
});
