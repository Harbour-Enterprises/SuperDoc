import { Plugin, EditorState } from 'prosemirror-state';
import { EditorView } from "prosemirror-view";
import { Extension } from '@core/Extension.js';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PaginationPluginKey } from './pagination-helpers.js';
import { CollaborationPluginKey } from '@extensions/collaboration/collaboration.js';
import { ImagePlaceholderPluginKey } from '@extensions/image/imageHelpers/imagePlaceholderPlugin.js';
import { LinkedStylesPluginKey } from '@extensions/linked-styles/linked-styles.js';

const isDebugging = false;

export const Pagination = Extension.create({
  name: 'pagination',

  addStorage() {
    return {
      height: 0,
      sectionData: null,
    };
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({
          type: 'hardBreak',
        });
      }
    }
  },

  addShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertPageBreak(),
    };
  },

  /**
   * The pagination plugin is responsible for calculating page breaks, and redering them using decorations.
   */
  addPmPlugins() {
    const editor = this.editor;
    let isUpdating = false;

    // Used to prevent unnecessary transactions
    let shouldUpdate = false;

    // Track wether the first load has occured or not
    let hasInitialized = false;
    let shouldInitialize = false;

    const paginationPlugin = new Plugin({
      key: PaginationPluginKey,
      state: {
        isReadyToInit: false,
        init(_, state) {
          return {
            isReadyToInit: false,
            decorations: DecorationSet.empty,
            isDebugging,
          }
        },
        apply(tr, oldState, prevEditorState, newEditorState) {
          // Check for new decorations passed via metadata

          const meta = tr.getMeta(PaginationPluginKey);
          if (meta && meta.isReadyToInit) {
            if (isDebugging) console.debug('✅ INIT READY')
            shouldUpdate = true;
            shouldInitialize = meta.isReadyToInit;
          };

          // We need special handling for images / the image placeholder plugin
          const imagePluginTransaction = tr.getMeta(ImagePlaceholderPluginKey);
          if (imagePluginTransaction) {
            if (imagePluginTransaction.type === 'remove') {
              const imagePos = imagePluginTransaction.pos;
              const domImage = editor.view.domAtPos(imagePos).node.querySelector("img");
              if (domImage.complete) onImageLoad(editor);
              else domImage.onload = () => onImageLoad(editor);
            };
            return { ...oldState }
          };

          const isAnnotationUpdate = tr.getMeta('fieldAnnotationUpdate');
          if (isAnnotationUpdate) {
            return { ...oldState }
          }

          if (!shouldInitialize && !oldState.isReadyToInit) {
            if (isDebugging) console.debug('🚫 NO INIT')
            return { ...oldState }
          }

          if (meta && meta.decorations) {
            shouldUpdate = true;
            if (isDebugging) console.debug('🦋 RETURN META DECORATIONS')
            return {
              ...oldState,
              decorations: meta.decorations.map(tr.mapping, newEditorState.doc),
            }
          };

          const isForceUpdate = tr.getMeta('forceUpdatePagination');

          // If the document hasn't changed, and we've already initialized, don't update
          if (!isForceUpdate && prevEditorState.doc.eq(newEditorState.doc) && hasInitialized) {
            if (isDebugging) console.debug('🚫 NO UPDATE')
            shouldUpdate = false;
            return { ...oldState };
          }

          // content size
          shouldUpdate = true;
          if (isDebugging) console.debug('🚀 UPDATE DECORATIONS')
          if (isForceUpdate) shouldUpdate = true;

          return {
            ...oldState,
            isReadyToInit: shouldInitialize,
          };
        },
      },

      /* The view method is the most important part of the plugin */
      view: (view) => {
        let previousDecorations = DecorationSet.empty;

        return {
          update: (view) => {
            if (!shouldUpdate || isUpdating) return;

            isUpdating = true;
            hasInitialized = true;

            /**
             * Perform the actual update here.
             * We call calculatePageBreaks which actually generates the decorations
             */
            if (isDebugging) console.debug('--- Calling performUpdate ---')
            performUpdate(editor, view, previousDecorations);
            isUpdating = false;
            shouldUpdate = false;
          },
        };
      },
      props: {
        decorations(state) {
          return PaginationPluginKey.getState(state).decorations;
        },
      },
    });

    return [paginationPlugin];
  },
});


