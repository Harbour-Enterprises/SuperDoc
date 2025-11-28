import { Schema as PmSchema } from 'prosemirror-model';
import type {
  NodeSpec,
  MarkSpec,
  Node as PmNode,
  Mark as PmMark,
  DOMOutputSpec,
  ParseRule as PmParseRule,
} from 'prosemirror-model';
import { Attribute } from './Attribute.js';
import type { ExtensionAttribute } from './Attribute.js';
import { getExtensionConfigField } from './helpers/getExtensionConfigField.js';
import { cleanSchemaItem } from './helpers/cleanSchemaItem.js';
import { callOrGet } from './utilities/callOrGet.js';
import type { Editor } from './Editor.js';
import type { EditorExtension } from './types/EditorConfig.js';

/**
 * Extension context passed to schema configuration methods
 */
interface SchemaContext {
  name: string;
  options: Record<string, unknown>;
  storage: Record<string, unknown>;
  editor: Editor;
}

/**
 * Render DOM context for nodes
 */
interface RenderDOMContext {
  node: PmNode;
  htmlAttributes: Record<string, unknown>;
}

/**
 * Render DOM context for marks
 */
interface RenderMarkDOMContext {
  mark: PmMark;
  htmlAttributes: Record<string, unknown>;
}

/**
 * Node schema with OOXML metadata
 */
interface NodeSchemaWithMetadata extends NodeSpec {
  validChildren?: (() => string[]) | string[];
}

/**
 * Schema class is used to create and work with schema.
 */
export class Schema {
  /**
   * Creates PM schema by resolved extensions.
   * @param extensions List of extensions.
   * @param editor Editor instance.
   * @returns PM schema
   */
  static createSchemaByExtensions(extensions: EditorExtension[], editor: Editor): PmSchema {
    const nodeExtensions = extensions.filter((e) => e.type === 'node');
    const markExtensions = extensions.filter((e) => e.type === 'mark');
    const topNode = nodeExtensions.find((e) => getExtensionConfigField(e, 'topNode'))?.name;

    const attributes = Attribute.getAttributesFromExtensions(
      extensions as unknown as Array<{
        type: string;
        name: string;
        options: Record<string, unknown>;
        storage: Record<string, unknown>;
        config: Record<string, unknown>;
      }>,
    );
    const nodes = Schema.#createNodesSchema(nodeExtensions, attributes, editor);
    const marks = Schema.#createMarksSchema(markExtensions, attributes, editor);
    return new PmSchema({ topNode, nodes, marks });
  }

