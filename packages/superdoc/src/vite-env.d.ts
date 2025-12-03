/// <reference types="vite/client" />

// Global constants injected at build time
declare const __APP_VERSION__: string;
declare const __IS_DEBUG__: boolean;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

declare module '*.docx?url' {
  const content: string;
  export default content;
}

declare module '@superdoc/common/icons/*.svg?raw' {
  const content: string;
  export default content;
}

declare module '@superdoc/common/data/*.docx?url' {
  const content: string;
  export default content;
}
