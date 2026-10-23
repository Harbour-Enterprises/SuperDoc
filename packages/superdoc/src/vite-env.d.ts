declare const __APP_VERSION__: string;

declare module '*.docx?url' {
  const url: string;
  export default url;
}
