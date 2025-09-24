// @ts-check
import { translator as rPrTranslator } from '../../rpr/index.js';
import { parseMarks, handleStyleChangeMarks } from '../../../../../v2/importer/markImporter.js';
import { EAST_ASIAN_CHARACTER_REGEX } from '../../../constants/east-asian-regex.js';

const containsEastAsianCharacters = (text) => EAST_ASIAN_CHARACTER_REGEX.test(text);

export const collectRunProperties = (params, rPrNode, translator = rPrTranslator) => {
  if (!rPrNode) return { entries: [], hadRPr: false, styleChangeMarks: [] };
  const result = translator.encode({ ...params, nodes: [rPrNode] }) || {};
  let entries = [];
  if (Array.isArray(result.attributes) && result.attributes.length) {
    entries = result.attributes.map((attr) => ({
      xmlName: attr?.xmlName,
      attributes: { ...(attr?.attributes || {}) },
    }));
  } else if (Array.isArray(rPrNode.elements) && rPrNode.elements.length) {
    entries = rPrNode.elements
      .filter((el) => el && typeof el === 'object')
      .map((el) => ({
        xmlName: el.name,
        attributes: { ...(el.attributes || {}) },
      }));
  }
  const legacyMarks = parseMarks(rPrNode, [], params?.docx) || [];
  const styleChangeMarks = handleStyleChangeMarks(rPrNode, legacyMarks) || [];
  return { entries, hadRPr: true, styleChangeMarks };
};

export const buildRunAttrs = (encodedAttrs = {}, hadRPr, runProps) => {
  /** @type {Record<string, any>} */
  const base = { ...(encodedAttrs || {}) };
  if (hadRPr) {
    base.runProperties = runProps.length ? runProps : null;
  }
  return base;
};

const ensureInlineMarks = (marks, inlineMarks = []) => {
  inlineMarks.forEach(({ type, attrs }) => {
    if (!type) return;
    if (marks.some((mark) => mark?.type === type)) return;
    marks.push(attrs ? { type, attrs: { ...attrs } } : { type });
  });
};

const ensureTextStyleMark = (marks, textStyleAttrs) => {
  if (!textStyleAttrs) return;
  const existingTextStyle = marks.find((mark) => mark?.type === 'textStyle');
  if (existingTextStyle) {
    existingTextStyle.attrs = { ...(existingTextStyle.attrs || {}), ...textStyleAttrs };
    return;
  }
  marks.push({ type: 'textStyle', attrs: { ...textStyleAttrs } });
};

export const normalizeTextStyleAttrsForNode = (textStyleAttrs, node) => {
  if (!textStyleAttrs || typeof textStyleAttrs !== 'object') return null;

  const normalized = { ...textStyleAttrs };
  const eastAsiaFont = normalized.eastAsiaFontFamily;

  if (eastAsiaFont) {
    delete normalized.eastAsiaFontFamily;
    const text = typeof node?.text === 'string' ? node.text : null;
    const shouldUseEastAsia = typeof text === 'string' && containsEastAsianCharacters(text);

    if (shouldUseEastAsia) {
      normalized.fontFamily = eastAsiaFont;
    }
  }

  return Object.keys(normalized).length ? normalized : null;
};

export const applyRunMarks = (node, inlineMarks, textStyleAttrs) => {
  if (!node || typeof node !== 'object') return node;

  const baseMarks = Array.isArray(node.marks) ? node.marks : [];
  const marks = baseMarks.map((mark) => cloneMark(mark));

  ensureInlineMarks(marks, inlineMarks);

  // Only apply textStyle attributes to text nodes; preserve existing textStyle marks on others.
  if (node.type === 'text') {
    const normalizedTextStyle = normalizeTextStyleAttrsForNode(textStyleAttrs, node);
    ensureTextStyleMark(marks, normalizedTextStyle);
  }

  return { ...node, marks };
};

