// @ts-check
import { NodeTranslator } from '@translator';
import { translateChildNodes } from '../../../../v2/exporter/helpers/index.js';
import { generateRunProps, processOutputMarks } from '../../../../exporter.js';
import { cloneMark, createRunPropertiesElement, cloneXmlNode, applyRunPropertiesTemplate } from './helpers/helpers.js';
import { ensureTrackedWrapper, prepareRunTrackingContext } from './helpers/track-change-helpers.js';
import { translator as wHyperlinkTranslator } from '../hyperlink/hyperlink-translator.js';
import { translator as wRPrTranslator } from '../rpr';
import validXmlAttributes from './attributes/index.js';
import { parseMarksFromRPr, handleStyleChangeMarksV2 } from '../../../../v2/importer/markImporter.js';
import { resolveRunProperties } from '@converter/styles.js';
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

  // Parsing run properties
  const rPrNode = elements.find((child) => child?.name === 'w:rPr');
  const runProperties = rPrNode ? wRPrTranslator.encode({ ...params, nodes: [rPrNode] }) : {};

  // Resolving run properties following style hierarchy
  const resolvedRunProperties = resolveRunProperties(params, runProperties, params?.parentStyleId);

  // Parsing marks from run properties
  const marks = parseMarksFromRPr(resolvedRunProperties, params?.docx) || [];
  const rPrChange = rPrNode?.elements?.find((el) => el.name === 'w:rPrChange');
  const styleChangeMarks = handleStyleChangeMarksV2(rPrChange, marks, params) || [];

  // Handling direct marks on the run node
  let runLevelMarks = Array.isArray(runNode.marks) ? runNode.marks.map((mark) => cloneMark(mark)) : [];
  if (styleChangeMarks?.length) {
    runLevelMarks = [...runLevelMarks, ...styleChangeMarks.map((mark) => cloneMark(mark))];
  }

  // Encoding child nodes within the run
  const contentElements = rPrNode ? elements.filter((el) => el !== rPrNode) : elements;
  const childParams = { ...params, nodes: contentElements };
  const content = nodeListHandler?.handler(childParams) || [];

  // Applying marks to child nodes
  const contentWithRunMarks = content.map((child) => {
    if (!child || typeof child !== 'object') return child;

    // Preserve existing marks on child nodes
    const baseMarks = Array.isArray(child.marks) ? child.marks : [];

    let childMarks = [...marks, ...baseMarks, ...runLevelMarks].map((mark) => cloneMark(mark));

    // De-duplicate marks by type, preserving order (later marks override earlier ones)
    const seenTypes = new Set();
    let textStyleMark;
    childMarks = childMarks.filter((mark) => {
      if (!mark || !mark.type) return false;
      if (seenTypes.has(mark.type)) {
        if (mark.type === 'textStyle') {
          // Merge textStyle attributes
          textStyleMark.attrs = { ...(textStyleMark.attrs || {}), ...(mark.attrs || {}) };
        }
        return false;
      }
      if (mark.type === 'textStyle') {
        textStyleMark = mark;
      }
      seenTypes.add(mark.type);
      return true;
    });

    // Apply marks to child nodes
    return { ...child, marks: childMarks };
  });

  const filtered = contentWithRunMarks.filter(Boolean);

  const runNodeResult = {
    type: SD_KEY_NAME,
    content: filtered,
    attrs: { ...encodedAttrs, runProperties: resolvedRunProperties },
  };

  if (runLevelMarks.length) {
    runNodeResult.marks = runLevelMarks;
  }

  return runNodeResult;
};

const decode = (params, decodedAttrs = {}) => {
  const { node } = params || {};
  if (!node) return undefined;

  // Separate links from regular text
  const isLinkNode = node.marks?.some((m) => m.type === 'link');
  if (isLinkNode) {
    const extraParams = {
      ...params.extraParams,
      linkProcessed: true,
    };
    return wHyperlinkTranslator.decode({ ...params, extraParams });
  }

  const { runNode: runNodeForExport, trackingMarksByType } = prepareRunTrackingContext(node);

  const runAttrs = runNodeForExport.attrs || {};
  const runProperties = Array.isArray(runAttrs.runProperties) ? runAttrs.runProperties : [];
  const exportParams = { ...params, node: runNodeForExport };
  if (!exportParams.editor) {
    exportParams.editor = { extensionService: { extensions: [] } };
  }

  const childElements = translateChildNodes(exportParams) || [];

  let runPropertiesElement = createRunPropertiesElement(runProperties);

  const markElements = processOutputMarks(Array.isArray(runNodeForExport.marks) ? runNodeForExport.marks : []);
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

    if (child.name === 'w:hyperlink') {
      const hyperlinkClone = cloneXmlNode(child);
      if (Array.isArray(hyperlinkClone.elements)) {
        hyperlinkClone.elements.forEach((run) => applyBaseRunProps(run));
      }
      runs.push(hyperlinkClone);
      return;
    }

    if (child.name === 'w:ins' || child.name === 'w:del') {
      const trackedClone = cloneXmlNode(child);
      if (Array.isArray(trackedClone.elements)) {
        trackedClone.elements.forEach((element) => {
          if (element?.name === 'w:r') applyBaseRunProps(element);
        });
      }
      runs.push(trackedClone);
      return;
    }

    const runWrapper = { name: XML_NODE_NAME, elements: [] };
    applyBaseRunProps(runWrapper);
    if (!Array.isArray(runWrapper.elements)) runWrapper.elements = [];
    runWrapper.elements.push(cloneXmlNode(child));
    runs.push(runWrapper);
  });

  const trackedRuns = ensureTrackedWrapper(runs, trackingMarksByType);

  if (!trackedRuns.length) {
    const emptyRun = { name: XML_NODE_NAME, elements: [] };
    applyBaseRunProps(emptyRun);
    trackedRuns.push(emptyRun);
  }

  if (decodedAttrs && Object.keys(decodedAttrs).length) {
    trackedRuns.forEach((run) => {
      run.attributes = { ...(run.attributes || {}), ...decodedAttrs };
    });
  }

  if (trackedRuns.length === 1) {
    return trackedRuns[0];
  }

  return trackedRuns;
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
