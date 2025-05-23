import { Node, Attribute } from '@core/index.js';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { generateOrderedListIndex } from '@helpers/orderedListUtils.js';
import { findChildren, getMarkType } from '@core/helpers/index.js';
import { parseSizeUnit } from '@core/utilities/index.js';
import { styledListMarker } from './helpers/styledListMarkerPlugin.js';
import { findParentNode } from '@helpers/index.js';
import { LinkedStylesPluginKey } from '../linked-styles/linked-styles.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { getStyleTagFromStyleId, getAbstractDefinition, getDefinitionForLevel } from '../../core/super-converter/v2/importer/listImporter.js';

export const ListItem = Node.create({
  name: 'listItem',

  content: 'paragraph* block*',

  defining: true,

  priority: 101, // to run listItem commands first

  addOptions() {
    return {
      htmlAttributes: {},
      bulletListTypeName: 'bulletList',
      orderedListTypeName: 'orderedList',
    };
  },

  parseDOM() {
    return [{ tag: 'li' }];
  },

  renderDOM({ htmlAttributes }) {
   return ['li', Attribute.mergeAttributes(this.options.htmlAttributes, htmlAttributes), 0];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const { attrs } = node;
      const { listLevel, listNumberingType, lvlText, numId, level } = attrs;

      let orderMarker = '';
      if (listLevel) {
        orderMarker = generateOrderedListIndex({
          listLevel,
          lvlText,
          listNumberingType,
        });
      }

      // Turn any textIndent ("0.25in" or "24px") into a pixel value:
      function parseIndent(val) {
        if (!val) return 0;
        if (val.endsWith('in')) return parseFloat(val) * 96;
        if (val.endsWith('px')) return parseFloat(val);
        return parseFloat(val) * 96;
      }

      // Build the <li> and style it:
      const dom = document.createElement('li');
      dom.style.position  = 'relative';
      dom.style.listStyle = 'none';
      dom.style.display = 'flex';

      const defs = getListItemStyleDefinitions({ node, numId, level, editor });

      // Get any style based decorations from the linked styles plugin:
      const { state } = editor.view;
      const $pos = editor.view.state.doc.resolve(getPos())
      const pos = $pos.start($pos.depth);
      const linkedStyles = LinkedStylesPluginKey.getState(state)?.decorations;
      const decorationsInPlace = linkedStyles.find(pos, pos + node.nodeSize);
      const styleDeco = decorationsInPlace.find((dec) => dec.type.attrs?.style);
      const style = styleDeco?.type.attrs?.style;
      const stylesArray = style?.split(';') || [];
      const fontSizeFromStyles = stylesArray.find((s) => s.includes('font-size'))?.split(':')[1].trim();
      const fontFamilyFromStyles = stylesArray.find((s) => s.includes('font-family'))?.split(':')[1].trim();

      const textStyleType = getMarkType('textStyle', editor.schema);
      const marks = getListItemTextStyleMarks(node, textStyleType);

      const textStyleMarks = [...marks.filter((m) => m.type === textStyleType)];
      const textMarks = marks.filter((mark) => mark.type === textStyleType);
      textStyleMarks.push(...textMarks);
      let fontSizeFromContent;
      let fontFamilyFromContent;
      textStyleMarks.forEach((mark) => {
        let { attrs } = mark;
  
        if (attrs.fontSize) {
          let [value, unit] = parseSizeUnit(attrs.fontSize);
          if (!Number.isNaN(value)) {
            unit = unit ?? 'pt';
            fontSizeFromContent = `${value}${unit}`;
          }
        }
  
        if (attrs.fontFamily) {
          fontFamilyFromContent = attrs.fontFamily;
        }
      });

      //TODO: Set the indentation and spacing from styles 

      // Place the custom marker:
      const numberDom = document.createElement('span');
      numberDom.textContent = orderMarker;
      numberDom.style.paddingRight = '10px'; // TODO: Make this dynamic
      numberDom.style.fontSize = fontSizeFromStyles || fontSizeFromContent || 'inherit';
      numberDom.style.fontFamily = fontFamilyFromStyles || fontFamilyFromContent || 'inherit';
      dom.appendChild(numberDom);
  
      // Place and style the content dom
      const contentDOM = document.createElement('div');
      contentDOM.style.margin = '0';
      contentDOM.style.padding = '0';
      contentDOM.style.display = 'inline-block';
      dom.appendChild(contentDOM);
  
      return { dom, contentDOM };
    }
  },
  
  addAttributes() {
    return {
      // Virtual attribute.
      // markerType: {
      //   default: null,
      //   renderDOM: (attrs) => {
      //     let { listLevel, listNumberingType, lvlText } = attrs;
      //     let hasListLevel = !!listLevel?.length;

      //     if (!hasListLevel || !lvlText) {
      //       return {};
      //     }

      //     // MS Word has many custom ordered list options.
      //     // We need to generate the correct index here.
      //     let orderMarker = generateOrderedListIndex({
      //       listLevel,
      //       lvlText,
      //       listNumberingType,
      //     });

      //     if (!orderMarker) return {};

      //     return {
      //       'data-marker-type': orderMarker,
      //     };
      //   },
      // },

      lvlText: { rendered: false, keepOnSplit: true, },
      listNumberingType: { rendered: false, keepOnSplit: true, },
      listLevel: { rendered: false, keepOnSplit: true, },
      lvlJc: { rendered: false, keepOnSplit: true, }, // JC = justification. Expect left, right, center

      // This will contain indentation and space info.
      // ie: w:left (left indent), w:hanging (hanging indent)
      listParagraphProperties: { rendered: false, keepOnSplit: true, },
      listRunProperties: { rendered: false, keepOnSplit: true, },
      numId: { rendered: false, keepOnSplit: true, },
      numPrType: { rendered: false, keepOnSplit: true, },
      level: { rendered: false, keepOnSplit: true, },
      attributes: { rendered: false, keepOnSplit: true, },
      spacing: { rendered: false, keepOnSplit: true, },
      indent: { rendered: false, keepOnSplit: true, },
      markerStyle: { rendered: false, keepOnSplit: true, },
      styleId: { rendered: false, keepOnSplit: true, },
    };
  },

  addCommands() {
    return {
      getCurrentListNode: () => ({ state }) => {
        return findParentNode((node) => node.type.name === this.name)(state.selection);
      },

      increaseListIndent: () => ({ commands, chain, editor }) => {
        const node = commands.getCurrentListNode();
        return ListHelpers.indentListItem({ editor, chain, node });

        // if (!commands.sinkListItem(this.name)) { return false }
        // commands.updateNodeStyle();
        // commands.updateOrderedListStyleType();
        // return true;
      },

      decreaseListIndent: () => ({ commands, chain, editor }) => {
        const node = commands.getCurrentListNode();
        return ListHelpers.outdentListItem({ editor, chain, node });

        // const currentList = commands.getCurrentList();
        // const depth = currentList?.depth;

        // if (depth === 1) return false;
        // if (!commands.liftListItem(this.name)) { return true }
        // if (!commands.updateNodeStyle()) { return false }

        // const currentNode = commands.getCurrentListNode();
        // const currentNodeIndex = currentList?.node?.children.findIndex((child) => child === currentNode.node);
        // const nextNodePos = currentNode?.pos + currentNode?.node.nodeSize;
        // const followingNodes = currentList?.node?.children.slice(currentNodeIndex + 1) || [];

        // commands.updateOrderedListStyleType();
        // commands.restartListNodes(followingNodes, nextNodePos);
        // return true;
      },

    }
  },
  
  addPmPlugins() {
    return [];
    // return [styledListMarker()];
  },

  addShortcuts() {
    return {
      Enter: () => {
        const node = this.editor.commands.getCurrentListNode();
        return this.editor.commands.splitListItem(this.name, node);
      },
      'Shift-Enter': () => {
        return this.editor.commands.first(({ commands }) => [
          () => commands.createParagraphNear(),
          () => commands.splitBlock(),
        ]);
      },
      Tab: () => {
        return this.editor.commands.increaseListIndent();
      },
      'Shift-Tab': () => {
        return this.editor.commands.decreaseListIndent();
      },
    };
  },

});

