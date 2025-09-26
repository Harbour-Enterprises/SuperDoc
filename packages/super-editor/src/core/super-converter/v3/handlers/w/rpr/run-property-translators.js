// @ts-check
import { translator as boldTranslator } from '../b/b-translator.js';
import { translator as italicTranslator } from '../i/i-translator.js';
import { translator as underlineTranslator } from '../u/u-translator.js';
import { translator as strikeTranslator } from '../strike/strike-translator.js';
import { translator as colorTranslator } from '../color/color-translator.js';
import { translator as highlightTranslator } from '../highlight/highlight-translator.js';
import { translator as fontFamilyTranslator } from '../rFonts/rFonts-translator.js';
import { translator as runStyleTranslator } from '../rStyle/rstyle-translator.js';
import { translator as fontSizeTranslator } from '../sz/sz-translator.js';
import { translator as fontSizeCsTranslator } from '../szcs/szcs-translator.js';
import { translator as capsTranslator } from '../caps/caps-translator.js';

/**
 * Map of OOXML run property element names to their translators.
 * These translators emit attribute-shaped payloads that can be aggregated onto the run mark.
 * @type {Record<string, import('@translator').NodeTranslator>}
 */
export const runPropertyTranslators = Object.freeze({
  'w:b': boldTranslator,
  'w:i': italicTranslator,
  'w:u': underlineTranslator,
  'w:strike': strikeTranslator,
  'w:color': colorTranslator,
  'w:highlight': highlightTranslator,
  'w:rFonts': fontFamilyTranslator,
  'w:rStyle': runStyleTranslator,
  'w:sz': fontSizeTranslator,
  'w:szCs': fontSizeCsTranslator,
  'w:caps': capsTranslator,
});

/**
 * Valid child names that do not yet have dedicated translators but should still be preserved verbatim.
 * @type {readonly string[]}
 */
export const rawRunPropertyXmlNames = Object.freeze(['w:lang', 'w:shd']);
