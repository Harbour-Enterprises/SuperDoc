/**
 * Build an input rule for automatically wrapping a textblock when a
 * given string is typed. When using a regular expresion you’ll
 * probably want the regexp to start with `^`, so that the pattern can
 * only occur at the start of a textblock.
 */
export function wrappingInputRule(config: any): InputRule;
import { InputRule } from '../InputRule.js';
