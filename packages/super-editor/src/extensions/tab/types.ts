import type { Node as PmNode } from 'prosemirror-model';

export type TabStopAlignment = 'start' | 'end' | 'center' | 'decimal' | 'bar' | 'clear' | 'left' | 'right' | 'num';
export type TabLeader = 'none' | 'dot' | 'hyphen' | 'underscore' | 'heavy' | 'middleDot';

export interface TabStopInput {
  /** Position in pixels from paragraph start */
  pos: number;
  val: TabStopAlignment;
  leader?: TabLeader;
  decimalChar?: string;
  tab?: {
    tabType?: TabStopAlignment;
    pos?: number;
    leader?: TabLeader;
    decimalChar?: string;
  };
}

export interface Indents {
  left: number;
  right: number;
  firstLine: number;
  hanging: number;
}

export interface TextSpan {
  type: 'text';
  spanId: string;
  text: string;
  style: Record<string, unknown>;
  from: number;
  to: number;
}

export interface TabSpan {
  type: 'tab';
  spanId: string;
  tabId: string;
  pos: number;
  nodeSize: number;
}

export interface LayoutRequest {
  paragraphId: string;
  revision: number;
  paragraphWidth: number;
  defaultTabDistance: number;
  defaultLineLength: number;
  indents: Indents;
  tabStops: TabStopInput[];
  spans: Array<TextSpan | TabSpan>;
  indentWidth?: number;
  paragraphNode?: PmNode;
}

export interface TabLayout {
  width: number;
  height?: number | string;
  alignment: TabStopAlignment | 'default';
  tabStopPosUsed: number | string;
  leader?: TabLeader;
}

export interface LayoutResult {
  paragraphId: string;
  revision: number;
  tabs: Record<string, TabLayout>;
}
