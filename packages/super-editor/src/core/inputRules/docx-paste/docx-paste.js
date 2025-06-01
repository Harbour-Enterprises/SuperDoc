import { DOMParser } from 'prosemirror-model';
import { convertEmToPt } from '../../InputRule.js';

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
  if (!converter || !converter.convertedXml) return handleHtmlPaste(html, editor, view, plugin);

  const cleanedHtml = convertEmToPt(html);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = cleanedHtml;

  const paragraphs = tempDiv.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const innerHTML = p.innerHTML;

    // Looking only for lists to extract list info
    if (!innerHTML.includes('<!--[if !supportLists]')) return;

    const styleAttr = p.getAttribute('style') || '';
    const msoListMatch = styleAttr.match(/mso-list:\s*l(\d+)\s+level(\d+)/);
    if (msoListMatch) {
      const [, abstractId, level] = msoListMatch;
      const listNumId = getListNumIdFromAbstract(abstractId, editor);
      if (!listNumId) return;

      const abstractDefinition = getListAbstractDefinition(abstractId, editor);
      const { lvlText, start, numFmt } = getLevelDefinition(abstractDefinition, level - 1);

      p.setAttribute('data-num-id', listNumId);
      p.setAttribute('data-list-level', level - 1);
      p.setAttribute('data-start', start);
      p.setAttribute('data-lvl-text', lvlText);
      p.setAttribute('data-num-fmt', numFmt);
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

const getListNumIdFromAbstract = (abstractId, editor) => {
  const { definitions } = editor?.converter?.numbering;
  if (!definitions) return null;

  const matchedDefinition = Object.values(definitions).find((def) => {
    return def.elements.some((el) => el.name === 'w:abstractNumId' && el.attributes?.['w:val'] == abstractId);
  });
  return matchedDefinition?.attributes?.['w:numId'];
};

const getListAbstractDefinition = (abstractId, editor) => {
  const { abstracts = {} } = editor?.converter?.numbering;
  return abstracts[abstractId] || null;
};

const transformWordLists = (container) => {
  const paragraphs = Array.from(container.querySelectorAll('p[data-num-id]'));
  const listMap = new Map();

  const listLevels = {};

  // Group paragraphs by abstractNum
  for (const p of paragraphs) {
    const listId = p.getAttribute('data-num-id');
    const level = parseInt(p.getAttribute('data-list-level'));
    const numFmt = p.getAttribute('data-num-fmt');
    const start = p.getAttribute('data-start');
    const lvlText = p.getAttribute('data-lvl-text');

    if (!listMap.has(listId)) listMap.set(listId, []);
    listMap.get(listId).push({ p, level, numFmt, start, lvlText });
  }

  for (const [id, items] of listMap.entries()) {
    if (!listLevels[id]) {
      listLevels[id] = {
        stack: [],
        counts: {},
        prevLevel: null,
      };
    }

    const parentStack = [];

    items.forEach(({ p, level, numFmt, start, lvlText }, index) => {
      const listLevel = generateListNestingPath(listLevels, id, level);

      const li = document.createElement('li');
      li.innerHTML = p.innerHTML;
      li.setAttribute('data-list-level', JSON.stringify(listLevel));
      li.setAttribute('data-num-id', id);
      li.setAttribute('data-lvl-text', lvlText);
      li.setAttribute('data-num-fmt', numFmt);

      if (p.hasAttribute('data-font-family')) {
        li.setAttribute('data-font-family', p.getAttribute('data-font-family'));
      }
      if (p.hasAttribute('data-font-size')) {
        li.setAttribute('data-font-size', p.getAttribute('data-font-size'));
      }

      const parentNode = p.parentNode;

      let listForLevel = parentStack[level];
      if (!listForLevel) {
        const newList = document.createElement('ol');
        newList.setAttribute('data-list-id', id);
        newList.level = level;

        if (level > 0) {
          const parentLi = parentStack[level - 1]?.querySelector('li:last-child');
          if (parentLi) parentLi.appendChild(newList);
        } else {
          parentNode.insertBefore(newList, p);
        }

        parentStack[level] = newList;
        parentStack.length = level + 1;
        listForLevel = newList;
      }

      listForLevel.appendChild(li);
      p.remove();
    });
  }
};

function generateListNestingPath(listLevels, listId, currentLevel) {
  const levelState = listLevels[listId];

  if (!levelState.stack) levelState.stack = [];
  if (levelState.prevLevel === undefined) levelState.prevLevel = null;

  if (levelState.prevLevel === null) {
    // Initialize with left-padding if starting at non-zero level
    levelState.stack = Array(currentLevel).fill(1).concat(1);
  } else {
    if (currentLevel > levelState.prevLevel) {
      levelState.stack.push(1);
    } else if (currentLevel === levelState.prevLevel) {
      levelState.stack[levelState.stack.length - 1]++;
    } else {
      levelState.stack = levelState.stack.slice(0, currentLevel + 1);
      levelState.stack[currentLevel] = (levelState.stack[currentLevel] || 1) + 1;
    }
  }

  levelState.prevLevel = currentLevel;
  return [...levelState.stack];
}

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
