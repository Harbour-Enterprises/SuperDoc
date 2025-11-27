// Temporary ambient declarations for modules that need type declarations
// SVG imports with ?raw suffix
declare module '*.svg?raw' {
  const content: string;
  export default content;
}

// Vue component declarations for relative imports
declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Path alias declarations
declare module '@/utils/headless-helpers.js' {
  import type { Editor } from '../core/Editor.js';
  export const isHeadless: (editor: Editor | null | undefined) => boolean;
  export const shouldSkipNodeView: (editor: Editor | null | undefined) => boolean;
}

declare module '@superdoc/common/icons/*.svg?raw' {
  const content: string;
  export default content;
}

declare module './extensions/index.js' {
  const value: any;
  export default value;
  export const getStarterExtensions: any;
  export const getRichTextExtensions: any;
}

declare module './core/super-converter/SuperConverter' {
  export class SuperConverter {
    [key: string]: any;
  }
}

declare module './core/super-converter/zipper.js' {
  export const createZip: any;
}

declare module './extensions/image/imageHelpers/processUploadedImage.js' {
  export const getAllowedImageDimensions: any;
}

declare module './extensions/field-annotation/fieldAnnotationHelpers/index.js' {
  export const fieldAnnotationHelpers: any;
}

declare module './extensions/track-changes/trackChangesHelpers/index.js' {
  export const trackChangesHelpers: any;
}

declare module './extensions/track-changes/plugins/index.js' {
  export const TrackChangesBasePluginKey: any;
}

declare module './extensions/comment/comments-plugin.js' {
  export const CommentsPluginKey: any;
}

declare module '@helpers/annotator.js' {
  export const AnnotatorHelpers: any;
}

declare module '@extensions/structured-content/document-section/index.js' {
  export const SectionHelpers: any;
}

declare module './core/super-converter/v3/handlers/index.js' {
  export const registeredHandlers: any;
}

declare module './components/toolbar/super-toolbar.js' {
  export const SuperToolbar: any;
}

declare module '@superdoc/common/components/BasicUpload.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module './components/slash-menu/SlashMenu.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module './components/SuperEditor.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module './components/toolbar/Toolbar.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module './components/SuperInput.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module './components/toolbar/AIWriter.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Path aliases for @ imports
declare module '@/index.js' {
  export * from '../index.js';
}

declare module '@/core/PresentationEditor.js' {
  export * from '../core/PresentationEditor.js';
}

declare module '@/core/Editor.js' {
  export * from '../core/Editor.js';
}

declare module '@/core/helpers/getMarkRange.js' {
  export * from '../core/helpers/getMarkRange.js';
}

declare module '@/utils/styleIsolation.js' {
  export const createElementInContext: any;
  export const createStyleContext: any;
}

// External module declarations
declare module '@superdoc/common/data/blank.docx?url' {
  const url: string;
  export default url;
}

declare module '@superdoc/common/icons/*.svg' {
  const content: string;
  export default content;
}

declare module '@tiptap/pm/model' {
  export * from 'prosemirror-model';
}
