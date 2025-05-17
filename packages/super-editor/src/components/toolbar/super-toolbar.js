import EventEmitter from 'eventemitter3';
import { createApp, h } from 'vue';
import { undoDepth, redoDepth } from 'prosemirror-history';
import { TextSelection } from 'prosemirror-state';
import { makeDefaultItems } from './defaultItems';
import { getActiveFormatting } from '@core/helpers/getActiveFormatting.js';
import { vClickOutside } from '@harbour-enterprises/common';
import Toolbar from './Toolbar.vue';
import { startImageUpload, getFileOpener } from '../../extensions/image/imageHelpers/index.js';
import { findParentNode } from '@helpers/index.js';
import { toolbarIcons } from './toolbarIcons.js';
import { getQuickFormatList } from '@extensions/linked-styles/linked-styles.js';
import { getAvailableColorOptions, makeColorOption, renderColorOptions } from './color-dropdown-helpers.js';
import { isInTable } from '@helpers/isInTable.js';

/**
 * @typedef {Object} ToolbarConfig
 * @property {string} [selector] - CSS selector for the toolbar container
 * @property {string[]} [toolbarGroups=['left', 'center', 'right']] - Groups to organize toolbar items
 * @property {string} [role='editor'] - Role of the toolbar ('editor' or 'viewer')
 * @property {boolean} [pagination=false] - Whether pagination is enabled
 * @property {Object} [icons] - Custom icons for toolbar items
 * @property {string} [mode='docx'] - Editor mode
 * @property {string[]} [excludeItems=[]] - Items to exclude from the toolbar
 * @property {Object} [groups=null] - Custom groups configuration
 * @property {Object} [editor=null] - The editor instance
 * @property {string} [aiApiKey=null] - API key for AI integration
 * @property {string} [aiEndpoint=null] - Endpoint for AI integration
 */

/**
 * @typedef {Object} ToolbarItem
 * @property {Object} name - The name of the toolbar item
 * @property {string} name.value - The value of the name
 * @property {Object} group - The group the item belongs to
 * @property {string} group.value - The value of the group
 * @property {Object} selectedValue - The selected value for the item
 * @property {*} selectedValue.value - The value of the selected value
 * @property {Object} disabled - Whether the item is disabled
 * @property {boolean} disabled.value - The value of disabled
 * @property {Object} allowWithoutEditor - Whether the item can be used without an editor
 * @property {boolean} allowWithoutEditor.value - The value of allowWithoutEditor
 * @property {Object} defaultLabel - The default label for the item
 * @property {*} defaultLabel.value - The value of the default label
 * @property {Object} nestedOptions - Nested options for the item
 * @property {Array} nestedOptions.value - The array of nested options
 * @property {string} command - The command to execute
 * @property {string} [noArgumentCommand] - The command to execute when no argument is provided
 * @property {Function} activate - Function to activate the item
 * @property {Function} deactivate - Function to deactivate the item
 * @property {Function} setDisabled - Function to set the disabled state
 * @property {Function} resetDisabled - Function to reset the disabled state
 */

/**
 * @typedef {Object} CommandItem
 * @property {ToolbarItem} item - The toolbar item
 * @property {*} [argument] - The argument to pass to the command
 */

/**
 * A customizable toolbar for the Super Editor
 * @class
 * @extends EventEmitter
 */
export class SuperToolbar extends EventEmitter {
  /**
   * Default configuration for the toolbar
   * @type {ToolbarConfig}
   */
  config = {
    selector: null,
    toolbarGroups: ['left', 'center', 'right'],
    role: 'editor',
    pagination: false,
    icons: { ...toolbarIcons },
    mode: 'docx',
    excludeItems: [],
    groups: null,
    editor: null,
    aiApiKey: null,
    aiEndpoint: null,
  };

