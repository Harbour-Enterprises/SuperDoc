// Global type declarations for module resolution

// Vite asset imports
declare module '*.svg?raw' {
  const content: string;
  export default content;
}

declare module '*.docx?url' {
  const content: string;
  export default content;
}

// Super-editor module augmentations
declare module '@harbour-enterprises/super-editor/docx-zipper' {
  export * from '@harbour-enterprises/super-editor';
}

declare module '@harbour-enterprises/super-editor/toolbar' {
  export * from '@harbour-enterprises/super-editor';
}

declare module '@harbour-enterprises/super-editor/file-zipper' {
  export * from '@harbour-enterprises/super-editor';
}
