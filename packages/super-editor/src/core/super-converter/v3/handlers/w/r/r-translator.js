// @ts-check
import { NodeTranslator } from '@translator';
import { exportSchemaToJson } from '../../../../exporter.js';
import { TrackFormatMarkName } from '@extensions/track-changes/constants.js';
import { parseMarks as parseV2Marks } from '../../../../v2/importer/markImporter.js';
import { translator as rPrTranslator } from '../rpr/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:r';

/**
 * Represent OOXML <w:r> as a SuperDoc mark named 'run'.
 * Content within the run is annotated; no separate node is introduced.
 */
/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_KEY_NAME = 'run';

/**
 * Internal: parse run properties produced by rPr translator into normalized flags
 * and a filtered list of run properties to carry forward.
 * Keeps attribute-specific parsing isolated for readability.
 * @param {Array<{xmlName: string, attributes: Record<string, any>}>} runPropsArray
 */
export const parseRunProperties = (runPropsArray = []) => {
  const normalizeBool = (v) => {
    if (v === undefined || v === null) return true;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (s === '0' || s === 'false' || s === 'off') return false;
    if (s === '1' || s === 'true' || s === 'on') return true;
    return true;
  };

  let isBold = false,
    isBoldOff = false,
    isItalic = false,
    isItalicOff = false,
    underlineType = null,
    underlineColor = null,
    underlineOff = false,
    fontFamily = null,
    textColor = null,
    fontSizePt = null,
    strikeOn = false,
    strikeOff = false,
    highlightColor = null,
    rStyleId = null;

  const filteredRunProps = [];
  runPropsArray.forEach((entry) => {
    if (!entry || !entry.xmlName) return;
    const { xmlName, attributes = {} } = entry;
    switch (xmlName) {
      case 'w:b': {
        const v = normalizeBool(attributes['w:val']);
        if (v) {
          isBold = true;
        } else {
          isBoldOff = true;
          // Preserve explicit OFF so decode can avoid injecting style-based bold
          filteredRunProps.push({ xmlName: 'w:b', attributes: { 'w:val': '0' } });
        }
        break; // otherwise exclude from carry-forward
      }
      case 'w:i': {
        const v = normalizeBool(attributes['w:val']);
        if (v) {
          isItalic = true;
        } else {
          isItalicOff = true;
          // Preserve explicit OFF so decode can avoid injecting style-based italic
          filteredRunProps.push({ xmlName: 'w:i', attributes: { 'w:val': '0' } });
        }
        break;
      }
      case 'w:u': {
        const raw = attributes['w:val'];
        const val = raw == null || raw === '' ? 'single' : String(raw);
        const colorRaw = attributes['w:color'];
        if (colorRaw && typeof colorRaw === 'string' && colorRaw.toLowerCase() !== 'auto')
          underlineColor = `#${colorRaw.toUpperCase()}`;
        if (val.toLowerCase() === 'none' || val === '0') underlineOff = true;
        else underlineType = val;
        break;
      }
      case 'w:color': {
        const raw = attributes['w:val'];
        const theme = attributes['w:themeColor'];
        if (raw && typeof raw === 'string' && raw.toLowerCase() !== 'auto') {
          textColor = `#${raw.toUpperCase()}`;
          break;
        }
        if (raw && typeof raw === 'string' && raw.toLowerCase() === 'auto') {
          textColor = 'auto';
          break;
        }
        if (theme && typeof theme === 'string') {
          textColor = `theme:${theme}`;
          break;
        }
        // fallthrough preserves as carry-forward
        filteredRunProps.push(entry);
        break;
      }
      case 'w:rStyle': {
        const sid = attributes['w:val'];
        if (sid) rStyleId = String(sid);
        filteredRunProps.push(entry);
        break;
      }
      case 'w:rFonts': {
        const a = attributes || {};
        fontFamily = a['w:ascii'] || a['w:eastAsia'] || a['w:hAnsi'] || a['w:val'] || null;
        // consume into textStyle; don't carry
        break;
      }
      case 'w:sz':
      case 'w:szCs': {
        const raw = attributes['w:val'];
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) fontSizePt = `${n / 2}pt`;
        break;
      }
      case 'w:strike': {
        const v = normalizeBool(attributes['w:val']);
        if (v) strikeOn = true;
        else strikeOff = true;
        break;
      }
      case 'w:highlight': {
        const raw = attributes['w:val'];
        if (typeof raw === 'string') highlightColor = raw.toLowerCase() === 'none' ? 'transparent' : raw;
        break;
      }
      case 'w:shd': {
        const fill = (attributes['w:fill'] || '').toString().toLowerCase();
        const shdVal = (attributes['w:val'] || '').toString().toLowerCase();
        if (fill && fill !== 'auto') highlightColor = `#${String(attributes['w:fill']).replace('#', '')}`;
        else if (shdVal === 'clear' || shdVal === 'nil' || shdVal === 'none') highlightColor = 'transparent';
        break;
      }
      default:
        filteredRunProps.push(entry);
    }
  });

  return {
    filteredRunProps,
    style: {
      isBold,
      isBoldOff,
      isItalic,
      isItalicOff,
      underlineType,
      underlineColor,
      underlineOff,
      fontFamily,
      textColor,
      fontSizePt,
      strikeOn,
      strikeOff,
      highlightColor,
      rStyleId,
    },
  };
};

