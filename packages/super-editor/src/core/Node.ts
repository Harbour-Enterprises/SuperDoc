import { getExtensionConfigField } from './helpers/getExtensionConfigField.js';
import { callOrGet } from './utilities/callOrGet.js';
import type { MaybeGetter } from './utilities/callOrGet.js';
import type { NodeType, ParseRule, DOMOutputSpec, Node as PmNode } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import type { NodeView, EditorView, Decoration, DecorationSource } from 'prosemirror-view';
import type { InputRule } from './InputRule.js';
import type { Editor } from './Editor.js';
import type { Command } from './types/ChainedCommands.js';
import type { AttributeSpec } from './Attribute.js';

/**
 * Configuration for Node extensions.
 */
export interface NodeConfig<
  Options extends Record<string, unknown> = Record<string, never>,
  Storage extends Record<string, unknown> = Record<string, never>,
> {
  /** The node name */
  name: string;

  /** The node group */
  group?: string;

  /** The node options */
  options?: Options;

  /** Whether the node is an atom node */
  atom?: boolean;

  /** Whether the node is draggable */
  draggable?: boolean;

  /** Whether the node is isolating */
  isolating?: boolean;

  /** Whether the node is defining */
  defining?: boolean;

  /** Whether the node is a top-level node */
  topNode?: boolean;

  /** The role of the node in a table */
  tableRole?: string;

  /** ProseMirror string for what content this node accepts */
  content?: MaybeGetter<string, []>;

  /** The marks applied to this node */
  marks?: string;

  /** Whether the node is an inline node */
  inline?: boolean;

  /** Whether the node is selectable */
  selectable?: boolean;

  /** The ProseMirror node type (set at runtime) */
  type?: NodeType;

  /** The editor instance (set at runtime) */
  editor?: Editor;

  /** The DOM parsing rules */
  parseDOM?: MaybeGetter<ParseRule[]>;

  /** The DOM rendering function - returns a DOMOutputSpec (allows mutable arrays for JS compatibility) */
  renderDOM?: MaybeGetter<DOMOutputSpec>;

  /** Function or object to add options to the node */
  addOptions?: MaybeGetter<Options>;

  /** Function or object to add storage to the node */
  addStorage?: MaybeGetter<Storage>;

  /** Function or object to add attributes to the node */
  addAttributes?: MaybeGetter<Record<string, Partial<AttributeSpec>>>;

  /** Function or object to add commands to the node */
  addCommands?: MaybeGetter<Record<string, Command>>;

  /** Function or object to add helpers to the node */
  addHelpers?: MaybeGetter<Record<string, (...args: unknown[]) => unknown>>;

  /** Function or object to add shortcuts to the node */
  addShortcuts?: MaybeGetter<Record<string, Command>>;

  /** Function or object to add input rules to the node */
  addInputRules?: MaybeGetter<InputRule[]>;

  /** Function to add a custom node view to the node */
  addNodeView?: MaybeGetter<
    (props: {
      node: PmNode;
      view: EditorView;
      getPos: () => number | undefined;
      decorations: readonly Decoration[];
      innerDecorations: DecorationSource;
    }) => NodeView | null
  >;

  /** Function to add ProseMirror plugins to the node */
  addPmPlugins?: MaybeGetter<Plugin[]>;

  /** Function to extend the ProseMirror node schema */
  extendNodeSchema?: MaybeGetter<Record<string, unknown>>;

  /** Additional config fields - use with caution */
  [key: string]: unknown;
}

/**
 * Node class is used to create Node extensions.
 * @template Options - Type for node options
 * @template Storage - Type for node storage
 */
export class Node<
  Options extends Record<string, unknown> = Record<string, never>,
  Storage extends Record<string, unknown> = Record<string, never>,
> {
  type: NodeType | string = 'node';

  name: string = 'node';

  options: Options;

  group: string | undefined;

  atom: boolean | undefined;

  editor: Editor | undefined;

  storage: Storage;

  config: NodeConfig<Options, Storage>;

  constructor(config: NodeConfig<Options, Storage>) {
    this.config = {
      ...config,
      name: config.name || this.name,
    };

    this.name = this.config.name;
    this.group = this.config.group;

    if (this.config.addOptions) {
      this.options = (callOrGet(
        getExtensionConfigField(this, 'addOptions', {
          name: this.name,
        }),
      ) || {}) as Options;
    } else {
      this.options = {} as Options;
    }

    this.storage = (callOrGet(
      getExtensionConfigField(this, 'addStorage', {
        name: this.name,
        options: this.options,
      }),
    ) || {}) as Storage;
  }

  /**
   * Factory method to construct a new Node extension.
   * @param config - The node configuration.
   * @returns A new Node instance.
   */
  static create<
    O extends Record<string, unknown> = Record<string, never>,
    S extends Record<string, unknown> = Record<string, never>,
  >(config: NodeConfig<O, S>): Node<O, S> {
    return new Node<O, S>(config);
  }
}