/**
 * Calculate page breaks and update the editor state with the new decorations
 * @param {Editor} editor The editor instance
 * @param {EditorView} view The editor view
 * @param {DecorationSet} previousDecorations The previous set of decorations
 * @returns {void}
 */
const performUpdate = (editor, view, previousDecorations) => {
  const sectionData = editor.storage.pagination.sectionData;
  const newDecorations = calculatePageBreaks(view, editor, sectionData);

  // Skip updating if decorations haven't changed
  if (!previousDecorations.eq(newDecorations)) {
    const updateTransaction = view.state.tr.setMeta(
      PaginationPluginKey,
      { decorations: newDecorations }
    );
    view.dispatch(updateTransaction);
  };

  // Emit that pagination has been updated
  editor.emit('paginationUpdate');
};

/**
 * Generate page breaks. This prepares the initial sizing, as well as appending the initial header and final footer
 * Then, call generateInternalPageBreaks to calculate the inner page breaks
 * @param {EditorView} view The editor view
 * @param {Editor} editor The editor instance
 * @param {Object} sectionData The section data from the converter
 * @returns {DecorationSet} A set of decorations to be applied to the editor
 */
const calculatePageBreaks = (view, editor, sectionData) => {
  // If we don't have a converter, return an empty decoration set
  // Since we won't be able to calculate page breaks without a converter
  if (!editor.converter) return DecorationSet.empty;

  const pageSize = editor.converter.pageStyles?.pageSize;
  const { width, height } = pageSize; // Page width and height are in inches

  // We can't calculate page breaks without a page width and height
  // Under normal docx operation, these are always set
  if (!width || !height) return DecorationSet.empty;

  const ignorePlugins = [CollaborationPluginKey, PaginationPluginKey];
  const { state } = view;
  const cleanState = EditorState.create({
    schema: state.schema,
    doc: state.doc,
    plugins: state.plugins.filter((plugin) => ignorePlugins.includes(plugin.key)),
  });

  // Create a temporary container with a clean doc to recalculate page breaks
  const tempContainer = editor.options.element.cloneNode();
  if (!tempContainer) return [];

  tempContainer.className = 'temp-container super-editor';
  const HIDDEN_EDITOR_OFFSET_TOP = 0;
  const HIDDEN_EDITOR_OFFSET_LEFT = 0;
  tempContainer.style.left = HIDDEN_EDITOR_OFFSET_TOP + 'px';
  tempContainer.style.top = HIDDEN_EDITOR_OFFSET_LEFT + 'px';
  tempContainer.style.position = 'fixed';
  tempContainer.style.visibility = 'hidden';

  document.body.appendChild(tempContainer);
  const tempView = new EditorView(tempContainer, {
    state: cleanState,
    dispatchTransaction: () => {},
  });

  // Generate decorations on a clean doc
  editor.initDefaultStyles(tempContainer);
  const decorations = generateInternalPageBreaks(cleanState.doc, tempView, editor, sectionData);

  // Clean up
  tempView.destroy();
  document.body.removeChild(tempContainer);

  // Return a list of page break decorations
  return DecorationSet.create(view.state.doc, decorations)
};


/**
 * Generate internal page breaks by iterating through the document, keeping track of the height.
 * If we find a node that extends past where our page should end, we add a page break.
 * @param {Node} doc The document node
 * @param {EditorView} view The editor view
 * @param {Editor} editor The editor instance
 * @param {Array} decorations The current set of decorations
 * @param {Object} sectionData The section data from the converter
 * @returns {void} The decorations array is altered in place
 */
