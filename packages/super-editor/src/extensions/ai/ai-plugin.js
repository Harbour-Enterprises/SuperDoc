import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@core/Extension.js';
import { Decoration, DecorationSet } from "prosemirror-view";
import { AiMarkName } from './ai-constants.js';

export const AiPluginKey = new PluginKey('ai');

export const AiPlugin = Extension.create({
  name: 'ai',

  addCommands() {
    return {
      insertAiMark: () => ({ tr, dispatch, state }) => {
        const { selection } = tr;
        const { $from, $to } = selection;

        // Only add mark if there's a selection
        if ($from.pos === $to.pos) return false;

        tr.addMark(
          $from.pos,
          $to.pos,
          this.editor.schema.marks[AiMarkName].create({
            id: 'ai-highlight'
          })
        );

        dispatch(tr);
        return true;
      },

      removeAiMark: () => ({ tr, dispatch, state }) => {
        // Loop through the document to find and remove all AI marks
        const { doc } = state;
        let markFound = false;

        doc.descendants((node, pos) => {
          const { marks = [] } = node;
          const aiMark = marks.find((mark) => mark.type.name === AiMarkName);

          if (aiMark) {
            markFound = true;
            tr.removeMark(pos, pos + node.nodeSize, state.schema.marks[AiMarkName]);
          }
        });

        if (markFound) {
          dispatch(tr);
          return true;
        }

        return false;
      }
    };
  },

  addPmPlugins() {
    const editor = this.editor;
    const aiPlugin = new Plugin({
      key: AiPluginKey,
      state: {
        init() {
          return {
            decorations: DecorationSet.empty,
            highlightColor: '#6366f1'  // Indigo color, matches AiLayer
          };
        },
        apply(tr, oldState, _, newEditorState) {
          // If the document hasn't changed, return the old state
          if (!tr.docChanged) return oldState;

          // Process AI highlights in the document
          const { decorations } = processAiHighlights(editor, newEditorState.doc, oldState.highlightColor) || {};
          const decorationSet = DecorationSet.create(newEditorState.doc, decorations);

          return {
            ...oldState,
            decorations: decorationSet,
          };
        }
      },
      props: {
        decorations(state) {
          return this.getState(state).decorations;
        }
      }
    });
    return [aiPlugin];
  },
});

/**
 * Iterate through the document to find AI marks and create decorations for them
 * @param {*} editor The current editor instance
 * @param {*} doc The current document
 * @param {string} highlightColor The color to use for highlights
 * @returns {Object} The decorations for AI marks
 */
const processAiHighlights = (editor, doc, highlightColor) => {
  const decorations = [];

  doc.descendants((node, pos) => {
    // Check if it contains the aiMarkName
    const { marks = [] } = node;
    const aiMark = marks.find((mark) => mark.type.name === AiMarkName);
    
    if (aiMark) {
      const deco = Decoration.inline(
        pos,
        pos + node.nodeSize,
        {
          style: `background-color: ${highlightColor}33;`, // 33 is 20% opacity in hex
          class: 'ai-highlight',
        }
      );
      decorations.push(deco);
    }
  });

  return { decorations };
}; 