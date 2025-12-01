/**
 * Gets the default block type at a given match.
 *
 * https://github.com/ProseMirror/prosemirror-commands/blob/master/src/commands.ts#L297
 */
import type { ContentMatch, NodeType } from 'prosemirror-model';

export function defaultBlockAt(match: ContentMatch): NodeType | null {
  for (let i = 0; i < match.edgeCount; i++) {
    const { type } = match.edge(i);
    if (type.isTextblock && !type.hasRequiredAttrs()) return type;
  }
  return null;
}
