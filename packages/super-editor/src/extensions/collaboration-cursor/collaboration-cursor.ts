import { Extension } from '@core/index.js';
import { yCursorPlugin } from 'y-prosemirror';

interface CollaborationUser {
  name?: string;
  email?: string;
  color: string;
}

export const CollaborationCursor = Extension.create({
  name: 'collaborationCursor',

  priority: 999,

  addOptions() {
    return {
      provider: null,
      user: {
        name: null,
        color: null,
      },
    };
  },

  addStorage() {
    return {
      users: [],
    };
  },

  addPmPlugins() {
    const { collaborationProvider: provider = null } = this.editor.options as {
      collaborationProvider?: { awareness: unknown } | null;
    };
    if (!provider) return [];

    return [yCursorPlugin(provider.awareness, { cursorBuilder: customCursors })];
  },
});

const customCursors = (user: CollaborationUser): HTMLSpanElement => {
  const cursor = document.createElement('span');
  cursor.classList.add('ProseMirror-yjs-cursor');
  cursor.setAttribute('style', `border-color: ${user.color}`);

  const userDiv = document.createElement('div');
  userDiv.setAttribute('style', `background-color: ${user.color}`);
  userDiv.insertBefore(document.createTextNode(user.name || user.email), null);
  cursor.insertBefore(userDiv, null);
  return cursor;
};
