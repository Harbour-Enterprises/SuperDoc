/**
 * `styles.getTheme`: read-only projection of the document theme.
 *
 * Returns the theme colors, theme fonts and `w:clrSchemeMapping` without the
 * rest of the document. The theme has the same shape and values as
 * `doc.get().theme`; both are read from the same compiled style model.
 *
 * Engine-agnostic: no ProseMirror, Yjs, or converter imports.
 */

import { DocumentApiValidationError } from '../errors.js';
import type { SDTheme } from '../types/sd-styles.js';
import { isRecord } from '../object-guards.js';
import type { StyleCatalogDiagnostic, StyleSourcePartStatus } from './catalog.js';

/** `styles.getTheme` takes no options. */
export type StylesGetThemeInput = Record<string, never>;

/**
 * Status of the package parts the theme is read from. A `missing` or
 * `malformed` theme part still yields a theme: the default Office theme,
 * labeled `source: 'fallback'`.
 */
export interface StylesThemeSourceStatus {
  theme: StyleSourcePartStatus;
  /** `word/settings.xml`, which carries `w:clrSchemeMapping`. */
  settings: StyleSourcePartStatus;
}

export interface StylesGetThemeResult {
  /** Always present. `source` says whether it is the document's own theme or the Office fallback. */
  theme: SDTheme & { source: 'document' | 'fallback' };
  sourceStatus: StylesThemeSourceStatus;
  diagnostics: StyleCatalogDiagnostic[];
}

export interface StylesGetThemeAdapter {
  getTheme(input?: StylesGetThemeInput): StylesGetThemeResult;
}

/** Validates `styles.getTheme` input. `undefined` and `{}` are the only valid calls. */
export function validateStylesGetThemeInput(input?: StylesGetThemeInput): void {
  if (input === undefined) return;

  if (!isRecord(input)) {
    throw new DocumentApiValidationError('INVALID_INPUT', 'styles.getTheme input must be a non-null object.');
  }

  const [key] = Object.keys(input);
  if (key !== undefined) {
    throw new DocumentApiValidationError(
      'INVALID_INPUT',
      `Unknown field "${key}" on styles.getTheme input. styles.getTheme takes no fields.`,
      { field: key },
    );
  }
}

/**
 * Executes `styles.getTheme` using the provided adapter.
 * Validates input, then delegates to the adapter.
 */
export function executeStylesGetTheme(
  adapter: Partial<StylesGetThemeAdapter> | null | undefined,
  input?: StylesGetThemeInput,
): StylesGetThemeResult {
  validateStylesGetThemeInput(input);
  if (typeof adapter?.getTheme !== 'function') {
    throw new DocumentApiValidationError(
      'CAPABILITY_UNAVAILABLE',
      'styles.getTheme is not available. The host engine has not provided an adapter for this capability.',
      { operation: 'styles.getTheme' },
    );
  }
  return adapter.getTheme(input);
}