export const deriveStyleMarks = ({ docx, paragraphStyleId, runStyleId }) => {
  const paragraphStyleMarks = collectStyleMarks(paragraphStyleId, docx);
  const runStyleMarks = collectStyleMarks(runStyleId, docx);

  const inlineMarks = mergeInlineMarkSets(paragraphStyleMarks.inlineMarks, runStyleMarks.inlineMarks);
  const textStyleAttrs = mergeTextStyleAttrs(paragraphStyleMarks.textStyleAttrs, runStyleMarks.textStyleAttrs);

  return { inlineMarks, textStyleAttrs };
};

export const collectStyleMarks = (styleId, docx, seen = new Set()) => {
  if (!styleId || !docx || seen.has(styleId)) return { inlineMarks: [], textStyleAttrs: null };

  seen.add(styleId);
  const chain = collectStyleChain(styleId, docx, seen);
  if (!chain.length) return { inlineMarks: [], textStyleAttrs: null };

  const inlineMap = new Map();
  let textStyleAttrs = {};

  chain.forEach((styleTag) => {
    const marks = extractMarksFromStyle(styleTag, docx);
    marks.inlineMarks.forEach((mark) => {
      inlineMap.set(mark.type, mark.attrs ? { type: mark.type, attrs: { ...mark.attrs } } : { type: mark.type });
    });
    if (marks.textStyleAttrs) textStyleAttrs = { ...textStyleAttrs, ...marks.textStyleAttrs };
  });

  return {
    inlineMarks: Array.from(inlineMap.values()),
    textStyleAttrs: Object.keys(textStyleAttrs).length ? textStyleAttrs : null,
  };
};

export const collectStyleChain = (styleId, docx, seen) => {
  if (!styleId || !docx) return [];
  const styleTag = findStyleTag(docx, styleId);
  if (!styleTag || !styleTag.elements) return [];

  const basedOn = styleTag.elements?.find((el) => el.name === 'w:basedOn')?.attributes?.['w:val'];

  let chain = [];
  if (basedOn && !seen.has(basedOn)) {
    seen.add(basedOn);
    chain = collectStyleChain(basedOn, docx, seen);
  }
  chain.push(styleTag);
  return chain;
};

export const findStyleTag = (docx, styleId) => {
  const stylesFile = docx?.['word/styles.xml'];
  if (!stylesFile?.elements?.length) return null;

  const candidates = [];
  stylesFile.elements.forEach((el) => {
    if (!el) return;
    if (el.name === 'w:styles' && Array.isArray(el.elements)) {
      el.elements.forEach((child) => {
        if (child?.name === 'w:style') candidates.push(child);
      });
      return;
    }
    if (el.name === 'w:style') {
      candidates.push(el);
      return;
    }
    if (Array.isArray(el.elements)) {
      el.elements.forEach((child) => {
        if (child?.name === 'w:style') candidates.push(child);
      });
    }
  });

  return candidates.find((tag) => tag?.attributes?.['w:styleId'] === styleId) || null;
};

export const extractMarksFromStyle = (styleTag, docx) => {
  const rPr = styleTag?.elements?.find((el) => el.name === 'w:rPr');
  if (!rPr) return { inlineMarks: [], textStyleAttrs: null };

  const marks = parseMarks(rPr, [], docx) || [];
  const inlineMarks = [];
  let textStyleAttrs = {};

  marks.forEach((mark) => {
    if (!mark) return;
    if (mark.type === 'textStyle') {
      const attrs = mark.attrs || {};
      if (Object.keys(attrs).length) textStyleAttrs = { ...textStyleAttrs, ...attrs };
      return;
    }
    if (mark.type) inlineMarks.push(mark.attrs ? { type: mark.type, attrs: { ...mark.attrs } } : { type: mark.type });
  });

  return {
    inlineMarks,
    textStyleAttrs: Object.keys(textStyleAttrs).length ? textStyleAttrs : null,
  };
};

