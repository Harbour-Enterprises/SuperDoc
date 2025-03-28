import './style.css';
import { SuperConverter } from './core/super-converter/SuperConverter';
import { getMarksFromSelection } from './core/helpers/getMarksFromSelection.js';
import { getActiveFormatting } from './core/helpers/getActiveFormatting.js';
import { getStarterExtensions, getRichTextExtensions } from './extensions/index.js';
import { SuperToolbar } from './components/toolbar/super-toolbar.js';
import { DocxZipper, helpers } from './core/index.js';
import { Editor } from './core/Editor.js';
import { createZip } from './core/super-converter/zipper.js';
import { getAllowedImageDimensions } from './extensions/image/imageHelpers/processUploadedImage.js';
import { Node, Attribute } from '@core/index.js';
import { Extension } from '@core/Extension.js';
import { Plugin } from 'prosemirror-state';

import SuperEditor from './components/SuperEditor.vue';
import BasicUpload from './dev/components/BasicUpload.vue';
import Toolbar from './components/toolbar/Toolbar.vue';
import SuperInput from './components/SuperInput.vue';
import * as fieldAnnotationHelpers from './extensions/field-annotation/fieldAnnotationHelpers/index.js';
import * as trackChangesHelpers from './extensions/track-changes/trackChangesHelpers/index.js';
import { TrackChangesBasePluginKey } from './extensions/track-changes/plugins/index.js';
import { CommentsPluginKey } from './extensions/comment/comments-plugin.js';

const Extensions = {
  Node,
  Attribute,
  Extension,
  Plugin,
};

/**
 * Exported classes and components.
 * @module exports
 * @see SuperConverter
 * @see DocxZipper
 * @see SuperEditor
 * @see Toolbar
 */
export {
  // Classes
  SuperConverter,
  DocxZipper,
  SuperToolbar,
  Editor,

  // Components
  SuperEditor,
  SuperInput,
  BasicUpload,
  Toolbar,

  // Helpers
  helpers,
  fieldAnnotationHelpers,
  trackChangesHelpers,
  getMarksFromSelection,
  getActiveFormatting,
  getStarterExtensions,
  getRichTextExtensions,
  createZip,
  getAllowedImageDimensions,

  // External extensions classes
  Extensions,

  TrackChangesBasePluginKey,
  CommentsPluginKey,
};
