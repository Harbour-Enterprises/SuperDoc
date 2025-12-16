import { keymap } from 'prosemirror-keymap';
import type { Plugin, Transaction } from 'prosemirror-state';
import type { NodeType, Node as PmNode, Mark as PmMark, MarkType } from 'prosemirror-model';
import { Schema } from './Schema.js';
import { Attribute } from './Attribute.js';
import { getNodeType } from './helpers/getNodeType.js';
import { getExtensionConfigField } from './helpers/getExtensionConfigField.js';
import { getSchemaTypeByName } from './helpers/getSchemaTypeByName.js';
import { callOrGet } from './utilities/callOrGet.js';
import { isExtensionRulesEnabled } from './helpers/isExtentionRulesEnabled.js';
import { inputRulesPlugin, InputRule } from './InputRule.js';
import type { Editor } from './Editor.js';
import type { EditorExtension } from './types/EditorConfig.js';
import type { Schema as PmSchema } from 'prosemirror-model';
import type { EventCallback } from './EventEmitter.js';

/**
 * Extension context passed to extension configuration methods
 */
interface ExtensionContext {
  name: string;
  options: Record<string, unknown>;
  storage: Record<string, unknown>;
  editor: Editor;
  type?: NodeType | MarkType | null;
}

/**
 * Resolved extension with priority and external flag
 * Extends EditorExtension to maintain type compatibility
 */
type ResolvedExtension = EditorExtension & {
  isExternal?: boolean;
};

/**
 * ExtensionService is the main class to work with extensions.
 */
export class ExtensionService {
  editor: Editor;

  schema: PmSchema;

  extensions: ResolvedExtension[];

  externalExtensions: ResolvedExtension[] = [];

  splittableMarks: string[] = [];

  constructor(extensions: EditorExtension[], userExtensions: EditorExtension[] | undefined, editor: Editor) {
    this.editor = editor;

    this.externalExtensions = userExtensions || [];

    this.externalExtensions = this.externalExtensions.map((extension) => {
      return {
        ...extension,
        isExternal: true,
      };
    });

    this.extensions = ExtensionService.getResolvedExtensions([...extensions, ...this.externalExtensions]);
    this.schema = Schema.createSchemaByExtensions(this.extensions, editor);
    this.#setupExtensions();
  }

  /**
   * Static method for creating ExtensionService.
   * @param args Arguments for the constructor.
   */
  static create(
    extensions: EditorExtension[],
    userExtensions: EditorExtension[] | undefined,
    editor: Editor,
  ): ExtensionService {
    return new ExtensionService(extensions, userExtensions, editor);
  }

  /**
   * Get an array of resolved extensions (e.g. sorted by priority).
   * @param extensions Array of extensions.
   * @returns Array of resolved extensions.
   */
  static getResolvedExtensions(extensions: EditorExtension[]): ResolvedExtension[] {
    const resolvedExtensions = ExtensionService.sortByPriority(extensions);
    return resolvedExtensions;
  }

  /**
   * Sort extensions by priority.
   * @param extensions Array of extensions.
   * @returns Array of sorted extensions by priority.
   */
  static sortByPriority(extensions: EditorExtension[]): ResolvedExtension[] {
    const defaultValue = 100;
    return extensions.sort((a, b) => {
      const priorityA = getExtensionConfigField(a, 'priority') || defaultValue;
      const priorityB = getExtensionConfigField(b, 'priority') || defaultValue;
      if (priorityA > priorityB) return -1;
      if (priorityA < priorityB) return 1;
      return 0;
    });
  }

  /**
   * Get all attributes defined in the extensions.
   * @returns Array of attributes.
   */
  get attributes(): ReturnType<typeof Attribute.getAttributesFromExtensions> {
    return Attribute.getAttributesFromExtensions(
      this.extensions as Array<{
        type: string;
        name: string;
        options: Record<string, unknown>;
        storage: Record<string, unknown>;
        config: Record<string, unknown>;
      }>,
    );
  }

