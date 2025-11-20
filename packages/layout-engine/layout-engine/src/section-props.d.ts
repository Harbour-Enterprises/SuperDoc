import type { FlowBlock } from '@superdoc/contracts';
export type SectionProps = {
  margins?: {
    header?: number;
    footer?: number;
  };
  pageSize?: {
    w: number;
    h: number;
  };
  columns?: {
    count: number;
    gap: number;
  };
  orientation?: 'portrait' | 'landscape';
};
/**
 * Pre-scan sectionBreak blocks and snapshot each DOCX-derived break (attrs.source==='sectPr')
 * so layout can safely clone a section's properties without mutating the source block array.
 */
export declare function computeNextSectionPropsAtBreak(blocks: FlowBlock[]): Map<number, SectionProps>;
//# sourceMappingURL=section-props.d.ts.map
