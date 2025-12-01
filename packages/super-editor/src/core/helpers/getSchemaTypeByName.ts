import type { NodeType, MarkType, Schema } from 'prosemirror-model';

/**
 * Get node or mark type by name.
 * @param name Node or mark name.
 * @param schema PM schema.
 * @returns Node or mark type or null.
 */
export function getSchemaTypeByName(name: string, schema: Schema): NodeType | MarkType | null {
  return schema.nodes[name] || schema.marks[name] || null;
}
