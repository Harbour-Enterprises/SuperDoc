import { DOMParser, Schema, Fragment, type Node as PmNode, type ParseOptions } from 'prosemirror-model';
import { htmlHandler } from '../InputRule.js';
import type { Editor } from '../Editor.js';

const removeWhitespaces = (node: Node): Node => {
  const children = node.childNodes;

  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];

    if (child.nodeType === 3 && child.nodeValue && /^(\n\s\s|\n)$/.test(child.nodeValue)) {
      node.removeChild(child);
    } else if (child.nodeType === 1) {
      removeWhitespaces(child);
    }
  }

  return node;
};

export function elementFromString(value: string, editor: Editor): HTMLElement {
  // add a wrapper to preserve leading and trailing whitespace
  const wrappedValue = `<body>${value}</body>`;
  const html = htmlHandler(wrappedValue, editor);

  return removeWhitespaces(html) as HTMLElement;
}

export interface CreateNodeFromContentOptions {
  slice?: boolean;
  parseOptions?: ParseOptions;
  errorOnInvalidContent?: boolean;
}

export function createNodeFromContent(
  content: string | Record<string, unknown> | Array<Record<string, unknown>>,
  editor: Editor,
  options: CreateNodeFromContentOptions = {},
): PmNode | Fragment {
  const schema = editor.schema;
  const resolvedOptions: CreateNodeFromContentOptions = {
    slice: true,
    parseOptions: {},
    ...options,
  };

  const isJSONContent = typeof content === 'object' && content !== null;
  const isTextContent = typeof content === 'string';

  if (isJSONContent) {
    try {
      const isArrayContent = Array.isArray(content) && content.length > 0;

      // if the JSON Content is an array of nodes, create a fragment for each node
      if (isArrayContent) {
        return Fragment.fromArray(content.map((item) => schema.nodeFromJSON(item)));
      }

      const node = schema.nodeFromJSON(content);

      if (resolvedOptions.errorOnInvalidContent) {
        node.check();
      }

      return node;
    } catch (error) {
      if (resolvedOptions.errorOnInvalidContent) {
        const err = new Error('[super-editor error]: Invalid JSON content');
        (err as unknown as { cause?: unknown }).cause = error;
        throw err;
      }

      console.warn('[super-editor warn]: Invalid content.', 'Passed value:', content, 'Error:', error);

      return createNodeFromContent('', editor, resolvedOptions);
    }
  }

  if (isTextContent) {
    // Check for invalid content
    if (resolvedOptions.errorOnInvalidContent) {
      let hasInvalidContent = false;
      let invalidContent = '';

      // A copy of the current schema with a catch-all node at the end
      const contentCheckSchema = new Schema({
        topNode: schema.spec.topNode,
        marks: schema.spec.marks,
        // Prosemirror's schemas are executed such that: the last to execute, matches last
        // This means that we can add a catch-all node at the end of the schema to catch any content that we don't know how to handle
        nodes: schema.spec.nodes.append({
          __supereditor__private__unknown__catch__all__node: {
            content: 'inline*',
            group: 'block',
            parseDOM: [
              {
                tag: '*',
                getAttrs: (e: unknown) => {
                  // If this is ever called, we know that the content has something that we don't know how to handle in the schema
                  hasInvalidContent = true;
                  // Try to stringify the element for a more helpful error message
                  invalidContent = typeof e === 'string' ? e : ((e as HTMLElement | null)?.outerHTML ?? String(e));
                  return null;
                },
              },
            ],
          },
        }),
      });

      if (resolvedOptions.slice) {
        DOMParser.fromSchema(contentCheckSchema).parseSlice(
          elementFromString(content, editor),
          resolvedOptions.parseOptions,
        );
      } else {
        DOMParser.fromSchema(contentCheckSchema).parse(
          elementFromString(content, editor),
          resolvedOptions.parseOptions,
        );
      }

      if (resolvedOptions.errorOnInvalidContent && hasInvalidContent) {
        const err = new Error('[super-editor error]: Invalid HTML content');
        (err as unknown as { cause?: unknown }).cause = new Error(`Invalid element found: ${invalidContent}`);
        throw err;
      }
    }

    const parser = DOMParser.fromSchema(schema);

    if (resolvedOptions.slice) {
      return parser.parseSlice(elementFromString(content, editor), resolvedOptions.parseOptions).content;
    }

    return parser.parse(elementFromString(content, editor), resolvedOptions.parseOptions);
  }

  return createNodeFromContent('', editor, resolvedOptions);
}
