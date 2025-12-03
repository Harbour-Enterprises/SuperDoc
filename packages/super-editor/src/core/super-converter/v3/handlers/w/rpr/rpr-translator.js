import { NodeTranslator } from '@translator';
import { createNestedPropertiesTranslator } from '@converter/v3/handlers/utils.js';
import { translator as boldTranslator } from '../b/b-translator.js';
import { translator as boldCsTranslator } from '../bCs/bCs-translator.js';
import { translator as borderTranslator } from '../bdr/bdr-translator.js';
import { translator as italicTranslator } from '../i/i-translator.js';
import { translator as underlineTranslator } from '../u/u-translator.js';
import { translator as strikeTranslator } from '../strike/strike-translator.js';
import { translator as dStrikeTranslator } from '../dstrike/dstrike-translator.js';
import { translator as colorTranslator } from '../color/color-translator.js';
import { translator as highlightTranslator } from '../highlight/highlight-translator.js';
import { translator as fontFamilyTranslator } from '../rFonts/rFonts-translator.js';
import { translator as runStyleTranslator } from '../rStyle/rstyle-translator.js';
import { translator as fontSizeTranslator } from '../sz/sz-translator.js';
import { translator as fontSizeCsTranslator } from '../szcs/szcs-translator.js';
import { translator as capsTranslator } from '../caps/caps-translator.js';
import { translator as shdTranslator } from '../shd/shd-translator.js';
import { translator as langTranslator } from '../lang/lang-translator.js';
import { translator as letterSpacingTranslator } from '../spacing/letter-spacing-translator.js';
import { translator as vertAlignTranslator } from '../vertAlign/vertAlign-translator.js';
import { translator as smallCapsTranslator } from '../smallCaps/smallCaps-translator.js';
import { translator as snapToGridTranslator } from '../snapToGrid/snapToGrid-translator.js';
import { translator as embossTranslator } from '../emboss/emboss-translator.js';
import { translator as imprintTranslator } from '../imprint/imprint-translator.js';
import { translator as noProofTranslator } from '../noProof/noProof-translator.js';
import { translator as oMathTranslator } from '../oMath/oMath-translator.js';

// Property translators for w:rPr child elements
// Each translator handles a specific property of the run properties
/** @type {import('@translator').NodeTranslatorConfig[]} */
export const propertyTranslators = [
  boldTranslator,
  boldCsTranslator,
  borderTranslator,
  embossTranslator,
  italicTranslator,
  underlineTranslator,
  strikeTranslator,
  dStrikeTranslator,
  colorTranslator,
  highlightTranslator,
  imprintTranslator,
  fontFamilyTranslator,
  runStyleTranslator,
  fontSizeTranslator,
  fontSizeCsTranslator,
  capsTranslator,
  shdTranslator,
  langTranslator,
  letterSpacingTranslator,
  noProofTranslator,
  oMathTranslator,
  vertAlignTranslator,
  smallCapsTranslator,
  snapToGridTranslator,
];

/**
 * The NodeTranslator instance for the w:rPr element.
 * @type {import('@translator').NodeTranslator}
 */
export const translator = NodeTranslator.from(
  createNestedPropertiesTranslator('w:rPr', 'runProperties', propertyTranslators),
);