function generateInternalPageBreaks(doc, view, editor, sectionData) {
  const decorations = [];
  const { pageSize, pageMargins } = editor.converter.pageStyles;
  const pageHeight = pageSize.height * 96; // Convert inches to pixels
  const scale = editor.options.scale;

  let currentPageNumber = 1;
  let pageHeightThreshold = pageHeight;
  let hardBreakOffsets = 0;
  let footer = null, header = null;
  const { headerIds, footerIds } = editor.converter;

  let firstHeaderId = headerIds.first || headerIds.even || headerIds.default || 'default';
  if (headerIds.titlePg) firstHeaderId = null;
  const firstHeader = createHeader(pageMargins, pageSize, sectionData, firstHeaderId);
  const pageBreak = createPageBreak({ editor, header: firstHeader, isFirstHeader: true });
  decorations.push(Decoration.widget(0, pageBreak, { key: 'stable-key' }));

  const lastFooterId = footerIds.last || footerIds.default || 'default';
  const lastFooter = createFooter(pageMargins, pageSize, sectionData, lastFooterId);
  const footerBreak = createPageBreak({ editor, footer: lastFooter, isLastFooter: true });

  // Reduce the usable page height by the header and footer heights now that they are prepped
  pageHeightThreshold -= firstHeader.headerHeight + lastFooter.footerHeight;

  let coords = view?.coordsAtPos(doc.content.size);
  if (!coords) return [];

  /**
   * Iterate through the document, checking for hard page breaks and calculating the page height.
   * If we find a node that extends past where our page should end, we add a page break.
   */
  doc.descendants((node, pos) => {
    coords = view?.coordsAtPos(pos);
    if (!coords) return;
    
    let shouldAddPageBreak = coords.bottom > pageHeightThreshold;
    const isHardBreakNode = node.type.name === 'hardBreak';

    if (node.type.name === 'paragraph' && node.attrs.styleId) {
      const linkedStyles = LinkedStylesPluginKey.getState(editor.state)?.styles;
      const style = linkedStyles?.find((style) => style.id === node.attrs.styleId);
      if (style) {
        const { definition = {} } = style;
        const { pageBreakBefore, pageBreakAfter } = definition.attrs || {};
        if (pageBreakBefore || pageBreakAfter) shouldAddPageBreak = true;
      }
    };

    if (isHardBreakNode || shouldAddPageBreak) {
      // The node we've found extends past our threshold
      // We need to zoom in and investigate position by position until we find the exact break point
      // And we get the actual top and bottom of the break
      const {
        top: actualBreakTop,
        bottom: actualBreakBottom,
        pos: breakPos,
      } = getActualBreakCoords(view, pos, pageHeightThreshold);

      if (isDebugging) {
        console.debug('----- [pagination page break] ----');
        console.debug('[pagination page break] Expected pageHeightThreshold:', pageHeightThreshold);
        console.debug('[pagination page break]  Actual top:', actualBreakTop, 'Actual bottom:', actualBreakBottom);
        console.debug('[pagination page break]  Pos:', pos, 'Break pos:', breakPos);
        console.debug('---- [pagination page break end] ---- \n\n\n');
      };

      // Update the header and footer based on the current page number
      currentPageNumber++;  
      const headerId = (currentPageNumber % 2 === 0 ? headerIds.even :  headerIds.odd) || headerIds.default;
      const footerId = (currentPageNumber % 2 === 0 ? footerIds.even : footerIds.odd) || footerIds.default;
      header = createHeader(pageMargins, pageSize, sectionData, headerId);
      footer = createFooter(pageMargins, pageSize, sectionData, footerId);

      const bufferHeight = pageHeightThreshold - actualBreakBottom;
      const { node: spacingNode } = createFinalPagePadding(bufferHeight);
      const pageSpacer = Decoration.widget(breakPos, spacingNode, { key: 'stable-key' });
      decorations.push(pageSpacer);

      const pageBreak = createPageBreak({ editor, header, footer });
      decorations.push(Decoration.widget(breakPos, pageBreak, { key: 'stable-key' }));

      // Check if we have a hard page break node
      // If so, calculate and add spacer to push us into a next page
      if (isHardBreakNode) {
        hardBreakOffsets += pageHeight;
      }

      // Recalculate the page threshold based on where we actually inserted the break
      pageHeightThreshold = actualBreakBottom + (pageHeight - header.headerHeight - footer.footerHeight);
    };
  });

  // Add blank padding to the last page to make a full page height
  let finalPos = doc.content.size;
  const lastNodeCoords = view.coordsAtPos(finalPos);
  const headerId = (currentPageNumber % 2 === 0 ? headerIds.even : headerIds.odd) || headerIds.default;
  const footerId = (currentPageNumber % 2 === 0 ? footerIds.even : footerIds.odd) || footerIds.default;
  header = createHeader(pageMargins, pageSize, sectionData, headerId);
  footer = createFooter(pageMargins, pageSize, sectionData, footerId);
  const bufferHeight = pageHeightThreshold - lastNodeCoords.bottom;
  const { node: spacingNode } = createFinalPagePadding(bufferHeight);
  const pageSpacer = Decoration.widget(doc.content.size, spacingNode, { key: 'stable-key' });
  decorations.push(pageSpacer);

  // Add the final footer
  decorations.push(Decoration.widget(doc.content.size, footerBreak, { key: 'stable-key' }));

  // Return the widget decorations array
  return decorations;
}

