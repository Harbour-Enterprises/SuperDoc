// @ts-nocheck

import { Extension } from '@core/Extension.js';
import { search, SearchQuery, setSearchState, getMatchHighlights } from './prosemirror-search-patched.js';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { v4 as uuidv4 } from 'uuid';

const isRegExp = (value) => Object.prototype.toString.call(value) === '[object RegExp]';

/**
 * Creates a search match result for a regex pattern.
 * @param {Object} decoration - Decoration object with from/to positions
 * @param {import('prosemirror-state').EditorState} state - Editor state
 * @returns {SearchMatch} Search match result
 */
function createRegexMatchResult(decoration, state) {
  const extractedText = state.doc.textBetween(decoration.from, decoration.to, '', '');
  return {
    from: decoration.from,
    to: decoration.to,
    text: extractedText,
    id: uuidv4(),
  };
}

/**
 * Creates a search match result when the extracted text already matches.
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {string} extractedText - Extracted text
 * @returns {SearchMatch} Search match result
 */
function createValidMatchResult(from, to, extractedText) {
  return {
    from,
    to,
    text: extractedText,
    id: uuidv4(),
  };
}

/**
 * Finds the actual match position in context text, accounting for character encoding differences.
 * @param {string} contextText - Original context text
 * @param {string} contextNormalized - Normalized context text
 * @param {string} searchText - Normalized search pattern
 * @param {number} matchIndex - Index in normalized context where pattern was found
 * @param {boolean} caseSensitive - Whether search is case sensitive
 * @returns {{start: number, length: number}} Actual match start position and length
 */
function findActualMatchPosition(contextText, contextNormalized, searchText, matchIndex, caseSensitive) {
  const searchLength = searchText.length;
  const minLength = Math.max(1, searchLength - 2);
  const maxLength = searchLength + 2;

  // Try to find exact match starting from the normalized match index
  // Check a small window around the expected position
  const startPos = Math.max(0, matchIndex - 2);
  const endPos = Math.min(contextText.length - minLength, matchIndex + 2);

  for (let i = startPos; i <= endPos; i++) {
    for (let len = minLength; len <= maxLength && i + len <= contextText.length; len++) {
      const candidate = contextText.slice(i, i + len);
      const candidateNormalized = caseSensitive ? candidate : candidate.toLowerCase();
      if (candidateNormalized === searchText) {
        return { start: i, length: len };
      }
    }
  }

  // Fallback: use the normalized match index
  return { start: matchIndex, length: searchLength };
}

/**
 * Finds correct match positions in a wider context when initial positions don't match.
 * @param {number} from - Original start position
 * @param {number} to - Original end position
 * @param {string} pattern - Search pattern
 * @param {import('prosemirror-state').EditorState} state - Editor state
 * @param {boolean} caseSensitive - Whether search is case sensitive
 * @returns {{from: number, to: number, text: string} | null} Corrected match or null if not found
 */
function findCorrectMatchPositionInContext(from, to, pattern, state, caseSensitive) {
  // Search in a wider context to find correct positions
  // This handles cases where position offsets occur due to node boundaries
  const contextPadding = Math.max(10, pattern.length * 2);
  const contextFrom = Math.max(0, from - contextPadding);
  const contextTo = Math.min(state.doc.content.size, to + contextPadding);
  const contextText = state.doc.textBetween(contextFrom, contextTo, '', '');
  const contextNormalized = caseSensitive ? contextText : contextText.toLowerCase();

  const searchText = caseSensitive ? pattern : pattern.toLowerCase();

  // Find the search pattern in the normalized context
  const matchIndex = contextNormalized.indexOf(searchText);
  if (matchIndex === -1) {
    // Pattern not found in context - skip this match
    return null;
  }

  // Find the actual match position accounting for character encoding differences
  const { start, length } = findActualMatchPosition(
    contextText,
    contextNormalized,
    searchText,
    matchIndex,
    caseSensitive,
  );

  // Calculate final positions
  const correctedFrom = contextFrom + start;
  const correctedTo = contextFrom + start + length;
  const extractedText = state.doc.textBetween(correctedFrom, correctedTo, '', '');

  return {
    from: correctedFrom,
    to: correctedTo,
    text: extractedText,
  };
}

/**
 * Processes a decoration match and validates/corrects its positions.
 * @param {Object} decoration - Decoration object with from/to positions
 * @param {import('prosemirror-state').EditorState} state - Editor state
 * @param {string} pattern - Search pattern
 * @param {boolean} regexp - Whether pattern is a regex
 * @param {boolean} caseSensitive - Whether search is case sensitive
 * @returns {SearchMatch | null} Search match result or null if invalid
 */
function processMatch(decoration, state, pattern, regexp, caseSensitive) {
  // For regex patterns, skip validation as matches might be more complex
  if (regexp) {
    return createRegexMatchResult(decoration, state);
  }

  // For string patterns, validate and potentially correct the match positions
  let from = decoration.from;
  let to = decoration.to;
  let extractedText = state.doc.textBetween(from, to, '', '');

  const searchText = caseSensitive ? pattern : pattern.toLowerCase();
  const extractedNormalized = caseSensitive ? extractedText : extractedText.toLowerCase();

  // If extracted text matches, use it as-is
  if (extractedNormalized.includes(searchText)) {
    return createValidMatchResult(from, to, extractedText);
  }

  // Try to find correct positions in a wider context
  const corrected = findCorrectMatchPositionInContext(from, to, pattern, state, caseSensitive);
  if (!corrected) {
    return null;
  }

  return createValidMatchResult(corrected.from, corrected.to, corrected.text);
}

/**
 * Search match object
 * @typedef {Object} SearchMatch
 * @property {string} text - Found text
 * @property {number} from - From position
 * @property {number} to - To position
 * @property {string} id - ID of the search match
 */

/**
 * Configuration options for Search
 * @typedef {Object} SearchOptions
 * @category Options
 */

/**
 * @module Search
 * @sidebarTitle Search
 * @snippetPath /snippets/extensions/search.mdx
 */
export const Search = Extension.create({
  // @ts-expect-error - Storage type mismatch will be fixed in TS migration
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
       * Navigate to the first search match
       * @category Command
       * @example
       * editor.commands.goToFirstMatch()
       * @note Scrolls editor to the first match from previous search
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
       * Search for string matches in editor content
       * @category Command
       * @param {String|RegExp} patternInput - Search string or pattern
       * @example
       * const matches = editor.commands.search('test string')
       * const regexMatches = editor.commands.search(/test/i)
       * @note Returns array of SearchMatch objects with positions and IDs
       */
      search:
        (patternInput) =>
        /** @returns {SearchMatch[]} */
        ({ state, dispatch }) => {
          let pattern;
          let caseSensitive = false;
          let regexp = false;
          const wholeWord = false;

          if (isRegExp(patternInput)) {
            const regexPattern = /** @type {RegExp} */ (patternInput);
            regexp = true;
            pattern = regexPattern.source;
            caseSensitive = !regexPattern.flags.includes('i');
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

          const resultMatches = matches
            .map((d) => processMatch(d, newState, pattern, regexp, caseSensitive))
            .filter((match) => match !== null);

          this.storage.searchResults = resultMatches;

          return resultMatches;
        },

      /**
       * Navigate to a specific search match
       * @category Command
       * @param {SearchMatch} match - Match object to navigate to
       * @example
       * const searchResults = editor.commands.search('test string')
       * editor.commands.goToSearchResult(searchResults[3])
       * @note Scrolls to match and selects it
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