/**
 * Encode <w:r> by translating its children and adding a run mark to each.
 * @param {import('@translator').SCEncoderConfig} params
 * @param {import('@translator').EncodedAttributes} [encodedAttrs]
 * @returns {import('@translator').SCEncoderResult}
 */
const encode = (params, encodedAttrs = {}) => {
  const { nodes = [], nodeListHandler } = params || {};
  const node = nodes[0];
  if (!node) return undefined;

  const elements = Array.isArray(node.elements) ? node.elements : [];
  const rPr = elements.find((n) => n.name === 'w:rPr');
  const rPrChange = rPr?.elements?.find((n) => n.name === 'w:rPrChange');

  const rPrOut = rPrTranslator.encode({ ...params, nodes: rPr ? [rPr] : [] }) || {};
  const runPropsArray = Array.isArray(rPrOut?.attributes) ? rPrOut.attributes : [];
  const { filteredRunProps, style } = parseRunProperties(runPropsArray);
  const {
    isBold,
    isBoldOff,
    isItalic,
    isItalicOff,
    underlineType,
    underlineColor,
    underlineOff,
    fontFamily,
    textColor,
    fontSizePt,
    strikeOn,
    strikeOff,
    highlightColor,
    rStyleId,
  } = style;

  const runAttrs = {
    ...encodedAttrs,
    runProperties: filteredRunProps.length ? filteredRunProps : null,
  };

  // Extract rStyle id for textStyle.styleId
  const rStyleEntry = runPropsArray.find((e) => e?.xmlName === 'w:rStyle');
  let rStyleIdValue = rStyleEntry?.attributes?.['w:val'] || null;

  // Merge styles.xml paragraph + run styles with inline, with precedence: inline > runStyle > parentStyle
  const stylesDoc = params?.docx?.['word/styles.xml'];
  const stylesRoot = stylesDoc?.elements?.[0]?.elements || [];
  const getStyleRprEntries = (styleId) => {
    if (!styleId) return [];
    const s = stylesRoot.find((el) => el.name === 'w:style' && el.attributes?.['w:styleId'] === styleId);
    const rpr = s?.elements?.find((el) => el.name === 'w:rPr');
    const els = Array.isArray(rpr?.elements) ? rpr.elements : [];
    return els.map((el) => ({ xmlName: el.name, attributes: { ...(el.attributes || {}) } }));
  };
  const parentEntries = getStyleRprEntries(params?.parentStyleId);
  const runStyleEntries = getStyleRprEntries(rStyleIdValue);
  const parentParsed = parseRunProperties(parentEntries);
  const runStyleParsed = parseRunProperties(runStyleEntries);

  const pick = (a, b, c) => a ?? b ?? c ?? null;
  const final = {
    // Booleans with OFF handling at inline level already processed later; here use presence:
    isBold: style.isBold || runStyleParsed.style.isBold || parentParsed.style.isBold,
    isItalic: style.isItalic || runStyleParsed.style.isItalic || parentParsed.style.isItalic,
    underlineType: pick(style.underlineType, runStyleParsed.style.underlineType, parentParsed.style.underlineType),
    underlineColor: pick(style.underlineColor, runStyleParsed.style.underlineColor, parentParsed.style.underlineColor),
    textColor: pick(style.textColor, runStyleParsed.style.textColor, parentParsed.style.textColor),
    fontFamily: pick(style.fontFamily, runStyleParsed.style.fontFamily, parentParsed.style.fontFamily),
    fontSizePt: pick(style.fontSizePt, runStyleParsed.style.fontSizePt, parentParsed.style.fontSizePt),
    strikeOn: style.strikeOn || runStyleParsed.style.strikeOn || parentParsed.style.strikeOn,
    highlightColor: pick(style.highlightColor, runStyleParsed.style.highlightColor, parentParsed.style.highlightColor),
  };

  // 2) Encode child content (exclude w:rPr from children passed to handler)
  const contentElements = elements.filter((el) => el.name !== 'w:rPr');
  const childParams = { ...params, nodes: contentElements };
  const content = nodeListHandler?.handler(childParams) || [];

  // 3) Apply the 'run' MARK to text content only
  const runMark = { type: SD_KEY_NAME, attrs: runAttrs };
  const marked = content.map((n) => {
    if (!n || n.type !== 'text') return n;
    /** @type {any} */
    const tnode = n;
    const marks = Array.isArray(tnode.marks) ? tnode.marks : [];
    const nextMarks = [...marks, runMark];
    // Remove any pre-existing bold mark when there's no inline bold (style-only)
    if (!isBold && !isBoldOff) {
      for (let i = nextMarks.length - 1; i >= 0; i--) {
        if (nextMarks[i]?.type === 'bold') nextMarks.splice(i, 1);
      }
    }
    // Bold: explicit OFF overrides; only emit for inline ON
    if (isBoldOff) {
      if (!nextMarks.some((m) => m.type === 'bold')) nextMarks.push({ type: 'bold', attrs: { value: '0' } });
    } else if (isBold) {
      if (!nextMarks.some((m) => m.type === 'bold')) nextMarks.push({ type: 'bold' });
    }
    // Remove any pre-existing italic mark when there's no inline italic (style-only)
    if (!isItalic && !isItalicOff) {
      for (let i = nextMarks.length - 1; i >= 0; i--) {
        if (nextMarks[i]?.type === 'italic') nextMarks.splice(i, 1);
      }
    }
    // Italic: explicit OFF overrides style-provided ON
    if (isItalicOff) {
      if (!nextMarks.some((m) => m.type === 'italic')) nextMarks.push({ type: 'italic', attrs: { value: '0' } });
    } else if (isItalic) {
      if (!nextMarks.some((m) => m.type === 'italic')) nextMarks.push({ type: 'italic' });
    }
    // Underline: only emit mark for inline w:u. Explicit OFF (inline w:u none) overrides.
    if (underlineOff) {
      if (!nextMarks.some((m) => m.type === 'underline'))
        nextMarks.push({ type: 'underline', attrs: { underlineType: 'none' } });
    } else if (underlineType) {
      const uType = underlineType;
      const uColor = underlineColor;
      if (!nextMarks.some((m) => m.type === 'underline'))
        nextMarks.push({ type: 'underline', attrs: { underlineType: uType, underlineColor: uColor } });
    }
    // Insert any run-level carry marks (e.g., hyperlink) after underline, before textStyle
    const carryMarks = Array.isArray(node?.marks) ? node.marks : [];
    if (carryMarks && carryMarks.length) {
      carryMarks.forEach((m) => {
        if (!nextMarks.some((x) => x.type === m.type)) nextMarks.push(m);
      });
    }
    if (
      textColor ||
      fontFamily ||
      fontSizePt ||
      rStyleIdValue ||
      /* color from styles intentionally ignored */ final.fontFamily ||
      final.fontSizePt
    ) {
      // Add or merge into textStyle mark. Merge against existing in nextMarks (may include paragraph-level marks).
      const existingIdx = nextMarks.findIndex((m) => m.type === 'textStyle');
      const c = textColor; // Only inline color should produce a mark
      const ff = fontFamily || final.fontFamily;
      const fs = fontSizePt || final.fontSizePt;
      if (existingIdx >= 0) {
        const merged = { ...(nextMarks[existingIdx]?.attrs || {}) };
        if (c) merged.color = c;
        if (ff) merged.fontFamily = ff;
        if (fs) merged.fontSize = fs;
        if (rStyleIdValue) merged.styleId = rStyleIdValue;
        nextMarks[existingIdx] = { type: 'textStyle', attrs: merged };
      } else {
        const attrs = {};
        if (c) attrs.color = c;
        if (ff) attrs.fontFamily = ff;
        if (fs) attrs.fontSize = fs;
        if (rStyleIdValue) attrs.styleId = rStyleIdValue;
        nextMarks.push({ type: 'textStyle', attrs });
      }
    }
    // Remove any pre-existing strike mark when there's no inline strike (style-only)
    if (!strikeOn && !strikeOff) {
      for (let i = nextMarks.length - 1; i >= 0; i--) {
        if (nextMarks[i]?.type === 'strike') nextMarks.splice(i, 1);
      }
    }
    // Strike: explicit OFF overrides ON
    if (strikeOff) {
      if (!nextMarks.some((m) => m.type === 'strike')) nextMarks.push({ type: 'strike', attrs: { value: '0' } });
    } else if (strikeOn) {
      if (!nextMarks.some((m) => m.type === 'strike')) nextMarks.push({ type: 'strike' });
    }
    const hlColor = highlightColor; // only inline highlights produce marks; style-only handled via decorations
    if (hlColor && !marks.some((m) => m.type === 'highlight'))
      nextMarks.push({ type: 'highlight', attrs: { color: hlColor } });

    // Attach TrackFormat mark when w:rPrChange is present
    if (rPrChange) {
      const beforeRpr = rPrChange.elements?.find((el) => el.name === 'w:rPr') || { elements: [] };
      const beforeMarks = parseV2Marks(beforeRpr) || [];
      // Ensure a textStyle mark placeholder exists to align with downstream expectations
      if (!beforeMarks.some((m) => m.type === 'textStyle')) {
        beforeMarks.push({ type: 'textStyle', attrs: {} });
      }
      const afterMarks = [];
      if (nextMarks.some((m) => m.type === 'bold')) afterMarks.push({ type: 'bold' });
      if (nextMarks.some((m) => m.type === 'italic')) afterMarks.push({ type: 'italic' });
      const u = nextMarks.find((m) => m.type === 'underline');
      if (u) afterMarks.push({ type: 'underline', attrs: { ...(u.attrs || {}) } });
      if (nextMarks.some((m) => m.type === 'strike')) afterMarks.push({ type: 'strike' });
      const hl = nextMarks.find((m) => m.type === 'highlight');
      if (hl) afterMarks.push({ type: 'highlight', attrs: { ...(hl.attrs || {}) } });
      const ts = nextMarks.find((m) => m.type === 'textStyle');
      afterMarks.push({ type: 'textStyle', attrs: { ...(ts?.attrs || {}) } });

      const fmtAttrs = {
        id: rPrChange.attributes?.['w:id'],
        date: rPrChange.attributes?.['w:date'],
        author: rPrChange.attributes?.['w:author'],
        before: beforeMarks,
        after: afterMarks,
      };
      const authorEmail = rPrChange.attributes?.['w:authorEmail'];
      if (authorEmail) fmtAttrs.authorEmail = authorEmail;
      nextMarks.push({ type: TrackFormatMarkName, attrs: fmtAttrs });
    }
    return { ...tnode, marks: nextMarks };
  });

  // 4) Return encoded result: prefer single child, else best-effort first
  if (marked.length === 1) return marked[0];
  if (marked.length > 1) return marked[0];
  return undefined;
};

