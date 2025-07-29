import { DOMParser } from 'prosemirror-model';
import { cleanHtmlUnnecessaryTags, convertEmToPt, handleHtmlPaste } from '../../InputRule.js';

function extractListLevelStyles(cssText, listId, level) {
  const pattern = new RegExp(`@list\\s+l${listId}:level${level}\\s*\\{([^}]+)\\}`, 'i');
  const match = cssText.match(pattern);
  if (!match) return null;

  const rawStyles = match[1]
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean);

  const styleMap = {};
  for (const style of rawStyles) {
    const [key, value] = style.split(':').map((s) => s.trim());
    styleMap[key] = value;
  }

  return styleMap;
}

const numDefMap = new Map([
  ['decimal', { def: 'decimal', abstractNum: 1 }],
  ['alpha-lower', { def: 'lowerLetter', abstractNum: 1 }],
  ['alpha-upper', { def: 'upperLetter', abstractNum: 1 }],
  ['roman-lower', { def: 'lowerRoman', abstractNum: 1 }],
  ['roman-upper', { def: 'upperRoman', abstractNum: 1 }],
  ['bullet', { def: 'bullet', abstractNum: 0 }],
]);

/**
 * Main handler for pasted DOCX content.
 *
 * @param {string} html The string being pasted
 * @param {Editor} editor The SuperEditor instance
 * @param {Object} view The ProseMirror view
 * @param {Object} plugin The plugin instance
 * @returns
 */
export const handleDocxPaste = (html, editor, view, plugin) => {
  const { converter } = editor;
  if (!converter || !converter.convertedXml) return handleHtmlPaste(html, editor);

  let cleanedHtml = convertEmToPt(html);
  cleanedHtml = cleanHtmlUnnecessaryTags(cleanedHtml);

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanedHtml;

  const paragraphs = tempDiv.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const innerHTML = p.innerHTML;

    // Looking only for lists to extract list info
    if (!innerHTML.includes('<!--[if !supportLists]')) return;

    const styleAttr = p.getAttribute('style') || '';
    const msoListMatch = styleAttr.match(/mso-list:\s*l(\d+)\s+level(\d+)\s+lfo(\d+)/);
    const css = tempDiv.querySelector('style').innerHTML;

    if (msoListMatch) {
      const [, abstractId, level, numId] = msoListMatch;

      // Get numbering format from Word styles
      const styles = extractListLevelStyles(css, abstractId, level);
      const msoNumFormat = styles['mso-level-number-format'] || 'decimal';
      const abstractOverride = numDefMap.get(msoNumFormat);

      if (!numId) return;

      const abstractDefinition = getListAbstractDefinition(
        abstractOverride ? abstractOverride.abstractNum : numId,
        editor,
      );
      let { lvlText, start, numFmt } = getLevelDefinition(abstractDefinition, level);

      // Define level text template for ordered lists
      if (abstractOverride.abstractNum === 1) lvlText = `%${level}.`;

      p.setAttribute('data-num-id', numId);
      p.setAttribute('data-list-level', level - 1);
      p.setAttribute('data-start', start);
      p.setAttribute('data-lvl-text', styles['mso-level-text'] || lvlText);
      p.setAttribute('data-num-fmt', abstractOverride.def || numFmt);

      const ptToPxRatio = 1.333;
      const indent = parseInt(styles['margin-left']) * ptToPxRatio || 0;
      if (indent > 0) p.setAttribute('data-left-indent', indent);
    }

    // Strip literal prefix inside conditional span
    extractAndRemoveConditionalPrefix(p);
  });

  transformWordLists(tempDiv);
  const doc = DOMParser.fromSchema(editor.schema).parse(tempDiv);
  tempDiv.remove();

  const { dispatch } = editor.view;
  if (!dispatch) return false;

  dispatch(view.state.tr.replaceSelectionWith(doc, true));
  return true;
};

