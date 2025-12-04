/**
 * Additional type definitions specific to AIBuilder
 * @module ai-builder-types
 */

import type {Result} from './types';
import { AIBuilderPlan } from '../core';

/**
 * Record type with string keys and unknown values for maximum type safety
 */
export type SafeRecord = Record<string, unknown>;

/**
 * Interface for tool handler actions that can be either AIActionsService or AIActions.action
 */
export interface AIToolActions {
    findAll: (instruction: string) => Promise<Result>;
    highlight: (instruction: string, color?: string) => Promise<Result>;
    replaceAll: (instruction: string) => Promise<Result>;
    literalReplace: (
        findText: string,
        replaceText: string,
        options?: {caseSensitive?: boolean; trackChanges?: boolean}
    ) => Promise<Result>;
    insertTrackedChanges: (instruction: string) => Promise<Result>;
    insertComments: (instruction: string) => Promise<Result>;
    summarize: (instruction: string) => Promise<Result>;
    insertContent: (instruction: string, options?: {position?: 'before' | 'after' | 'replace'}) => Promise<Result>;
}

/**
 * Selection range for literalReplace operations
 */
export interface SelectionRange {
    from: number;
    to: number;
    text: string;
}

/**
 * Internal snapshot of editor selection state
 */
export interface SelectionSnapshot {
    from: number;
    to: number;
    text: string;
}

/**
 * Context snapshot passed to the planner
 */
export interface PlannerContextSnapshot {
    documentText: string;
    selectionText: string;
}

/**
 * Internal result from plan building
 */
export interface BuilderPlanResult {
    plan?: AIBuilderPlan;
    raw: string;
    warnings: string[];
    error?: string;
}


