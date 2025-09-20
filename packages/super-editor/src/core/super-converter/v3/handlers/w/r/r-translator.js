// @ts-check
import { NodeTranslator } from '@translator';
import { translateChildNodes } from '../../../../v2/exporter/helpers/index.js';
import { generateRunProps, processOutputMarks } from '../../../../exporter.js';
import {
  collectRunProperties,
  buildRunAttrs,
  applyRunMarks,
  deriveStyleMarks,
  mergeInlineMarkSets,
  mergeTextStyleAttrs,
  cloneMark,
  cloneRunAttrs,
  createRunPropertiesElement,
  cloneXmlNode,
  applyRunPropertiesTemplate,
} from './helpers/helpers.js';
import { splitRunProperties } from './helpers/split-run-properties.js';
import validXmlAttributes from './attributes/index.js';

/** @type {import('@translator').XmlNodeName} */
const XML_NODE_NAME = 'w:r';

/**
 * Represent OOXML <w:r> as a SuperDoc inline node named 'run'.
 * Content within the run is preserved as node children with applied marks.
 */
/** @type {import('@translator').SuperDocNodeOrKeyName} */
const SD_KEY_NAME = 'run';

const encode = (params, encodedAttrs = {}) => {
  const { nodes = [], nodeListHandler } = params || {};
  const runNode = nodes[0];
  if (!runNode) return undefined;

  const elements = Array.isArray(runNode.elements) ? runNode.elements : [];
  const rPrNode = elements.find((child) => child?.name === 'w:rPr');
  const contentElements = rPrNode ? elements.filter((el) => el !== rPrNode) : elements;

  const { entries: runPropEntries, hadRPr, styleChangeMarks } = collectRunProperties(params, rPrNode);
  const { remainingProps, inlineMarks, textStyleAttrs, runStyleId } = splitRunProperties(runPropEntries, params?.docx);

  const styleMarks = deriveStyleMarks({
    docx: params?.docx,
    paragraphStyleId: params?.parentStyleId,
    runStyleId,
  });

  const mergedInlineMarks = mergeInlineMarkSets(styleMarks.inlineMarks, inlineMarks);
  let mergedTextStyleAttrs = mergeTextStyleAttrs(styleMarks.textStyleAttrs, textStyleAttrs);
  if (runStyleId) {
    mergedTextStyleAttrs = mergedTextStyleAttrs
      ? { ...mergedTextStyleAttrs, styleId: runStyleId }
      : { styleId: runStyleId };
  }

  const runAttrs = buildRunAttrs(encodedAttrs, hadRPr, remainingProps);
  let runLevelMarks = Array.isArray(runNode.marks) ? runNode.marks.map((mark) => cloneMark(mark)) : [];
  if (styleChangeMarks?.length) {
    runLevelMarks = [...runLevelMarks, ...styleChangeMarks.map((mark) => cloneMark(mark))];
  }

  const childParams = { ...params, nodes: contentElements };
  const content = nodeListHandler?.handler(childParams) || [];

  const contentWithRunMarks = content.map((child) => {
    if (!child || typeof child !== 'object') return child;
    const baseMarks = Array.isArray(child.marks) ? child.marks.map((mark) => cloneMark(mark)) : [];
    if (!runLevelMarks.length) return child;
    return { ...child, marks: [...baseMarks, ...runLevelMarks.map((mark) => cloneMark(mark))] };
  });

  const marked = contentWithRunMarks.map((child) => applyRunMarks(child, mergedInlineMarks, mergedTextStyleAttrs));

  const filtered = marked.filter(Boolean);

  const runNodeResult = {
    type: SD_KEY_NAME,
    content: filtered,
  };

  const attrs = cloneRunAttrs(runAttrs);
  if (attrs && Object.keys(attrs).length) {
    if (attrs.runProperties == null) delete attrs.runProperties;
    if (Object.keys(attrs).length) runNodeResult.attrs = attrs;
  }

  if (runLevelMarks.length) {
    runNodeResult.marks = runLevelMarks.map((mark) => cloneMark(mark));
  }

  return runNodeResult;
};

const decode = (params, decodedAttrs = {}) => {
  const { node } = params || {};
  if (!node) return undefined;

  const runAttrs = node.attrs || {};
  const runProperties = Array.isArray(runAttrs.runProperties) ? runAttrs.runProperties : [];
  const exportParams = { ...params };
  if (!exportParams.editor) {
    exportParams.editor = { extensionService: { extensions: [] } };
  }

  const childElements = translateChildNodes(exportParams) || [];

  let runPropertiesElement = createRunPropertiesElement(runProperties);

  const markElements = processOutputMarks(Array.isArray(node.marks) ? node.marks : []);
  if (markElements.length) {
    if (!runPropertiesElement) {
      runPropertiesElement = generateRunProps(markElements);
    } else {
      if (!Array.isArray(runPropertiesElement.elements)) runPropertiesElement.elements = [];
      const existingNames = new Set(
        runPropertiesElement.elements.map((el) => el?.name).filter((name) => typeof name === 'string'),
      );
      markElements.forEach((element) => {
        if (!element || !element.name || existingNames.has(element.name)) return;
        runPropertiesElement.elements.push({ ...element, attributes: { ...(element.attributes || {}) } });
        existingNames.add(element.name);
      });
    }
  }

  const runPropsTemplate = runPropertiesElement ? cloneXmlNode(runPropertiesElement) : null;
  const applyBaseRunProps = (runNode) => applyRunPropertiesTemplate(runNode, runPropsTemplate);

  const runs = [];

  childElements.forEach((child) => {
    if (!child) return;
    if (child.name === 'w:r') {
      const clonedRun = cloneXmlNode(child);
      applyBaseRunProps(clonedRun);
      runs.push(clonedRun);
      return;
    }

    const runWrapper = { name: XML_NODE_NAME, elements: [] };
    applyBaseRunProps(runWrapper);
    if (!Array.isArray(runWrapper.elements)) runWrapper.elements = [];
    runWrapper.elements.push(cloneXmlNode(child));
    runs.push(runWrapper);
  });

  if (!runs.length) {
    const emptyRun = { name: XML_NODE_NAME, elements: [] };
    applyBaseRunProps(emptyRun);
    runs.push(emptyRun);
  }

  if (decodedAttrs && Object.keys(decodedAttrs).length) {
    runs.forEach((run) => {
      run.attributes = { ...(run.attributes || {}), ...decodedAttrs };
    });
  }

  if (runs.length === 1) {
    return runs[0];
  }

  return runs;
};

/** @type {import('@translator').NodeTranslatorConfig} */
export const config = {
  xmlName: XML_NODE_NAME,
  sdNodeOrKeyName: SD_KEY_NAME,
  type: NodeTranslator.translatorTypes.NODE,
  encode,
  decode,
  attributes: validXmlAttributes,
};

/** @type {import('@translator').NodeTranslator} */
export const translator = NodeTranslator.from(config);
