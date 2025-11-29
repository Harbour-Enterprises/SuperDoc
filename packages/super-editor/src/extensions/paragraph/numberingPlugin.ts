import { Plugin, PluginKey } from 'prosemirror-state';
import { NumberingManager } from './NumberingManager.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { generateOrderedListIndex } from '@helpers/orderedListUtils.js';
import { docxNumberingHelpers } from '@core/super-converter/v2/importer/listImporter.js';
import { calculateResolvedParagraphProperties } from './resolvedPropertiesCache.js';
import type { Editor } from '@core/Editor.js';
import type { Transaction } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';

/**
 * Create a ProseMirror plugin that keeps `listRendering` data in sync with the
 * underlying Word numbering definitions.
 */
export function createNumberingPlugin(editor: Editor): Plugin {
  const numberingManager = NumberingManager();

  // Helpers to initialize and refresh start settings from definitions
  const applyStartSettingsFromDefinitions = (definitionsMap: Record<string, unknown>): void => {
    if (!definitionsMap || typeof definitionsMap !== 'object') {
      return;
    }

    Object.entries(definitionsMap).forEach(([numId, levels]) => {
      if (!levels || typeof levels !== 'object' || Array.isArray(levels)) {
        return;
      }

      Object.entries(levels as Record<string, unknown>).forEach(([level, def]: [string, unknown]) => {
        if (!def || typeof def !== 'object') {
          return;
        }

        const defObj = def as Record<string, unknown>;
        const start = parseInt(String(defObj.start ?? ''), 10) || 1;
        let restart: number | undefined;
        const restartRaw = defObj.restart;
        if (restartRaw != null) {
          const parsedRestart = parseInt(String(restartRaw), 10);
          if (!isNaN(parsedRestart)) {
            restart = parsedRestart;
          }
        }
        numberingManager.setStartSettings(numId, parseInt(level, 10), start, restart);
      });
    });
  };

  // Callback to refresh start settings when definitions change
  const refreshStartSettings = (): void => {
    const definitions = ListHelpers.getAllListDefinitions(editor);
    applyStartSettingsFromDefinitions(definitions);
  };

  // Initial setup
  refreshStartSettings();

  // Listen for definition changes
  if (typeof editor?.on === 'function') {
    editor.on('list-definitions-change', refreshStartSettings);
    if (typeof editor?.off === 'function') {
      const cleanupListDefinitionListener = () => {
        editor.off('list-definitions-change', refreshStartSettings);
        editor.off?.('destroy', cleanupListDefinitionListener);
      };
      editor.on('destroy', cleanupListDefinitionListener);
    }
  }

  return new Plugin({
    name: 'numberingPlugin',
    key: new PluginKey('numberingPlugin'),
    /**
     * Scan document changes and collect fresh numbering metadata for list
     * paragraphs. The incoming transactions are marked to avoid reprocessing.
     */
    appendTransaction(
      transactions: readonly Transaction[],
      oldState: EditorState,
      newState: EditorState,
    ): Transaction | null {
      const isFromPlugin = transactions.some((tr) => tr.getMeta('orderedListSync'));
      if (isFromPlugin || !transactions.some((tr) => tr.docChanged)) {
        return null;
      }

      // Mark the transaction to avoid re-processing
      const tr = newState.tr;
      tr.setMeta('orderedListSync', true);

      // Generate new list properties
      numberingManager.enableCache();
      newState.doc.descendants((node, pos) => {
        const resolvedProps = calculateResolvedParagraphProperties(editor, node, newState.doc.resolve(pos));
        if (!resolvedProps) {
          return;
        }
        const numberingProps = resolvedProps.numberingProperties;
        if (
          node.type.name !== 'paragraph' ||
          !numberingProps ||
          numberingProps.numId === undefined ||
          numberingProps.numId === null
        ) {
          return;
        }

        // Retrieving numbering definition from docx
        const rawNumId = numberingProps.numId;
        const rawLevel = numberingProps.ilvl;
        const numIdValue =
          typeof rawNumId === 'string' ? parseInt(rawNumId, 10) : typeof rawNumId === 'number' ? rawNumId : NaN;
        if (!Number.isFinite(numIdValue)) {
          tr.setNodeAttribute(pos, 'listRendering', null);
          return;
        }
        const levelValue =
          typeof rawLevel === 'string' ? parseInt(rawLevel, 10) : typeof rawLevel === 'number' ? rawLevel : 0;
        const definitionDetails = ListHelpers.getListDefinitionDetails({
          numId: numIdValue,
          level: levelValue,
          listType: undefined,
          editor,
        });

        // Validate that definition details exist and have expected structure
        if (
          !definitionDetails ||
          typeof definitionDetails !== 'object' ||
          Object.keys(definitionDetails).length === 0
        ) {
          // Treat as normal paragraph if definition is missing
          tr.setNodeAttribute(pos, 'listRendering', null);
          return;
        }

        const {
          lvlText,
          customFormat,
          listNumberingType: listNumberingTypeRaw,
          suffix,
          justification,
          abstractId,
        } = definitionDetails as Record<string, unknown>;
        const safeAbstractId: string | number | undefined =
          typeof abstractId === 'string' || typeof abstractId === 'number' ? abstractId : undefined;
        const listNumberingType: string = typeof listNumberingTypeRaw === 'string' ? listNumberingTypeRaw : 'decimal';
        // Defining the list marker
        let markerText = '';
        const count = numberingManager.calculateCounter(numIdValue, levelValue, pos, safeAbstractId);
        numberingManager.setCounter(numIdValue, levelValue, pos, count, safeAbstractId);
        const path = numberingManager.calculatePath(numIdValue, levelValue, pos);
        if (listNumberingType !== 'bullet') {
          markerText = String(
            generateOrderedListIndex({
              listLevel: path,
              lvlText: String(lvlText ?? ''),
              listNumberingType: String(listNumberingType),
              customFormat: (typeof customFormat === 'string' ? customFormat : null) as string | undefined,
            }),
          );
        } else {
          markerText = String(docxNumberingHelpers.normalizeLvlTextChar(String(lvlText ?? '•')));
        }

        const safeSuffix = typeof suffix === 'string' ? suffix : null;
        const safeJustification: string = typeof justification === 'string' ? justification : '';
        const safeNumberingType: string = String(listNumberingType ?? '');

        if (
          JSON.stringify(node.attrs.listRendering) !==
          JSON.stringify({
            markerText,
            suffix: safeSuffix,
            justification: safeJustification,
            path,
            numberingType: safeNumberingType,
          })
        ) {
          // Updating rendering attrs for node view usage
          tr.setNodeAttribute(pos, 'listRendering', {
            markerText,
            suffix: safeSuffix,
            justification: safeJustification,
            path,
            numberingType: safeNumberingType,
          });
        }

        return false; // no need to descend into a paragraph
      });
      numberingManager.disableCache();
      return tr.docChanged ? tr : null;
    },
  });
}
