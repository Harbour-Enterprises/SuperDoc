import {
  SuperConverter,
  Editor,
  getRichTextExtensions,
  createZip,
  Extensions,
  registeredHandlers,
} from '@harbour-enterprises/super-editor';
import {
  helpers as superEditorHelpers,
  fieldAnnotationHelpers,
  trackChangesHelpers,
  AnnotatorHelpers,
  SectionHelpers,
} from '@harbour-enterprises/super-editor';
import { DOCX, PDF, HTML, getFileObject, compareVersions } from '@superdoc/common';
import BlankDOCX from '@superdoc/common/data/blank.docx?url';

// Beta channel note: keep this file touched so CI picks up prerelease runs
export { SuperDoc } from './core/SuperDoc.js';
export {
  BlankDOCX,
  getFileObject,
  compareVersions,
  Editor,
  getRichTextExtensions,

  // Allowed types
  DOCX,
  PDF,
  HTML,

  // Helpers
  superEditorHelpers,
  fieldAnnotationHelpers,
  trackChangesHelpers,
  AnnotatorHelpers,
  SectionHelpers,

  // Super Editor
  SuperConverter,
  createZip,

  // Custom extensions
  Extensions,
  registeredHandlers,
};
