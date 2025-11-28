import { createApp, App } from 'vue';
import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Extension } from '@core/Extension.js';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import type { Editor } from '@core/Editor.js';
import { applyStyleIsolationClass } from '../../utils/styleIsolation.js';

import Mentions from '@/components/popovers/Mentions.vue';

/**
 * Configuration options for PopoverPlugin
 * @typedef {Object} PopoverPluginOptions
 * @category Options
 */

interface PopoverPluginState {
  shouldUpdate?: boolean;
}

const popoverPluginKey = new PluginKey<PopoverPluginState>('popoverPlugin');

/**
 * @module PopoverPlugin
 * @sidebarTitle Popover Plugin
 * @snippetPath /snippets/extensions/popover-plugin.mdx
 */
export const PopoverPlugin = Extension.create({
  name: 'popoverPlugin',

  addOptions() {
    return {};
  },

  addPmPlugins() {
    const popover = new Plugin<PopoverPluginState>({
      key: popoverPluginKey,
      state: {
        init: (): PopoverPluginState => {
          return {};
        },
        apply: (tr, value): PopoverPluginState => {
          const newValue: PopoverPluginState = { ...value };

          // Only update popover when selection or document changes
          if (tr.docChanged || tr.selectionSet) {
            newValue.shouldUpdate = true;
          } else {
            newValue.shouldUpdate = false;
          }

          return newValue;
        },
      },
      view: (view) => {
        if (!this.editor) {
          return {};
        }
        const popover = new Popover(view, this.editor);
        return {
          update: (view) => {
            const pluginState = popoverPluginKey.getState(view.state);
            if (!pluginState || !pluginState.shouldUpdate) return;
            popover.update(view);
          },
          destroy: () => {
            popover.destroy();
          },
        };
      },
    });
    return [popover];
  },
});

class Popover {
  editor: Editor;
  view: EditorView;
  popover: HTMLDivElement;
  tippyInstance: TippyInstance;
  popoverRect?: DOMRect;
  app?: App;
  state?: EditorState;

  constructor(view: EditorView, editor: Editor) {
    this.editor = editor;
    this.view = view;
    this.popover = document.createElement('div');
    this.popover.className = 'sd-editor-popover';
    applyStyleIsolationClass(this.popover);
    document.body.appendChild(this.popover);

    this.tippyInstance = tippy(this.popover, {
      trigger: 'manual',
      placement: 'bottom-start',
      interactive: true,
      appendTo: document.body,
      arrow: false,
      onShow: (instance) => {
        instance.setProps({
          getReferenceClientRect: () => this.popoverRect ?? new DOMRect(),
        });
        this.bindKeyDownEvents();
      },
      onHide: () => {
        this.unbindKeyDownEvents();
      },
      theme: 'sd-editor-popover',
    }) as TippyInstance;
  }

  bindKeyDownEvents(): void {
    this.view.dom.addEventListener('keydown', this.handleKeyDown);
  }

  unbindKeyDownEvents(): void {
    this.view.dom.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent): void => {
    const isArrow = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    if (this.tippyInstance.state.isVisible && isArrow) {
      event.preventDefault();
      (this.popover.firstChild as HTMLElement)?.focus();
    }
  };

  mountVueComponent(component: unknown, props: Record<string, unknown> = {}): void {
    if (this.app) this.app.unmount();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.app = createApp(component as any, props);
    this.app.mount(this.popover);
    this.tippyInstance.setContent(this.popover);
  }

  update(view: EditorView): void {
    this.state = view.state;
    const showPopover = this.isShowMentions;

    let popoverContent: { component: unknown; props: Record<string, unknown> | null } = {
      component: null,
      props: null,
    };
    if (this.isShowMentions && this.state) {
      const { from } = this.state.selection;
      const atMention = this.getMentionText(from);
      popoverContent = {
        component: Mentions,
        props: {
          users: this.editor.users,
          mention: atMention,
          inserMention: (user: Record<string, unknown>) => {
            if (!this.state) return;
            const { $from } = this.state.selection;
            const length = atMention.length;
            const attributes = { ...user };
            const mentionNode = this.editor.schema.nodes.mention.create(attributes);
            const tr = this.state.tr.replaceWith($from.pos - length, $from.pos, mentionNode);
            this.editor.view.dispatch(tr);
            this.editor.view.focus();
          },
        },
      };
    }

    if (showPopover && popoverContent.component && this.state) {
      const { to } = this.state.selection;
      const { component, props } = popoverContent;
      if (props) this.mountVueComponent(component, props);
      this.showPopoverAtPosition(to);
    } else this.tippyInstance.hide();
  }

  showPopoverAtPosition(pos: number): void {
    const end = this.view.coordsAtPos(pos);
    this.popoverRect = new DOMRect(end.left, end.bottom, 0, 0);

    this.tippyInstance.show();
  }

  getMentionText(from: number): string {
    if (!this.state) return '';
    const maxLookBehind = 20;
    const startPos = Math.max(0, from - maxLookBehind);
    const textBefore = this.state.doc.textBetween(startPos, from, '\n', '\0');

    // Return only the text after the last @
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex !== -1) return textBefore.substring(atIndex);

    return '';
  }

  get isShowMentions(): boolean {
    if (!this.state) return false;
    const { from } = this.state.selection;

    // Ensure we're not out of bounds
    if (from < 1) return false;

    const textBefore = this.getMentionText(from);

    // Use regex to match "@" followed by word characters and no space
    const mentionPattern = /(?:^|\s)@[\w]*$/;
    const match = textBefore.match(mentionPattern);

    return !!(match && this.state.selection.empty);
  }

  destroy(): void {
    this.tippyInstance.destroy();
    this.popover.remove();
  }
}
