/**
 * Creates the document to pass to EditorState.
 */

import type { Schema, Node as PmNode } from 'prosemirror-model';
import type { Editor } from '../Editor';

type Converter = {
  getSchema: (editor: Editor) => unknown;
};

export function createDocument(
  converter: Converter,
  schema: Schema,
  editor: Editor,
  { check = false }: { check?: boolean } = {},
): PmNode | null {
  const documentData = converter.getSchema(editor);

  if (documentData) {
    const documentNode = schema.nodeFromJSON(documentData);

    // for testing
    if (check) {
      documentNode.check();
    }

    return documentNode;
  }

  return schema.topNodeType.createAndFill();
}