/**
 * Create final page padding in order to extend the last page to the full height of the document
 * @param {Number} bufferHeight The padding to add to the final page in pixels
 * @returns {HTMLElement} The padding div
 */
function createFinalPagePadding(bufferHeight) {
  const div = document.createElement('div');
  div.className = 'pagination-page-spacer';
  div.style.userSelect = 'none';
  div.style.pointerEvents = 'none';
  div.style.height = bufferHeight + 'px';

  if (isDebugging) div.style.backgroundColor = '#ff000033';
  return { nodeHeight: bufferHeight, node: div }
};


/**
 * Generate a header element
 * @param {Object} pageMargins The page margins from the converter
 * @param {Object} sectionData The section data from the converter
 * @param {string} headerId The footer id to use
 * @returns {Object} The header element and its height
 */
function createHeader(pageMargins, pageSize, sectionData, headerId) {
  const headerDef = sectionData.headers?.[headerId];
  const minHeaderHeight = pageMargins.top * 96; // pageMargins are in inches
  const headerMargin = pageMargins.header * 96;

  // If the header content is larger than the available space, we need to add the 'header' margin
  const hasHeaderOffset = headerDef?.height > (minHeaderHeight - headerMargin);
  const headerOffset = hasHeaderOffset ? headerMargin : 0;
  const headerHeight = Math.max(headerDef?.height || 0, minHeaderHeight) + headerOffset;

  // Create the header element
  let sectionContainer = headerDef?.sectionContainer?.cloneNode(true);
  if (!sectionContainer) sectionContainer = document.createElement('div');

  sectionContainer.className = 'pagination-section-header'
  sectionContainer.style.paddingTop = headerMargin + 'px';
  sectionContainer.style.paddingLeft = pageMargins.left * 96 + 'px';
  sectionContainer.style.paddingRight = pageMargins.right * 96 + 'px';
  sectionContainer.style.height = headerHeight + 'px';
  sectionContainer.style.width = pageSize.width * 96 + 'px';

  if (isDebugging) sectionContainer.style.backgroundColor = '#00ff00';
  return {
    section: sectionContainer,
    headerHeight: headerHeight,
  };
};


/**
 * Generate a footer element
 * @param {Object} pageMargins The page margins from the converter
 * @param {Object} sectionData The section data from the converter
 * @param {string} footerId The footer id to use
 * @returns {Object} The footer element and its height
 */
function createFooter(pageMargins, pageSize, sectionData, footerId) {
  const footerDef = sectionData.footers?.[footerId];
  const minFooterHeight = pageMargins.bottom * 96; // pageMargins are in inches
  const footerPaddingFromEdge = pageMargins.footer * 96;
  const footerHeight = Math.max(footerDef?.height || 0, minFooterHeight) - footerPaddingFromEdge;
  let sectionContainer = footerDef?.sectionContainer?.cloneNode(true);
  if (!sectionContainer) sectionContainer = document.createElement('div');
  sectionContainer.className = 'pagination-section-footer';
  sectionContainer.style.height = footerHeight + 'px';
  sectionContainer.style.marginBottom = footerPaddingFromEdge + 'px';
  sectionContainer.style.paddingLeft = pageMargins.left * 96 + 'px';
  sectionContainer.style.paddingRight = pageMargins.right * 96 + 'px';
  sectionContainer.style.width = pageSize.width * 96 + 'px';
  if (isDebugging) sectionContainer.style.backgroundColor = '#00aaaa55';

  return {
    section: sectionContainer,
    footerHeight: footerHeight + footerPaddingFromEdge,
  }
}


