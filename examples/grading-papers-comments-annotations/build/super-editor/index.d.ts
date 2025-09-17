import { DocxZipper } from './core/index.js';
import { SuperToolbar } from './components/toolbar/super-toolbar.js';
import { Editor } from './core/Editor.js';
import { helpers } from './core/index.js';
import * as fieldAnnotationHelpers from './extensions/field-annotation/fieldAnnotationHelpers/index.js';
import * as trackChangesHelpers from './extensions/track-changes/trackChangesHelpers/index.js';
import { getMarksFromSelection } from './core/helpers/getMarksFromSelection.js';
import { getActiveFormatting } from './core/helpers/getActiveFormatting.js';
import { getStarterExtensions } from './extensions/index.js';
import { getRichTextExtensions } from './extensions/index.js';
import { createZip } from './core/super-converter/zipper.js';
import { getAllowedImageDimensions } from './extensions/image/imageHelpers/processUploadedImage.js';
export namespace Extensions {
    export { Node };
    export { Attribute };
    export { Extension };
    export { Plugin };
    export { Mark };
}
import { TrackChangesBasePluginKey } from './extensions/track-changes/plugins/index.js';
import { CommentsPluginKey } from './extensions/comment/comments-plugin.js';
import { Plugin } from 'prosemirror-state';
export { SuperConverter, DocxZipper, SuperToolbar, Editor, SuperEditor, SuperInput, BasicUpload, Toolbar, AIWriter, SlashMenu, helpers, fieldAnnotationHelpers, trackChangesHelpers, AnnotatorHelpers, SectionHelpers, getMarksFromSelection, getActiveFormatting, getStarterExtensions, getRichTextExtensions, createZip, getAllowedImageDimensions, TrackChangesBasePluginKey, CommentsPluginKey };
//# sourceMappingURL=index.d.ts.map