  /**
   * Creates a new SuperToolbar instance
   * @param {ToolbarConfig} config - The configuration for the toolbar
   * @returns {void}
   */
  constructor(config) {
    super();

    this.config = { ...this.config, ...config };
    this.toolbarItems = [];
    this.overflowItems = [];
    this.documentMode = config.documentMode || 'editing';
    this.isDev = config.isDev || false;
    this.superdoc = config.superdoc;
    this.role = config.role || 'editor';

    if (this.config.editor) this.config.mode = this.config.editor.options.mode;
    this.config.icons = {
      ...toolbarIcons,
      ...config.icons,
    };

    // Move legacy 'element' to 'selector'
    if (!this.config.selector && this.config.element) this.config.selector = this.config.element;
    this.#initToolbarGroups();

    this.#makeToolbarItems(this, this.config.icons, config.isDev);

    let el = null;
    if (this.config.selector) {
      if (this.config.selector.startsWith('#') || this.config.selector.startsWith('.')) {
        el = document.querySelector(this.config.selector);
      } else {
        el = document.getElementById(this.config.selector);
      };

      if (!el) {
        console.warn(`[super-toolbar 🎨] Element not found: ${this.config.selector}`);
        return;
      }
    }

    this.app = createApp(Toolbar);
    this.app.directive('click-outside', vClickOutside);
    this.app.config.globalProperties.$toolbar = this;
    if (el) this.toolbar = this.app.mount(el);
    this.activeEditor = config.editor || null;
    this.updateToolbarState();
  }

