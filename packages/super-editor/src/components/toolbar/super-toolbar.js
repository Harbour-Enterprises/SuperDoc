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

export class SuperToolbar extends EventEmitter {
  config = {
    element: null,
    toolbarGroups: ['left', 'center', 'right'],
    role: 'editor',
    pagination: false,
    icons: { ...toolbarIcons },
    mode: 'docx',
  };

  #interceptedCommands = {
    setZoom: ({ item, argument }) => {
      // Currently only set up to work with full SuperDoc
      if (!argument) return;
      item.onActivate({ zoom: argument });

      this.emit('superdoc-command', { item, argument });
      const layers = document.querySelector('.layers');
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
    },

    setDocumentMode: ({ item, argument }) => {
      if (!argument) return;

      this.emit('superdoc-command', { item, argument });
    },

    setFontSize: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument }, () => {
        this.activeEditor?.commands.setFieldAnnotationsFontSize(argument, true);
      });
    },

    setFontFamily: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument }, () => {
        this.activeEditor?.commands.setFieldAnnotationsFontFamily(argument, true);
      });
    },

    setColor: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument });
    },
    
    setHighlight: ({ item, argument }) => {
      this.#runCommandWithArgumentOnly({ item, argument });
    },

    toggleRuler: ({ item, argument }) => {
      this.superdoc.toggleRuler();
    },

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

    increaseTextIndent: ({ item, argument }) => {
      let command = item.command;
      let { state } = this.activeEditor;
      let listItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);

      if (listItem) {
        return this.activeEditor.chain().sinkListItem('listItem').updateOrderedListStyleType().run();
      }

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
      }
    },

    decreaseTextIndent: ({ item, argument }) => {
      let command = item.command;
      let { state } = this.activeEditor;
      let listItem = findParentNode((node) => node.type.name === 'listItem')(state.selection);

      if (listItem) {
        return this.activeEditor.chain().liftListItem('listItem').updateOrderedListStyleType().run();
      }

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
      }
    },

    toggleBold: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
        this.activeEditor.commands.toggleFieldAnnotationsFormat('bold', true);
      }

      this.updateToolbarState();
    },

    toggleItalic: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
        this.activeEditor.commands.toggleFieldAnnotationsFormat('italic', true);
      }

      this.updateToolbarState();
    },

    toggleUnderline: ({ item, argument }) => {
      let command = item.command;

      if (command in this.activeEditor.commands) {
        this.activeEditor.commands[command](argument);
        this.activeEditor.commands.toggleFieldAnnotationsFormat('underline', true);
      }

      this.updateToolbarState();
    },

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
  };

  constructor(config) {
    super();

    this.config = { ...this.config, ...config };
    this.toolbarItems = [];
    this.overflowItems = [];
    this.documentMode = 'editing';
    this.isDev = config.isDev || false;
    this.superdoc = config.superdoc;
    this.role = config.role || 'editor';
    
    this.config.icons = {
      ...toolbarIcons,
      ...config.icons,
    };

    this.#makeToolbarItems(this, this.config.icons, config.isDev);

    let el = null;
    if (this.config.element) {
      el = document.getElementById(this.config.element);
      if (!el) {
        console.warn(`[super-toolbar 🎨] Element not found: ${this.config.element}`);
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

  log(...args) {
    console.debug('[🎨 super-toolbar]', ...args);
  }

  setZoom(percent_int) {
    const allItems = [...this.toolbarItems, ...this.overflowItems];
    const item = allItems.find((item) => item.name.value === 'zoom');
    this.#interceptedCommands.setZoom({ item, argument: percent_int });
  }

  /**
   * The toolbar expects an active Super Editor instance.
   * @param {*} editor
   */
  setActiveEditor(editor) {
    this.activeEditor = editor;
    this.activeEditor.on('transaction', this.onEditorTransaction.bind(this));
  }

  getToolbarItemByGroup(groupName) {
    return this.toolbarItems.filter((item) => item.group.value === groupName);
  }

  #makeToolbarItems(superToolbar, icons, isDev = false) {
    const { defaultItems, overflowItems } = makeDefaultItems(superToolbar, isDev, window.innerWidth, this.role, icons);
    this.toolbarItems = defaultItems;
    this.overflowItems = overflowItems;
  }

  #initDefaultFonts() {
    if (!this.activeEditor || !this.activeEditor.converter) return;
    const { typeface = 'Arial', fontSizePt = 12 } = this.activeEditor.converter.getDocumentDefaultStyles() ?? {};
    const fontSizeItem = this.toolbarItems.find((item) => item.name.value === 'fontSize');
    if (fontSizeItem) fontSizeItem.defaultLabel.value = fontSizePt;

    const fontFamilyItem = this.toolbarItems.find((item) => item.name.value === 'fontFamily');
    if (fontFamilyItem) fontFamilyItem.defaultLabel.value = typeface;
  }
  
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
      render: () => renderColorOptions(this, highlightItem, result),
    }

    highlightItem.nestedOptions.value = [option];
  }


  /**
   * Update the toolbar state. Expects a list of marks in the form: { name, attrs }
   * @param {Object} marks
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
      };

      const activeMark = marks.find((mark) => mark.name === item.name.value);

      if (activeMark) {
        item.activate(activeMark.attrs);
      } else {
        item.deactivate();
      }
    });
  }

  onToolbarResize = () => {
    this.#makeToolbarItems(this, this.config.icons, this.isDev);
  };

  #deactivateAll() {
    this.activeEditor = null;
    this.toolbarItems.forEach((item) => {
      const { allowWithoutEditor } = item;
      if (allowWithoutEditor.value) return;
      item.setDisabled(true);
    });
  }

  #updateToolbarHistory() {
    if (!this.activeEditor) return;
    this.undoDepth = undoDepth(this.activeEditor.state);
    this.redoDepth = redoDepth(this.activeEditor.state);
  }

  /**
   * React to editor transactions. Might want to debounce this.
   */
  onEditorTransaction({ editor, transaction }) {
    if (!transaction.docChanged && !transaction.selectionSet) return;
    this.updateToolbarState();
  }

  /**
   * Main handler for toolbar commands.
   *
   * @param {Object} item is an instance of the useToolbarItem composable
   * @param {Object} argument is the argument passed to the command
   */
  emitCommand({ item, argument }) {
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

  #runCommandWithArgumentOnly({ item, argument }, callback) {
    if (!argument || !this.activeEditor) return;

    let command = item.command;
    if (command in this.activeEditor?.commands) {
      this.activeEditor.commands[command](argument);
      if (typeof callback === 'function') callback(argument);
      this.updateToolbarState();
    }
  }
}