const getLevelDefinition = (abstractDefinition, level) => {
  if (!abstractDefinition || !abstractDefinition.elements) return null;

  const levelElement = abstractDefinition.elements.find((el) => {
    return el.name === 'w:lvl' && el.attributes?.['w:ilvl'] == level;
  });

  if (!levelElement) return null;

  const { elements } = levelElement;
  const lvlText = elements.find((el) => el.name === 'w:lvlText')?.attributes?.['w:val'];
  const start = elements.find((el) => el.name === 'w:start')?.attributes?.['w:val'];
  const numFmt = elements.find((el) => el.name === 'w:numFmt')?.attributes?.['w:val'];
  return { lvlText, start, numFmt, elements };
};

const getListAbstractDefinition = (abstractId, editor) => {
  const { abstracts = {} } = editor?.converter?.numbering;
  return abstracts[abstractId] || null;
};

const transformWordLists = (container) => {
  const paragraphs = Array.from(container.querySelectorAll('p[data-num-id]'));

  const lists = {};

  for (const p of paragraphs) {
    const id = p.getAttribute('data-num-id');
    const level = parseInt(p.getAttribute('data-list-level'));
    const numFmt = p.getAttribute('data-num-fmt');
    const start = p.getAttribute('data-start');
    const lvlText = p.getAttribute('data-lvl-text');
    const indent = p.getAttribute('data-left-indent');

    if (!lists[id]) lists[id] = { levels: {} };
    const currentListByNumId = lists[id];

    if (!currentListByNumId.levels[level]) currentListByNumId.levels[level] = Number(start) || 1;
    else currentListByNumId.levels[level]++;

    // Reset deeper levels when this level is updated
    Object.keys(currentListByNumId.levels).forEach((key) => {
      const level1 = Number(key);
      if (level1 > level) {
        delete currentListByNumId.levels[level1];
      }
    });

    const path = generateListPath(level, currentListByNumId.levels, start);
    if (!path.length) path.push(currentListByNumId.levels[level]);

    const li = document.createElement('li');
    li.innerHTML = p.innerHTML;
    li.setAttribute('data-num-id', id);
    li.setAttribute('data-list-level', JSON.stringify(path));
    li.setAttribute('data-level', level);
    li.setAttribute('data-lvl-text', lvlText);
    li.setAttribute('data-num-fmt', numFmt);
    if (indent) li.setAttribute('data-indent', JSON.stringify({ left: indent }));

    if (p.hasAttribute('data-font-family')) {
      li.setAttribute('data-font-family', p.getAttribute('data-font-family'));
    }
    if (p.hasAttribute('data-font-size')) {
      li.setAttribute('data-font-size', p.getAttribute('data-font-size'));
    }

    const parentNode = p.parentNode;

    let listForLevel;
    const newList = numFmt === 'bullet' ? document.createElement('ul') : document.createElement('ol');
    newList.setAttribute('data-list-id', id);
    newList.level = level;

    parentNode.insertBefore(newList, p);
    listForLevel = newList;

    listForLevel.appendChild(li);
    p.remove();
  }
};

export const generateListPath = (level, levels, start) => {
  const iLvl = Number(level);
  const path = [];
  if (iLvl > 0) {
    for (let i = iLvl; i >= 0; i--) {
      if (!levels[i]) levels[i] = Number(start);
      path.unshift(levels[i]);
    }
  }
  return path;
};

function extractAndRemoveConditionalPrefix(p) {
  const nodes = Array.from(p.childNodes);
  let fontFamily = null;
  let fontSize = null;

  let start = -1,
    end = -1;
  nodes.forEach((node, index) => {
    if (node.nodeType === Node.COMMENT_NODE && node.nodeValue.includes('[if !supportLists]')) {
      start = index;
    }
    if (start !== -1 && node.nodeType === Node.COMMENT_NODE && node.nodeValue.includes('[endif]')) {
      end = index;
    }
  });

  if (start !== -1 && end !== -1) {
    for (let i = start + 1; i < end; i++) {
      const node = nodes[i];
      if (node.nodeType === Node.ELEMENT_NODE && node.style) {
        fontFamily = fontFamily || node.style.fontFamily;
        fontSize = fontSize || node.style.fontSize;
      }
    }

    // Remove all nodes in that range
    for (let i = end; i >= start; i--) {
      p.removeChild(p.childNodes[i]);
    }

    // Store on <p> as attributes
    if (fontFamily) p.setAttribute('data-font-family', fontFamily);
    if (fontSize) p.setAttribute('data-font-size', fontSize);
  }
}
