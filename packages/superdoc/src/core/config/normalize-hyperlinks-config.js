/**
 * Hyperlink activation is behavior, not a built-in UI surface. This profile
 * gives the top-level `hyperlinks` API precedence while preserving the
 * existing link-popover spellings.
 */

import { isPlainObject } from '../../helpers/object-guards.js';

/**
 * Resolve hyperlink activation behavior.
 *
 * A canonical handler remains active under `ui: false` because an application
 * may navigate or render its own interface. Without a canonical handler, the
 * existing UI suppression rules keep their current behavior.
 *
 * @param {Record<string, any>} [config] Raw consumer config.
 * @returns {{
 *   handler: import('../types/index.js').HyperlinkActivationHandler | import('../types/index.js').LinkPopoverResolver | undefined,
 *   handlerSource: 'hyperlinks.onActivate' | 'compatibility' | undefined,
 *   editableActivationDisabled: boolean,
 *   builtInEditorDisabled: boolean,
 *   interceptsNavigationOnly: boolean,
 * }}
 */
export function normalizeHyperlinksConfig(config = {}) {
  const canonical = isPlainObject(config.hyperlinks) ? config.hyperlinks : {};
  const hasCanonicalHandler = typeof canonical.onActivate === 'function';
  const ui = isPlainObject(config.ui) ? config.ui : {};
  const legacyUi = isPlainObject(ui.linkPopover) ? ui.linkPopover : {};

  const allActivationDisabled = config.hyperlinks === false;
  const builtInEditorDisabled = config.ui === false || ui.linkPopover === false;
  const selectedHandler = [
    { value: canonical.onActivate, source: 'hyperlinks.onActivate' },
    { value: legacyUi.popoverResolver, source: 'compatibility' },
    { value: config.modules?.links?.popoverResolver, source: 'compatibility' },
  ].find(({ value }) => value !== undefined);
  const editableActivationDisabled = allActivationDisabled || (!hasCanonicalHandler && builtInEditorDisabled);
  const handler =
    !editableActivationDisabled && typeof selectedHandler?.value === 'function' ? selectedHandler.value : undefined;

  return {
    handler,
    handlerSource: handler ? selectedHandler.source : undefined,
    editableActivationDisabled,
    builtInEditorDisabled,
    interceptsNavigationOnly: allActivationDisabled || hasCanonicalHandler,
  };
}