/**
 * Combine header and footer into a page break element
 * @param {Object} param0 
 * @param {Editor} param0.editor The editor instance
 * @param {HTMLElement} param0.header The header element
 * @param {HTMLElement} param0.footer The footer element
 * @returns {HTMLElement} The page break element
 */
function createPageBreak({ editor, header, footer, footerBottom = null, isFirstHeader, isLastFooter }) {
  const { pageSize, pageMargins } = editor.converter.pageStyles;

  let sectionHeight = 0;
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination-break-wrapper'

  const innerDiv = document.createElement('div');
  innerDiv.className = 'pagination-inner';
  innerDiv.style.width = pageSize.width * 96 - 1 + 'px';

  if (isFirstHeader) innerDiv.style.borderRadius = '8px 8px 0 0';
  else if (isLastFooter) innerDiv.style.borderRadius = '0 0 8px 8px';
  paginationDiv.appendChild(innerDiv);

  if (footer) {
    innerDiv.appendChild(footer.section);
    sectionHeight += footer.footerHeight;
  };

  if (header && footer) {
    const separatorHeight = 20;
    sectionHeight += separatorHeight;
    const separator = document.createElement('div');
    separator.className = 'pagination-separator';
    if (isDebugging) separator.style.backgroundColor = 'green';

    innerDiv.appendChild(separator);
  };

  if (header) {
    innerDiv.appendChild(header.section);
    sectionHeight += header.headerHeight;
  };

  paginationDiv.style.height = sectionHeight + 'px';
  paginationDiv.style.minHeight = sectionHeight + 'px';
  paginationDiv.style.maxHeight = sectionHeight + 'px';
  innerDiv.style.height = sectionHeight + 'px';
  paginationDiv.style.width = 100 + 'px';
  paginationDiv.style.marginLeft = pageMargins.left * -96 + 'px';

  if (isDebugging) {
    innerDiv.style.backgroundColor = '#0000ff33';
    paginationDiv.style.backgroundColor = '#00ff0099';
  }

  if (footerBottom !== null) {
    paginationDiv.style.position = 'absolute';
    paginationDiv.style.bottom = footerBottom + 'px';
  }

  return paginationDiv;
};

/**
 * Get the actual break coordinates for a page split based on the approximate position (pos)
 * and the calculated threshold (which accounts for 'scale')
 * 
 * Since we know the node at pos extends past the threshold, we iterate
 * backwards through all positions from there to find the exact break point
 * @param {EditorView} view The current editor view
 * @param {Number} pos The position of the outermost node that exceeds threshold
 * @param {Number} calculatedThreshold The page threshold accounting for scale
 * @returns {Object} Object containing the actual top, bottom, and position of the break
 */
function getActualBreakCoords(view, pos, calculatedThreshold) {
  let currentPos = pos - 1;
  const actualBreak = { top: 0, bottom: 0, pos: 0 };
  while (currentPos > 0) {
    const { top, bottom } = view.coordsAtPos(currentPos);
    if (bottom < calculatedThreshold) {
      Object.assign(actualBreak, { top, bottom, pos: currentPos + 1 });
      break;
    }

    currentPos--;
  };

  return actualBreak;
};

/**
 * Special handling for images in pagination. Trigger a pagination update transaction after an image loads.
 * @param {Editor} editor The editor instance
 * @returns {void}
 */
const onImageLoad = (editor) => {
  requestAnimationFrame(() => {
    const newTr = editor.view.state.tr;
    newTr.setMeta('forceUpdatePagination', true);
    editor.view.dispatch(newTr);
  });
};