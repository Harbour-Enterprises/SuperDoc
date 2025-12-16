export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const;
export const DOC = 'application/msword' as const;
export const PDF = 'application/pdf' as const;
export const HTML = 'text/html' as const;

export const documentTypes = {
  docx: DOCX,
  doc: DOC,
  pdf: PDF,
  html: HTML,
} as const;

export type DocumentType = typeof DOCX | typeof DOC | typeof PDF | typeof HTML;