  /**
   * Get all commands defined in the extensions.
   * @returns Object with commands (key - command name, value - function).
   */
  get commands(): Record<string, (...args: unknown[]) => (props: unknown) => boolean> {
    let commandsObject: Record<string, (...args: unknown[]) => (props: unknown) => boolean> = {};

    for (const extension of this.extensions) {
      const context: ExtensionContext = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor: this.editor,
        type: getSchemaTypeByName(extension.name, this.schema),
      };

      const addCommands = getExtensionConfigField(extension, 'addCommands', context);
      if (typeof addCommands === 'function') {
        const commands = addCommands();
        commandsObject = {
          ...commandsObject,
          ...(commands as Record<string, (...args: unknown[]) => (props: unknown) => boolean>),
        };
      }
    }

    return commandsObject;
  }

  /**
   * Get all helper methods defined in the extensions.
   * Each extension can define its own helper methods.
   * Example: editor.helpers.linkedStyles.getStyles()
   * @returns Object with helper methods for extensions.
   */
  get helpers(): Record<string, Record<string, unknown>> {
    const helpersObject: Record<string, Record<string, unknown>> = {};

    for (const extension of this.extensions) {
      const name = extension.name;
      if (!name) continue;

      const context: ExtensionContext = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor: this.editor,
        type: getSchemaTypeByName(extension.name, this.schema),
      };

      const addHelpers = getExtensionConfigField(extension, 'addHelpers', context);

      if (typeof addHelpers === 'function') {
        const helpers = addHelpers();
        helpersObject[name] = helpers as Record<string, unknown>;
      }
    }

    return helpersObject;
  }

  /**
   * Get all PM plugins defined in the extensions.
   * And also keyboard shortcuts.
   * @returns Array of PM plugins.
   */
  get plugins(): Plugin[] {
    const editor = this.editor;
    const extensions = ExtensionService.sortByPriority([...this.extensions].reverse());

    const inputRules: InputRule[] = [];

    const allPlugins = extensions
      .map((extension) => {
        const context: ExtensionContext = {
          name: extension.name,
          options: extension.options,
          storage: extension.storage,
          editor,
          type: getSchemaTypeByName(extension.name, this.schema),
        };

        const plugins: Plugin[] = [];

        const addShortcuts = getExtensionConfigField(extension, 'addShortcuts', context);

        const bindingsObject: Record<string, (...args: unknown[]) => boolean> = {};

        if (typeof addShortcuts === 'function') {
          const shortcuts = addShortcuts() as Record<
            string,
            (props: { editor: Editor; keymapArgs: unknown[] }) => boolean
          >;
          Object.entries(shortcuts).forEach(([shortcut, method]) => {
            bindingsObject[shortcut] = (...args: unknown[]) => method({ editor, keymapArgs: args });
          });
        }

        plugins.push(keymap(bindingsObject));

        const addInputRules = getExtensionConfigField(extension, 'addInputRules', context);

        if (
          isExtensionRulesEnabled(extension, editor.options.enableInputRules ?? false) &&
          typeof addInputRules === 'function'
        ) {
          const rules = addInputRules() as InputRule[];
          inputRules.push(...rules);
        }

        const addPmPlugins = getExtensionConfigField(extension, 'addPmPlugins', context);

        if (typeof addPmPlugins === 'function') {
          const pmPlugins = addPmPlugins() as Plugin[];
          plugins.push(...pmPlugins);
        }

        return plugins;
      })
      .flat();

    return [
      inputRulesPlugin({
        editor,
        rules: inputRules,
      }),
      ...allPlugins,
    ];
  }

  /**
   * Get all node views from the extensions.
   * @returns An object with all node views.
   */
  get nodeViews(): Record<string, (node: unknown, view: unknown, getPos: unknown, decorations: unknown) => unknown> {
    const { editor } = this;
    const nodeExtensions = this.extensions.filter((e) => e.type === 'node');

    const entries: Array<[string, (node: unknown, view: unknown, getPos: unknown, decorations: unknown) => unknown]> =
      [];

    for (const extension of nodeExtensions) {
      const hasNodeView = getExtensionConfigField(extension, 'addNodeView');
      if (!hasNodeView) continue;

      const extensionAttrs = this.attributes.filter((a) => a.type === extension.name);
      const context: ExtensionContext = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor,
        type: getNodeType(extension.name, this.schema),
      };

      const addNodeView = getExtensionConfigField(extension, 'addNodeView', context);

      if (typeof addNodeView !== 'function') continue;

      // Call addNodeView() to get the actual node view function
      // It may return null in headless mode or other scenarios
      const nodeViewFunction = addNodeView() as
        | ((props: {
            editor: Editor;
            node: unknown;
            getPos: unknown;
            decorations: unknown;
            htmlAttributes: Record<string, unknown>;
            extension: ResolvedExtension;
            extensionAttrs: ReturnType<typeof Attribute.getAttributesFromExtensions>;
          }) => unknown)
        | null;

      if (!nodeViewFunction) continue;

      const nodeview = (node: unknown, _view: unknown, getPos: unknown, decorations: unknown) => {
        const htmlAttributes = Attribute.getAttributesToRender(node as PmNode | PmMark, extensionAttrs);
        return nodeViewFunction({
          editor,
          node,
          getPos,
          decorations,
          htmlAttributes,
          extension,
          extensionAttrs,
        });
      };

      entries.push([extension.name, nodeview]);
    }

    return Object.fromEntries(entries);
  }

  /**
   * Install all extensions.
   * Create extension storage in the editor, attach editor events.
   */
  #setupExtensions(): void {
    for (const extension of this.extensions) {
      this.editor.extensionStorage[extension.name] = extension.storage;

      const context: ExtensionContext = {
        name: extension.name,
        options: extension.options,
        storage: extension.storage,
        editor: this.editor,
        type: getSchemaTypeByName(extension.name, this.schema),
      };

      if (extension.type === 'mark') {
        const keepOnSplitValue = callOrGet(getExtensionConfigField(extension, 'keepOnSplit', context));
        const keepOnSplit = typeof keepOnSplitValue === 'boolean' ? keepOnSplitValue : true;
        if (keepOnSplit) {
          this.splittableMarks.push(extension.name);
        }
      }

      this.#attachEditorEvents(extension);
    }
  }

  /**
   * Attach editor events to extension
   * if callbacks are defined in the extension config.
   * @param extension Extension.
   */
  #attachEditorEvents(extension: ResolvedExtension): void {
    const context: ExtensionContext = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      editor: this.editor,
      type: getSchemaTypeByName(extension.name, this.schema),
    };

    const onBeforeCreate = getExtensionConfigField(extension, 'onBeforeCreate', context);
    const onCreate = getExtensionConfigField(extension, 'onCreate', context);
    const onUpdate = getExtensionConfigField(extension, 'onUpdate', context);
    const onSelectionUpdate = getExtensionConfigField(extension, 'onSelectionUpdate', context);
    const onTransaction = getExtensionConfigField(extension, 'onTransaction', context);
    const onFocus = getExtensionConfigField(extension, 'onFocus', context);
    const onBlur = getExtensionConfigField(extension, 'onBlur', context);
    const onDestroy = getExtensionConfigField(extension, 'onDestroy', context);

    if (typeof onBeforeCreate === 'function') {
      this.editor.on('beforeCreate', onBeforeCreate as EventCallback<[{ editor: Editor }]>);
    }
    if (typeof onCreate === 'function') {
      this.editor.on('create', onCreate as EventCallback<[{ editor: Editor }]>);
    }
    if (typeof onUpdate === 'function') {
      this.editor.on('update', onUpdate as EventCallback<[{ editor: Editor; transaction: Transaction }]>);
    }
    if (typeof onSelectionUpdate === 'function') {
      this.editor.on(
        'selectionUpdate',
        onSelectionUpdate as EventCallback<[{ editor: Editor; transaction: Transaction }]>,
      );
    }
    if (typeof onTransaction === 'function') {
      this.editor.on(
        'transaction',
        onTransaction as EventCallback<[{ editor: Editor; transaction: Transaction; duration?: number }]>,
      );
    }
    if (typeof onFocus === 'function') {
      this.editor.on(
        'focus',
        onFocus as EventCallback<[{ editor: Editor; event: FocusEvent; transaction: Transaction }]>,
      );
    }
    if (typeof onBlur === 'function') {
      this.editor.on(
        'blur',
        onBlur as EventCallback<[{ editor: Editor; event: FocusEvent; transaction: Transaction }]>,
      );
    }
    if (typeof onDestroy === 'function') {
      this.editor.on('destroy', onDestroy as EventCallback<[]>);
    }
  }
}
