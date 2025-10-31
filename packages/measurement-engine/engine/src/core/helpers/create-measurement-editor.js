import { Editor } from '@/index.js';
import { getStarterExtensions } from '@extensions/index.js';
import { applyHiddenContainerStyles } from './hidden-container.js';

const noop = () => {};

/**
 * Create a read-only measurement editor that mirrors the host editor configuration without triggering callbacks.
 *
 * @param {import('@/index.js').Editor|null} editor - The primary editor instance to copy options from.
 * @param {HTMLElement} [element] - Optional DOM element to mount the measurement editor into.
 * @returns {import('@/index.js').Editor|null} A configured measurement editor instance, or null when no host editor is provided.
 */
export const createMeasurementEditor = (editor, element) => {
  if (!editor) return null;

  const extensions = getStarterExtensions();
  const filteredExtensions = extensions.filter((ext) => ext.name !== 'pagination');
  const measurementEditorElement = getMeasurementElement(element);

  const baseOptions = {
    ...(editor?.options ?? {}),
  };

  const measurementOptions = {
    ...baseOptions,
    element: measurementEditorElement,
    selector: null,
    role: 'viewer',
    documentMode: 'viewing',
    editable: false,
    pagination: false,
    isMeasurement: true,
    onBeforeCreate: noop,
    onCreate: noop,
    onUpdate: noop,
    onSelectionUpdate: noop,
    onTransaction: noop,
    onFocus: noop,
    onBlur: noop,
    onDestroy: noop,
    onTrackedChangesUpdate: noop,
    onCommentsUpdate: noop,
    onCommentsLoaded: noop,
    onCommentClicked: noop,
    onCommentLocationsUpdate: noop,
    onDocumentLocked: noop,
    onFirstRender: noop,
    onCollaborationReady: noop,
    onPaginationUpdate: noop,
    onException: noop,
    onListDefinitionsChange: noop,
    onContentError: ({ error }) => {
      throw error;
    },
    extensions: filteredExtensions,
    isMeasurementEditor: true,
  };

  return new Editor(measurementOptions);
};

const getMeasurementElement = (element) => {
  if (!!element && element instanceof HTMLElement) {
    return element;
  }

  const measurementElement = document.createElement('div');
  applyHiddenContainerStyles(measurementElement, {
    top: '-9999px',
    left: '-9999px',
  });
  document.body.appendChild(measurementElement);

  return measurementElement;
};