  /**
   * Creates nodes schema by Node extensions.
   * @param nodeExtensions Node extensions.
   * @param attributes List of all extension attributes.
   * @param editor Editor instance.
   * @returns Nodes schema.
   */
  static #createNodesSchema(
    nodeExtensions: EditorExtension[],
    attributes: ExtensionAttribute[],
    editor: Editor,
  ): Record<string, NodeSpec> {
    const nodeEntries = nodeExtensions.map((extension) => {
      const extensionAttributes = attributes.filter((a) => a.type === extension.name);

      const context: SchemaContext = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor,
      };

      const attrs: Record<string, { default: unknown }> = Object.fromEntries(
        extensionAttributes.map((attr) => {
          return [attr.name, { default: attr?.attribute?.default }];
        }),
      );

      const additionalNodeFields = nodeExtensions.reduce((fields, e) => {
        const extendNodeSchema = getExtensionConfigField(e, 'extendNodeSchema', context);
        return {
          ...fields,
          ...(typeof extendNodeSchema === 'function' ? extendNodeSchema(extension) : {}),
        };
      }, {});

      const schema: NodeSchemaWithMetadata = cleanSchemaItem({
        content: callOrGet(getExtensionConfigField(extension, 'content', context)),
        group: callOrGet(getExtensionConfigField(extension, 'group', context)),
        marks: callOrGet(getExtensionConfigField(extension, 'marks', context)),
        inline: callOrGet(getExtensionConfigField(extension, 'inline', context)),
        atom: callOrGet(getExtensionConfigField(extension, 'atom', context)),
        selectable: callOrGet(getExtensionConfigField(extension, 'selectable', context)),
        draggable: callOrGet(getExtensionConfigField(extension, 'draggable', context)),
        code: callOrGet(getExtensionConfigField(extension, 'code', context)),
        defining: callOrGet(getExtensionConfigField(extension, 'defining', context)),
        isolating: callOrGet(getExtensionConfigField(extension, 'isolating', context)),
        summary: getExtensionConfigField(extension, 'summary', context),
        attrs,
        ...additionalNodeFields,
      }) as NodeSchemaWithMetadata;

      // Attach OOXML metadata if the extension supports it
      const extensionWithValidChildren = extension as EditorExtension & { validChildren?: (() => string[]) | string[] };
      if (
        typeof extensionWithValidChildren.validChildren === 'function' ||
        Array.isArray(extensionWithValidChildren.validChildren)
      ) {
        Object.defineProperty(schema, 'validChildren', {
          enumerable: false,
          configurable: false,
          get: () => extensionWithValidChildren.validChildren,
        });
      }

      const parseDOM = callOrGet(getExtensionConfigField(extension, 'parseDOM', context)) as PmParseRule[] | undefined;
      if (parseDOM) {
        // Type assertion needed due to ProseMirror ParseRule type incompatibility
        schema.parseDOM = parseDOM.map((parseRule) => {
          return Attribute.insertExtensionAttrsToParseRule(parseRule, extensionAttributes);
        }) as unknown as typeof schema.parseDOM;
      }

      const renderDOM = getExtensionConfigField(extension, 'renderDOM', context) as
        | ((context: RenderDOMContext) => unknown)
        | undefined;
      if (renderDOM) {
        schema.toDOM = (node: PmNode) =>
          renderDOM({
            node,
            htmlAttributes: Attribute.getAttributesToRender(node, extensionAttributes),
          }) as DOMOutputSpec;
      }

      const renderText = getExtensionConfigField(extension, 'renderText', context) as
        | ((node: PmNode) => string)
        | undefined;
      if (renderText) {
        schema.toText = renderText;
      }

      return [extension.name, schema];
    });

    return Object.fromEntries(nodeEntries);
  }

  /**
   * Creates marks schema by Marks extensions.
   * @param markExtensions Marks extensions.
   * @param attributes List of all extension attributes.
   * @param editor Editor instance.
   * @returns Marks schema.
   */
  static #createMarksSchema(
    markExtensions: EditorExtension[],
    attributes: ExtensionAttribute[],
    editor: Editor,
  ): Record<string, MarkSpec> {
    const markEntries = markExtensions.map((extension) => {
      const extensionAttributes = attributes.filter((a) => a.type === extension.name);

      const context: SchemaContext = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor,
      };

      const attrs: Record<string, { default: unknown }> = Object.fromEntries(
        extensionAttributes.map((attr) => {
          return [attr.name, { default: attr?.attribute?.default }];
        }),
      );

      const schema: MarkSpec = cleanSchemaItem({
        group: callOrGet(getExtensionConfigField(extension, 'group', context)),
        inclusive: callOrGet(getExtensionConfigField(extension, 'inclusive', context)),
        excludes: callOrGet(getExtensionConfigField(extension, 'excludes', context)),
        spanning: callOrGet(getExtensionConfigField(extension, 'spanning', context)),
        code: callOrGet(getExtensionConfigField(extension, 'code', context)),
        attrs,
      }) as MarkSpec;

      const parseDOM = callOrGet(getExtensionConfigField(extension, 'parseDOM', context)) as PmParseRule[] | undefined;
      if (parseDOM) {
        // Type assertion needed due to ProseMirror ParseRule type incompatibility
        schema.parseDOM = parseDOM.map((parseRule) => {
          return Attribute.insertExtensionAttrsToParseRule(parseRule, extensionAttributes);
        }) as unknown as typeof schema.parseDOM;
      }
      const renderDOM = getExtensionConfigField(extension, 'renderDOM', context) as
        | ((context: RenderMarkDOMContext) => unknown)
        | undefined;
      if (renderDOM) {
        schema.toDOM = (mark: PmMark) =>
          renderDOM({
            mark,
            htmlAttributes: Attribute.getAttributesToRender(mark, extensionAttributes),
          }) as DOMOutputSpec;
      }

      return [extension.name, schema];
    });

    return Object.fromEntries(markEntries);
  }
}
