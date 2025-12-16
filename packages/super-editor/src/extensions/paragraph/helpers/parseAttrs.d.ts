export type ParsedParagraphAttrs = {
  paragraphProperties: Record<string, unknown> & { styleId?: string | null };
  extraAttrs: Record<string, string>;
  [key: string]: unknown;
};

export function parseAttrs(node: Element): ParsedParagraphAttrs;