export const handleIndent = ({ indent }) => {
  if (!indent) return {};
  const { left, right, firstLine, hanging } = indent;

  const textLeft = hanging ? hanging : left || 0;
  const markerLeft = left - hanging;
  const textRight = right || 0;
  return { textLeft, markerLeft, textRight };
};

function getListItemTextStyleMarks(listItem, markType) {
  let textStyleMarks = [];
  listItem.forEach((childNode) => {
    if (childNode.type.name !== 'paragraph') return;
    childNode.forEach((textNode) => {
      let isTextNode = textNode.type.name === 'text';
      let hasTextStyleMarks = markType.isInSet(textNode.marks);
      if (isTextNode && hasTextStyleMarks) {
        let marks = textNode.marks.filter((mark) => mark.type === markType);
        textStyleMarks.push(...marks);
      }
    });
  });
  return textStyleMarks;
}

const getListItemStyleId = (listItem) => {
  const firstContent = listItem.content?.content[0] || {};
  const { attrs = {} } = firstContent;
  const { styleId } = attrs;
  return styleId;
}

const getListItemNumId = (listItem) => {
  const firstContent = listItem.content?.content[0] || {};
  const { attrs = {} } = firstContent;
  const { numId } = attrs;
  return numId;
}

export const getListItemStyleDefinitions = ({ styleId, numId, level, editor }) => {  
  const docx = editor?.converter?.convertedXml;
  console.debug('--docx', editor)

  // We need definitions for the styleId if we have one.
  const styleDefinition = getStyleTagFromStyleId(styleId, docx);
  console.debug('styleDefinition:', styleDefinition);

  // We also check definitions for the numId which can contain styles.
  const abstractDefinition = getAbstractDefinition(numId, docx);
  console.debug('abstractDefinition:', abstractDefinition);
  const numDefinition = getDefinitionForLevel(abstractDefinition, level);
  console.debug('numDefinition:', numDefinition);

  return {
    styleDefinition
  }
}