/**
 * Decode a node carrying a 'run' mark back to <w:r> by wrapping its translation.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { node } = params || {};
  if (!node) return undefined;

  // 1) Separate run mark from other marks; keep bold/others so export can produce base rPr
  const marks = Array.isArray(node.marks) ? node.marks : [];
  const runMark = marks.find((m) => m.type === SD_KEY_NAME);
  const nodeWithoutRun = { ...node, marks: marks.filter((m) => m.type !== SD_KEY_NAME) };

  // 2) Export node without run mark; this will typically yield a w:r node
  const out = exportSchemaToJson(/** @type {any} */ ({ ...params, node: nodeWithoutRun }));
  if (!out) return undefined;

  // 3) Determine where to attach rPr (direct w:r or child run of a wrapper like w:hyperlink)
  const attachToRun = (n) => {
    if (!n) return null;
    if (n.name === 'w:r') return n;
    const childRun = (n.elements || []).find((el) => el.name === 'w:r');
    return childRun || null;
  };

  let runNode = attachToRun(out);
  let wrappedFromBare = false;
  if (!runNode) {
    // Wrap bare content (e.g., w:t) into a w:r so we can attach rPr
    runNode = { name: 'w:r', elements: [] };
    const rPr = { name: 'w:rPr', elements: [] };
    runNode.elements.push(rPr);
    if (out) runNode.elements.push(out);
    wrappedFromBare = true;
  }

  // 4) Merge stored runProperties into rPr, excluding bold (handled as a mark already)
  const runPropsArray = Array.isArray(runMark?.attrs?.runProperties) ? runMark.attrs.runProperties : [];
  if (runPropsArray.length) {
    let rPr = (runNode.elements || []).find((el) => el.name === 'w:rPr');
    if (!rPr) {
      rPr = { name: 'w:rPr', elements: [] };
      runNode.elements = runNode.elements ? [rPr, ...runNode.elements] : [rPr];
    }
    if (!Array.isArray(rPr.elements)) rPr.elements = [];

    const pushIfNotDup = (el) => {
      // Prevent duplicates by xmlName; allow multiple of different names
      const exists = rPr.elements.some((e) => e.name === el.name);
      if (!exists) rPr.elements.push(el);
    };

    runPropsArray.forEach((entry) => {
      if (!entry || !entry.xmlName) return;
      if (entry.xmlName === 'w:b') return; // bold handled by marks
      const el = { name: entry.xmlName, attributes: { ...(entry.attributes || {}) } };

      pushIfNotDup(el);
    });

    // If rStyle indicates a bold character style and no explicit inline OFF nor existing <w:b>, inject <w:b>
    const hasBoldXml = rPr.elements.some((e) => e.name === 'w:b');
    if (!hasBoldXml) {
      const rs = runPropsArray.find((e) => e?.xmlName === 'w:rStyle');
      const sid = rs?.attributes?.['w:val'];
      const styleIdLc = sid ? String(sid).toLowerCase() : '';
      const boldStyleIds = new Set(['strong', 'sd_boldchar', 'sd_linkedheadingchar']);
      if (boldStyleIds.has(styleIdLc) && !hasExplicitBoldOff) {
        rPr.elements.push({ name: 'w:b' });
      }
    }
  }

  // 5) If there is NO bold/italic mark, but rStyle indicates a known char style, inject <w:b>/<w:i>
  //    Respect explicit OFF in runProperties (e.g., <w:b w:val="0"> or <w:i w:val="0">) when present.
  const rStyleEntry = Array.isArray(runPropsArray) ? runPropsArray.find((e) => e?.xmlName === 'w:rStyle') : null;
  const sid = rStyleEntry?.attributes?.['w:val'];
  const styleId = sid ? String(sid).toLowerCase() : '';
  const ensureRpr = () => {
    let rPr = (runNode.elements || []).find((el) => el.name === 'w:rPr');
    if (!rPr) {
      rPr = { name: 'w:rPr', elements: [] };
      runNode.elements = runNode.elements ? [rPr, ...runNode.elements] : [rPr];
    }
    if (!Array.isArray(rPr.elements)) rPr.elements = [];
    return rPr;
  };

  // Detect explicit OFF in runProperties
  const hasExplicitBoldOff = Array.isArray(runPropsArray)
    ? runPropsArray.some((e) => {
        if (!e || e.xmlName !== 'w:b') return false;
        const v = e.attributes?.['w:val'];
        if (v === undefined || v === null) return false; // presence without value => ON
        const s = String(v).trim().toLowerCase();
        return s === '0' || s === 'false' || s === 'off';
      })
    : false;

  // Inject bold from style if no bold mark exists and not explicitly OFF
  const hasBoldMark = marks.some((m) => m.type === 'bold');
  if (!hasBoldMark && !hasExplicitBoldOff && styleId) {
    const boldStyleIds = new Set(['strong', 'sd_boldchar', 'sd_linkedheadingchar']);
    if (boldStyleIds.has(styleId)) {
      const rPr = ensureRpr();
      const hasBold = rPr.elements.some((e) => e.name === 'w:b');
      if (!hasBold) {
        console.warn('[decode:r] injecting w:b from styleId', styleId);
        rPr.elements.push({ name: 'w:b' });
      }
    }
  }

  // Fallback: if runProperties didn't carry rStyle, derive from textStyle mark's styleId
  if (!hasBoldMark && !hasExplicitBoldOff && !styleId) {
    const ts = marks.find((m) => m.type === 'textStyle');
    const sid2 = ts?.attrs?.styleId ? String(ts.attrs.styleId).toLowerCase() : '';
    if (sid2) {
      const rPr = ensureRpr();
      const hasBold = rPr.elements.some((e) => e.name === 'w:b');
      const boldStyleIds = new Set(['strong', 'sd_boldchar', 'sd_linkedheadingchar']);
      if (!hasBold && boldStyleIds.has(sid2)) {
        rPr.elements.push({ name: 'w:b' });
      }
    }
  }

  const hasExplicitItalicOff = Array.isArray(runPropsArray)
    ? runPropsArray.some((e) => {
        if (!e || e.xmlName !== 'w:i') return false;
        const v = e.attributes?.['w:val'];
        if (v === undefined || v === null) return false;
        const s = String(v).trim().toLowerCase();
        return s === '0' || s === 'false' || s === 'off';
      })
    : false;

  // Inject italic from style if no italic mark exists and not explicitly OFF
  const hasItalicMark = marks.some((m) => m.type === 'italic');
  if (!hasItalicMark && !hasExplicitItalicOff && styleId) {
    const italicStyleIds = new Set(['sd_italicstyle']);
    if (italicStyleIds.has(styleId)) {
      const rPr = ensureRpr();
      const hasItalic = rPr.elements.some((e) => e.name === 'w:i');
      if (!hasItalic) rPr.elements.push({ name: 'w:i' });
    }
  }

  // Final safety: ensure bold from rStyle or textStyle when applicable (no inline marks present)
  (() => {
    const rPr = ensureRpr();
    if (!rPr) return;
    const hasBoldXml = rPr.elements.some((e) => e.name === 'w:b');
    const hasBoldMark2 = marks.some((m) => m.type === 'bold');
    if (hasBoldXml || hasBoldMark2) return;
    // Check runProperties rStyle
    const rStyleEntry2 = Array.isArray(runPropsArray) ? runPropsArray.find((e) => e?.xmlName === 'w:rStyle') : null;
    const sid2 = rStyleEntry2?.attributes?.['w:val'];
    let styleId2 = sid2 ? String(sid2).toLowerCase() : '';
    if (!styleId2) {
      // Fallback to textStyle mark
      const ts2 = marks.find((m) => m.type === 'textStyle');
      styleId2 = ts2?.attrs?.styleId ? String(ts2.attrs.styleId).toLowerCase() : '';
    }
    if (!styleId2) return;
    const boldStyleIds2 = new Set(['strong', 'sd_boldchar', 'sd_linkedheadingchar']);
    if (boldStyleIds2.has(styleId2)) {
      console.warn('[decode:r] final bold inject from styleId', styleId2);
      rPr.elements.push({ name: 'w:b' });
    }
  })();

  return wrappedFromBare ? runNode : out;
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_KEY_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes: [],
};

/** @type {import('@translator').NodeTranslator} */
export const translator = NodeTranslator.from(config);