  /**
  * Initiate toolbar groups
  * @private
  * @returns {void}
  */
  #initToolbarGroups() {
    // If groups is configured, override toolbarGroups
    if (this.config.groups && !Array.isArray(this.config.groups) && Object.keys(this.config.groups).length) {
      this.config.toolbarGroups = Object.keys(this.config.groups);
    }
  }

  /**
   * Custom commands that override default behavior
   * @private
   * @type {Object.<string, function(CommandItem): void>}
   */
  #interceptedCommands = {
    /**
     * Handles zoom level changes
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {string|number} params.argument - The zoom level (percentage)
     * @returns {void}
     */
    setZoom: ({ item, argument }) => {
      // Currently only set up to work with full SuperDoc
      if (!argument) return;
      item.onActivate({ zoom: argument });

      this.emit('superdoc-command', { item, argument });
      const layers = document.querySelector(this.superdoc.config.selector)?.querySelector('.layers');
      if (!layers) return;

      const isMobileDevice = typeof screen.orientation !== 'undefined';
      // 768px breakpoint doesn't consider iPad in portrait orientation
      const isSmallScreen = window.matchMedia('(max-width: 834px)').matches;

      // Zoom property doesn't work correctly when testing on mobile devices
      if (isMobileDevice && isSmallScreen) {
        layers.style.transformOrigin = '0 0';
        layers.style.transform = `scale(${parseInt(argument) / 100})`;
      } else {
        layers.style.zoom = parseInt(argument) / 100;
      }

      this.superdoc.superdocStore.activeZoom = parseInt(argument);
    },

    /**
     * Sets the document mode
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {string} params.argument - The document mode to set
     * @returns {void}
     */
    setDocumentMode: ({ item, argument }) => {
      if (!argument) return;

      this.emit('superdoc-command', { item, argument });
    },

    /**
     * Sets the font size for text
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {string|number} params.argument - The font size to set
     * @returns {void}
     */
    setFontSize: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument }, () => {
        this.activeEditor?.commands.setFieldAnnotationsFontSize(argument, true);
      });
    },

    /**
     * Sets the font family for text
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {string} params.argument - The font family to set
     * @returns {void}
     */
    setFontFamily: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument }, () => {
        this.activeEditor?.commands.setFieldAnnotationsFontFamily(argument, true);
      });
    },

    /**
     * Sets the text color
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {string} params.argument - The color to set
     * @returns {void}
     */
    setColor: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument });
    },

    /**
     * Sets the highlight color for text
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {string} params.argument - The highlight color to set
     * @returns {void}
     */
    setHighlight: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument });
    },

    /**
     * Toggles the ruler visibility
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Not used
     * @returns {void}
     */
    toggleRuler: ({ item, argument }) => {
      this.superdoc.toggleRuler();
    },

    /**
     * Initiates the image upload process
     * @async
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Not used
     * @returns {Promise<void>}
     */
    startImageUpload: async ({ item, argument }) => {
      let open = getFileOpener();
      let result = await open();

      if (!result?.file) {
        return;
      }

      startImageUpload({
        editor: this.activeEditor,
        view: this.activeEditor.view,
        file: result.file,
      });
    },

    /**
     * Increases text indentation or list level
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Command arguments
     * @returns {void}
     */
    increaseTextIndent: ({ item, argument }) => {
      let command = item.command;
      let { state } = this.activeEditor;
      let listItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);

      if (listItem) {
        return this.activeEditor.commands.increaseListIndent();
      }

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
      }
    },

    /**
     * Decreases text indentation or list level
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Command arguments
     * @returns {boolean}
     */
    decreaseTextIndent: ({ item, argument }) => {
      let command = item.command;
      let { state } = this.activeEditor;
      let listItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);

      if (listItem) {
        return this.activeEditor.commands.decreaseListIndent();
      }

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
      }
    },

    /**
     * Toggles bold formatting for text
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Command arguments
     * @returns {void}
     */
    toggleBold: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
        this.activeEditor.commands.toggleFieldAnnotationsFormat('bold', true);
      }

      this.updateToolbarState();
    },

    /**
     * Toggles italic formatting for text
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Command arguments
     * @returns {void}
     */
    toggleItalic: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
        this.activeEditor.commands.toggleFieldAnnotationsFormat('italic', true);
      }

      this.updateToolbarState();
    },

    /**
     * Toggles underline formatting for text
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Command arguments
     * @returns {void}
     */
    toggleUnderline: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
        this.activeEditor.commands.toggleFieldAnnotationsFormat('underline', true);
      }

      this.updateToolbarState();
    },

    /**
     * Toggles link formatting and updates cursor position
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {*} params.argument - Command arguments
     * @returns {void}
     */
    toggleLink: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);

        // move cursor to end
        const { view } = this.activeEditor;
        const endPos = view.state.selection.$to.pos;
        const selection = new TextSelection(view.state.doc.resolve(endPos));
        const tr = view.state.tr.setSelection(selection);
        const state = view.state.apply(tr);
        view.updateState(state);

        setTimeout(() => {
          view.focus();
        }, 100);
      }
      this.updateToolbarState();
    },

    /**
     * Inserts a table into the document
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {Object} params.argument - Table configuration
     * @returns {void}
     */
    insertTable: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument });
    },

    /**
     * Executes a table-related command
     * @param {Object} params - Command parameters
     * @param {CommandItem} params.item - The command item
     * @param {Object} params.argument - The table command and its parameters
     * @param {string} params.argument.command - The specific table command to execute
     * @returns {void}
     */
    executeTableCommand: ({ item, argument }) => {
      if (!argument) return;

      let command = argument.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
      }

      this.updateToolbarState();
    },
  };

  /**
   * Log debug information to the console
   * @param {...*} args - Arguments to log
   * @returns {void}
   */
  log(...args) {
    console.debug('[🎨 super-toolbar]', ...args);
  }

  /**
   * Set the zoom level
   * @param {number} percent_int - The zoom percentage as an integer
   * @returns {void}
   */
  setZoom(percent_int) {
    const allItems = [...this.toolbarItems, ...this.overflowItems];
    const item = allItems.find((item) => item.name.value === 'zoom');
    this.#interceptedCommands.setZoom({ item, argument: percent_int });
  }

  /**
   * The toolbar expects an active Super Editor instance.
   * @param {Object} editor - The editor instance to attach to the toolbar
   * @returns {void}
   */
  setActiveEditor(editor) {
    this.activeEditor = editor;
    this.activeEditor.on('transaction', this.onEditorTransaction.bind(this));
  }

  /**
   * Get toolbar items by group name
   * @param {string} groupName - The name of the group
   * @returns {ToolbarItem[]} An array of toolbar items in the specified group
   */
  getToolbarItemByGroup(groupName) {
    return this.toolbarItems.filter((item) => item.group.value === groupName);
  }

  /**
   * Get a toolbar item by name
   * @param {string} name - The name of the toolbar item
   * @returns {ToolbarItem|undefined} The toolbar item with the specified name or undefined if not found
   */
  getToolbarItemByName(name) {
    return this.toolbarItems.find((item) => item.name.value === name);
  }

  /**
   * Create toolbar items based on configuration
   * @private
   * @param {SuperToolbar} superToolbar - The toolbar instance
   * @param {Object} icons - Icons to use for toolbar items
   * @param {boolean} [isDev=false] - Whether in development mode
   * @returns {void}
   */
  #makeToolbarItems(superToolbar, icons, isDev = false) {
    const documentWidth = document.documentElement.clientWidth; // take into account the scrollbar
    const { defaultItems, overflowItems } = makeDefaultItems(superToolbar, isDev, documentWidth, this.role, icons);

    let allConfigItems = [
      ...defaultItems.map((item) => item.name.value),
      ...overflowItems.map((item) => item.name.value),
    ];
    if (this.config.groups) allConfigItems = Object.values(this.config.groups).flatMap((item) => item);

    const filteredItems = defaultItems
      .filter((item) => allConfigItems.includes(item.name.value))
      .filter((item) => !this.config.excludeItems.includes(item.name.value))

    this.toolbarItems = filteredItems;
    this.overflowItems = overflowItems.filter((item) => allConfigItems.includes(item.name.value));
  }

  /**
   * Initialize default fonts from the editor
   * @private
   * @returns {void}
   */
  #initDefaultFonts() {
    if (!this.activeEditor || !this.activeEditor.converter) return;
    const { typeface = 'Arial', fontSizePt = 12 } = this.activeEditor.converter.getDocumentDefaultStyles() ?? {};
    const fontSizeItem = this.toolbarItems.find((item) => item.name.value === 'fontSize');
    if (fontSizeItem) fontSizeItem.defaultLabel.value = fontSizePt;

    const fontFamilyItem = this.toolbarItems.find((item) => item.name.value === 'fontFamily');
    if (fontFamilyItem) fontFamilyItem.defaultLabel.value = typeface;
  }

  /**
   * Update highlight color options based on document colors
   * @private
   * @returns {void}
   */
  #updateHighlightColors() {
    if (!this.activeEditor || !this.activeEditor.converter) return;
    if (!this.activeEditor.converter.docHiglightColors.size) return;

    const highlightItem = this.toolbarItems.find((item) => item.name.value === 'highlight');

    const pickerColorOptions = getAvailableColorOptions();
    const perChunk = 7; // items per chunk

    const result = Array.from(this.activeEditor.converter.docHiglightColors).reduce((resultArray, item, index) => {
      const chunkIndex = Math.floor(index / perChunk);
      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = [];
      }

      if (!pickerColorOptions.includes(item)) resultArray[chunkIndex].push(makeColorOption(item));
      return resultArray;
    }, []);

    const option = {
      key: 'color',
      type: 'render',
      render: () => renderColorOptions(this, highlightItem, result, true),
    }

    highlightItem.nestedOptions.value = [option];
  }


  /**
   * Update the toolbar state based on the current editor state
   * Updates active/inactive state of all toolbar items
   * @returns {void}
   */
  updateToolbarState() {
    this.#updateToolbarHistory();
    this.#initDefaultFonts();
    this.#updateHighlightColors();

    // Decativate toolbar items if no active editor
    // This will skip buttons that are marked as allowWithoutEditor
    if (!this.activeEditor || this.documentMode === 'viewing') {
      this.#deactivateAll();
      return;
    }

    const marks = getActiveFormatting(this.activeEditor);
    const inTable = isInTable(this.activeEditor.state);

    this.toolbarItems.forEach((item) => {
      item.resetDisabled();

      // Linked Styles dropdown behaves a bit different from other buttons.
      // We need to disable it manually if there are no linked styles to show
      if (item.name.value === 'linkedStyles') {
        if (this.activeEditor && !getQuickFormatList(this.activeEditor).length) {
          return item.deactivate();
        } else {
          return item.activate();
        }
      }

      const activeMark = marks.find((mark) => mark.name === item.name.value);

      if (activeMark) {
        item.activate(activeMark.attrs);
      } else {
        item.deactivate();
      }

      // Activate toolbar items based on linked styles
      const styleIdMark = marks.find((mark) => mark.name === 'styleId');
      if (styleIdMark?.attrs.styleId) {
        const markToStyleMap = {
          fontSize: 'font-size',
          fontFamily: 'font-family',
          bold: 'bold',
          textAlign: 'textAlign',
        };
        const linkedStyles = this.activeEditor.converter?.linkedStyles.find((style) => style.id === styleIdMark.attrs.styleId);
        if (markToStyleMap[item.name.value] in linkedStyles?.definition.styles) {
          const value = {
            [item.name.value]: linkedStyles?.definition.styles[markToStyleMap[item.name.value]]
          };
          item.activate(value);
        }
      }

      const spacingAttr = marks.find((mark) => mark.name === 'spacing');
      if (item.name.value === 'lineHeight' && (activeMark?.attrs?.lineHeight || spacingAttr)) {
        item.selectedValue.value = activeMark?.attrs?.lineHeight || spacingAttr.attrs?.spacing?.line || '';
      }

      if (item.name.value === 'tableActions') {
        item.disabled.value = !inTable;
      }
    });
  }

  /**
   * Handler for toolbar resize events
   * @returns {void}
   */
  onToolbarResize = () => {
    this.#makeToolbarItems(this, this.config.icons, this.isDev);
    if (this.role === 'viewer') {
      this.#deactivateAll();
    };
  };

  /**
   * Deactivate all toolbar items
   * @private
   * @returns {void}
   */
  #deactivateAll() {
    this.activeEditor = null;
    this.toolbarItems.forEach((item) => {
      const { allowWithoutEditor } = item;
      if (allowWithoutEditor.value) return;
      item.setDisabled(true);
    });
  }

  /**
   * Update undo/redo history state in the toolbar
   * @private
   * @returns {void}
   */
  #updateToolbarHistory() {
    if (!this.activeEditor) return;
    this.undoDepth = undoDepth(this.activeEditor.state);
    this.redoDepth = redoDepth(this.activeEditor.state);
  }

  /**
   * React to editor transactions. Might want to debounce this.
   * @param {Object} params - Transaction parameters
   * @param {Object} params.editor - The editor instance (not used)
   * @param {Object} params.transaction - The transaction object
   * @returns {void}
   */
  onEditorTransaction({ editor, transaction }) {
    if (!transaction.docChanged && !transaction.selectionSet) return;
    this.updateToolbarState();
  }

  /**
   * Main handler for toolbar commands
   * @param {CommandItem} params - Command parameters
   * @param {ToolbarItem} params.item - An instance of the useToolbarItem composable
   * @param {*} [params.argument] - The argument passed to the command
   * @returns {*} The result of the executed command, undefined if no result is returned
  */
  emitCommand({ item, argument }) {
    this.activeEditor?.focus();
    const { command } = item;

    if (!command) {
      return;
    }

    this.log('(emmitCommand) Command:', command, item, argument);

    // Check if we have a custom or overloaded command defined
    if (command in this.#interceptedCommands) {
      return this.#interceptedCommands[command]({ item, argument });
    }

    if (command in this.activeEditor?.commands) {
      this.activeEditor.commands[command](argument);
      this.updateToolbarState();
    } else {
      throw new Error(`[super-toolbar 🎨] Command not found: ${command}`);
    }
  }

  /**
   * Run a command that requires an argument
   * @private
   * @param {CommandItem} params - Command parameters
   * @param {ToolbarItem} params.item - The toolbar item
   * @param {*} params.argument - The argument for the command
   * @param {Function} [callback] - Optional callback to run after the command
   * @returns {void}
   */
  #runCommandWithArgumentOnly({ item, argument }, callback) {
    if (!argument || !this.activeEditor) return;

    let command = item.command;
    const noArgumentCommand = item.noArgumentCommand;

    if (argument === 'none' && noArgumentCommand in this.activeEditor?.commands) {
      this.activeEditor.commands[noArgumentCommand]();
      this.updateToolbarState();
      return;
    }

    if (command in this.activeEditor?.commands) {
      this.activeEditor.commands[command](argument);
      if (typeof callback === 'function') callback(argument);
      this.updateToolbarState();
    }
  }
}
