// @ts-check
import { Extension } from '@core/Extension.js';
import { search, SearchQuery, setSearchState, getMatchHighlights } from 'prosemirror-search';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { v4 as uuidv4 } from 'uuid';

/**
 * Search match Object
 * @typedef {Object} SearchMatch
 * @property {string} text - Found text
 * @property {number} from - From position
 * @property {number} to - To position
 * @property {string} id - ID of the search match
 */

/**
 * @module Search
 * @sidebarTitle Search
 * @snippetPath /snippets/extensions/search.mdx
 */
export const Search = Extension.create({
  addStorage() {
    return {
      /**
       * @private
       * @type {SearchMatch[]|null}
       */
      searchResults: [],
    };
  },

  addPmPlugins() {
    const editor = this.editor;
    const storage = this.storage;

    const searchHighlightWithIdPlugin = new Plugin({
      key: new PluginKey('customSearchHighlights'),
      props: {
        decorations(state) {
          if (!editor) return null;

          const matches = storage?.searchResults;
          if (!matches?.length) return null;

          const decorations = matches.map((match) =>
            Decoration.inline(match.from, match.to, {
              id: `search-match-${match.id}`,
            }),
          );

          return DecorationSet.create(state.doc, decorations);
        },
      },
    });

    return [search(), searchHighlightWithIdPlugin];
  },

  addCommands() {
    return {
      /**
       * Navigates to the first search match
       * @category Command
       * @returns {Function} - Command function
       * @example
       * goToFirstMatch()
       * @note Scrolls Editor to the first match of called search().
       */
      goToFirstMatch:
        () =>
        /** @returns {boolean} */
        ({ state, editor }) => {
          const highlights = getMatchHighlights(state);
          if (!highlights) return false;

          // Fix: DecorationSet uses .find(), not .children
          const decorations = highlights.find();
          if (!decorations?.length) return false;

          const firstMatch = decorations[0];
          const domPos = editor.view.domAtPos(firstMatch.from);
          domPos?.node?.scrollIntoView(true);
          return true;
        },

      /**
       * Searches for the string match in Editor content
       * @category Command
       * @param {String|RegExp} patternInput - Search string or pattern
       * @returns {Function} - Command function that returns matches
       * @example
       * search('test string')
       * @note Searches for the test string in the Editor content and returns an array of matches
       */
      search:
        (patternInput) =>
        /** @returns {SearchMatch[]} */
        ({ state, dispatch }) => {
          let pattern;
          let caseSensitive = false;
          let regexp = false;
          const wholeWord = false;

          if (patternInput instanceof RegExp) {
            regexp = true;
            pattern = patternInput.source;
            caseSensitive = !patternInput.flags.includes('i');
          } else if (typeof patternInput === 'string' && /^\/(.+)\/([gimsuy]*)$/.test(patternInput)) {
            const [, body, flags] = patternInput.match(/^\/(.+)\/([gimsuy]*)$/);
            regexp = true;
            pattern = body;
            caseSensitive = !flags.includes('i');
          } else {
            pattern = String(patternInput);
          }

          const query = new SearchQuery({
            search: pattern,
            caseSensitive,
            regexp,
            wholeWord,
          });
          const tr = setSearchState(state.tr, query);
          dispatch(tr);

          const newState = state.apply(tr);

          const decoSet = getMatchHighlights(newState);
          const matches = decoSet ? decoSet.find() : [];

          const resultMatches = matches.map((d) => ({
            from: d.from,
            to: d.to,
            text: newState.doc.textBetween(d.from, d.to),
            id: uuidv4(),
          }));

          this.storage.searchResults = resultMatches;

          return resultMatches;
        },

      /**
       * Navigates to the selected match
       * @category Command
       * @param {SearchMatch} match Match at specific index
       * @returns {Function} - Command function
       * @example
       * const searchResult = search('test string')
       * goToSearchResult(searchResult[3])
       * @note Scrolls Editor to the fourth match of called search() and sets selection on it.
       */
      goToSearchResult:
        (match) =>
        /** @returns {boolean} */
        ({ state, dispatch, editor }) => {
          const { from, to } = match;

          editor.view.focus();
          const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to)).scrollIntoView();
          dispatch(tr);

          const { node } = editor.view.domAtPos(from);
          if (node?.scrollIntoView) {
            node.scrollIntoView({ block: 'center', inline: 'nearest' });
          }

          return true;
        },
    };
  },
});
