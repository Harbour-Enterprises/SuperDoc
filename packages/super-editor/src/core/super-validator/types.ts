import type { Editor } from '../Editor.js';
import type { Node, Mark } from 'prosemirror-model';
import type { Transaction } from 'prosemirror-state';

export interface SuperValidatorOptions {
  editor: Editor;
  dryRun?: boolean;
  debug?: boolean;
}

export interface ValidatorLogger {
  debug: (...args: unknown[]) => void;
  withPrefix: (prefix: string) => ValidatorLogger;
}

export interface ValidationResult {
  modified: boolean;
  results: string[];
}

export type StateValidator = (editor: Editor, logger: ValidatorLogger) => ValidationResult;

export type XmlValidator = (editor: Editor, logger: ValidatorLogger) => ValidationResult;

export interface ElementInfo {
  node?: Node;
  pos: number;
  from?: number;
  to?: number;
  mark?: Mark;
}

export type DocumentAnalysis = Record<string, ElementInfo[]>;

export interface ValidatorRequirements {
  nodes?: string[];
  marks?: string[];
}

export type ValidatorFn = (tr: Transaction, analysis: DocumentAnalysis) => ValidationResult;

export type ValidatorFunction = ValidatorFn & { requiredElements?: ValidatorRequirements };