export const mergeInlineMarkSets = (...markSets) => {
  const map = new Map();
  markSets.filter(Boolean).forEach((marks) => {
    marks.forEach((mark) => {
      if (!mark || !mark.type) return;
      map.set(mark.type, mark.attrs ? { type: mark.type, attrs: { ...mark.attrs } } : { type: mark.type });
    });
  });
  return Array.from(map.values());
};

export const mergeTextStyleAttrs = (...attrsList) => {
  const merged = attrsList
    .filter((attrs) => attrs && Object.keys(attrs).length)
    .reduce((acc, attrs) => ({ ...acc, ...attrs }), {});
  return Object.keys(merged).length ? merged : null;
};

export const cloneRunAttrs = (attrs) => {
  const clone = { ...attrs };
  if (Array.isArray(attrs?.runProperties)) {
    clone.runProperties = attrs.runProperties.map((entry) => ({
      xmlName: entry?.xmlName,
      attributes: { ...(entry?.attributes || {}) },
    }));
  }
  return clone;
};

export const cloneMark = (mark) => {
  if (!mark || typeof mark !== 'object') return mark;
  const cloned = { ...mark };
  if (mark.attrs && typeof mark.attrs === 'object') {
    cloned.attrs = { ...mark.attrs };
    if (Array.isArray(mark.attrs.runProperties)) {
      cloned.attrs.runProperties = mark.attrs.runProperties.map((entry) => ({
        xmlName: entry?.xmlName,
        attributes: { ...(entry?.attributes || {}) },
      }));
    }
  }
  return cloned;
};

export const normalizeBool = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'off') return false;
  if (normalized === '1' || normalized === 'true' || normalized === 'on') return true;
  return true;
};

export const createRunPropertiesElement = (entries = []) => {
  if (!Array.isArray(entries) || !entries.length) return null;

  const elements = entries
    .map((entry) => {
      if (!entry || !entry.xmlName) return null;
      return {
        name: entry.xmlName,
        attributes: { ...(entry.attributes || {}) },
      };
    })
    .filter(Boolean);

  if (!elements.length) return null;

  return {
    name: 'w:rPr',
    elements,
  };
};

export const cloneXmlNode = (nodeLike) => {
  if (!nodeLike || typeof nodeLike !== 'object') return nodeLike;
  return {
    name: nodeLike.name,
    type: nodeLike.type,
    attributes: nodeLike.attributes ? { ...nodeLike.attributes } : undefined,
    elements: Array.isArray(nodeLike.elements) ? nodeLike.elements.map((el) => cloneXmlNode(el)) : undefined,
    text: nodeLike.text,
  };
};

export const applyRunPropertiesTemplate = (runNode, runPropertiesTemplate) => {
  if (!runNode || !runPropertiesTemplate) return;

  if (!Array.isArray(runNode.elements)) runNode.elements = [];
  let runProps = runNode.elements.find((el) => el?.name === 'w:rPr');
  if (!runProps) {
    runProps = { name: 'w:rPr', elements: [] };
    runNode.elements.unshift(runProps);
  }

  if (!Array.isArray(runProps.elements)) runProps.elements = [];

  if (runPropertiesTemplate.attributes) {
    runProps.attributes = {
      ...(runProps.attributes || {}),
      ...runPropertiesTemplate.attributes,
    };
  }

  const isValidRunPropName = (name) => typeof name === 'string' && name.includes(':');

  runProps.elements = runProps.elements.filter((entry) => isValidRunPropName(entry?.name));

  const existingNames = new Set(runProps.elements.map((el) => el?.name));

  (runPropertiesTemplate.elements || []).forEach((entry) => {
    if (!isValidRunPropName(entry?.name) || existingNames.has(entry.name)) return;
    runProps.elements.push(cloneXmlNode(entry));
    existingNames.add(entry.name);
  });
};
