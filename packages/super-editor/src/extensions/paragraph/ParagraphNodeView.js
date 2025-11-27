import { Attribute } from '@core/index.js';
import { twipsToPixels } from '@converter/helpers.js';
import { extractParagraphContext, calculateTabStyle } from '../tab/helpers/tabDecorations.js';
import { resolveRunProperties, encodeCSSFromRPr } from '@converter/styles.js';
import { isList } from '@core/commands/list-helpers';

/**
 * ProseMirror node view that renders paragraphs, including special handling for
 * numbered/bulleted lists so marker/separator elements stay in sync with docx
 * layout expectations.
 */
export class ParagraphNodeView {
  /**
   * @param {import('prosemirror-model').Node} node Current paragraph node.
   * @param {import('../../core/Editor').Editor} editor Editor instance providing schema/helpers.
   * @param {() => number} getPos Position getter provided by ProseMirror.
   * @param {import('prosemirror-view').Decoration[]} decorations Decorations applied to this node.
   * @param {Record<string, unknown>} extensionAttrs Extra attributes declared by the paragraph extension.
   */
  constructor(node, editor, getPos, decorations, extensionAttrs) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;
    this.decorations = decorations;
    this.extensionAttrs = extensionAttrs;
    this._animationFrameRequest = null;

    this.dom = document.createElement('p');
    this.contentDOM = document.createElement('span');
    this.dom.appendChild(this.contentDOM);
    if (this.#checkIsList()) {
      this.#initList(node.attrs.listRendering);
      this.#scheduleAnimation(() => {
        if (!this.#checkIsList()) {
          return;
        }
        this.#updateListStyles();
      });
    }
    this.#updateHTMLAttributes();
  }

  /**
   * @param {import('prosemirror-model').Node} node
   * @param {import('prosemirror-view').Decoration[]} decorations
   */
  update(node, decorations) {
    const oldAttrs = this.node.attrs;
    const newAttrs = node.attrs;
    this.node = node;
    this.decorations = decorations;

    if (JSON.stringify(oldAttrs) === JSON.stringify(newAttrs)) {
      return true;
    }

    this.#updateHTMLAttributes();

    if (!this.#checkIsList()) {
      this.#removeList();
      return true;
    }
    this.#initList(node.attrs.listRendering);
    this.#scheduleAnimation(() => {
      this.#initList(node.attrs.listRendering);
      this.#updateListStyles();
    });
    return true;
  }

  #updateHTMLAttributes() {
    const htmlAttributes = Attribute.getAttributesToRender(this.node, this.extensionAttrs);
    htmlAttributes.style = htmlAttributes.style || '';
    for (const [key, value] of Object.entries(htmlAttributes || {})) {
      if (value == null) {
        this.dom.removeAttribute(key);
        continue;
      }
      this.dom.setAttribute(key, value);
    }
  }

  #updateListStyles() {
    let { suffix, justification } = this.node.attrs.listRendering;
    suffix = suffix ?? 'tab';
    this.#calculateMarkerStyle(justification);
    if (suffix === 'tab') {
      this.#calculateTabSeparatorStyle(justification, this.node.attrs.indent);
    } else {
      this.separator.textContent = suffix === 'space' ? '\u00A0' : '';
    }

    return true;
  }

  /**
   * @param {MutationRecord} mutation
   */
  ignoreMutation(mutation) {
    // Ignore mutations to the list marker and separator}
    if (this.marker && (mutation.target === this.marker || this.marker.contains(mutation.target))) {
      return true;
    }
    if (this.separator && (mutation.target === this.separator || this.separator.contains(mutation.target))) {
      return true;
    }
    // Ignore style attribute changes on the paragraph DOM element
    if (mutation.type === 'attributes' && mutation.target === this.dom && mutation.attributeName === 'style') {
      return true;
    }
    // Ignore addition/removal of marker/separator nodes
    if (mutation.type === 'childList') {
      if (this.marker && Array.from(mutation.removedNodes).includes(this.marker)) {
        return true;
      }

      if (this.marker && Array.from(mutation.addedNodes).includes(this.marker)) {
        return true;
      }
      if (this.separator && Array.from(mutation.removedNodes).includes(this.separator)) {
        return true;
      }
      if (this.separator && Array.from(mutation.addedNodes).includes(this.separator)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {{ markerText: string, suffix?: string }} listRendering
   */
  #initList(listRendering) {
    this.#createMarker(listRendering.markerText);
    this.#createSeparator(listRendering.suffix);
  }

  #checkIsList() {
    return isList(this.node);
  }

  /**
   * @param {string} markerText
   */
  #createMarker(markerText) {
    if (!this.marker) {
      this.marker = document.createElement('span');
      this.dom.insertBefore(this.marker, this.contentDOM);
    }
    this.marker.contentEditable = 'false';
    this.marker.className = 'list-marker';
    this.marker.textContent = markerText;
  }

  /**
   * @param {'tab' | 'space' | 'nothing'} [suffix]
   */
  #createSeparator(suffix) {
    if (suffix === 'tab' || suffix == null) {
      if (this.separator == null || this.separator.tagName?.toLowerCase() !== 'span') {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createElement('span');
        this.marker.after(this.separator);
      }
      this.separator.className = 'sd-editor-tab';
      this.separator.contentEditable = 'false';
    } else if (suffix === 'space') {
      if (this.separator == null || this.separator.nodeType !== Node.TEXT_NODE) {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createTextNode('\u00A0');
        this.marker.after(this.separator);
      }
      this.separator.textContent = '\u00A0';
    } else if (suffix === 'nothing') {
      if (this.separator == null || this.separator.nodeType !== Node.TEXT_NODE) {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createTextNode('');
        this.marker.after(this.separator);
      }
      this.separator.textContent = '';
    }
  }

  /**
   * This is the logic behind the calculation:
   *
   * For left alignment:
   *   - The tab character extends to the next tab stop
   *
   * For right alignment:
   *   When: hanging is defined OR hanging is not defined and neither is firstLine
   *     - The tab character extends to the hanging position only and never goes beyond it.
   *
   *   When: firstLine is defined
   *       - The tab character extends to the next tab stop
   *
   * For center alignment:
   *   - The tab character extends to the next tab stop
   */
  /**
   * @param {'left' | 'right' | 'center'} justification
   * @param {{ hanging?: number, firstLine?: number } | null} indent
   */
  #calculateTabSeparatorStyle(justification, indent) {
    const markerWidth = this.marker.getBoundingClientRect().width;
    let tabStyle;
    let { paragraphContext, start } = this.#getParagraphContext();

    if (justification === 'right') {
      if (indent?.hanging || (!indent?.hanging && !indent?.firstLine)) {
        const hanging = indent?.hanging ? twipsToPixels(indent.hanging) : 0;
        tabStyle = `width: ${hanging}px;`;
      } else {
        const tabNode = this.editor.schema.nodes.tab.create(null);
        tabStyle = calculateTabStyle(tabNode.nodeSize, this.editor.view, start, this.node, paragraphContext);
      }
    } else if (justification === 'center') {
      // Half the marker width takes up space in the paragraph
      paragraphContext.accumulatedTabWidth = markerWidth / 2;
      const tabNode = this.editor.schema.nodes.tab.create(null);
      tabStyle = calculateTabStyle(tabNode.nodeSize, this.editor.view, start, this.node, paragraphContext);
      // Since the marker uses absolute position, we need to offset the tab by half the marker width
      tabStyle += `margin-left: ${markerWidth / 2}px;`;
    } else {
      paragraphContext.accumulatedTabWidth = markerWidth;
      const tabNode = this.editor.schema.nodes.tab.create(null);
      tabStyle = calculateTabStyle(tabNode.nodeSize, this.editor.view, start, this.node, paragraphContext);
    }
    this.separator.style.cssText = tabStyle;
  }

  /**
   * This is the logic behind the calculation:
   *  For left alignment:
   *    - The marker text STARTS at the left indent
   *
   *  For right alignment:
   *    - The marker text ENDS at the left indent
   *
   * For center alignment:
   *   - The marker text is centered around the left indent (pulled back by half its width)
   *
   * The left/center/right alignment positioning uses the left indent (+ firstLine if present) as the anchor point.
   */
  /**
   * @param {'left' | 'right' | 'center'} justification
   */
  #calculateMarkerStyle(justification) {
    // START: modify after CSS styles
    const runProperties = resolveRunProperties(
      { docx: this.editor.converter.convertedXml, numbering: this.editor.converter.numbering },
      this.node.attrs.paragraphProperties.runProperties || {},
      { ...this.node.attrs.paragraphProperties, numberingProperties: this.node.attrs.numberingProperties },
      true,
      Boolean(this.node.attrs.paragraphProperties.numberingProperties),
    );
    const style = encodeCSSFromRPr(runProperties, this.editor.converter.convertedXml);
    this.marker.style.cssText = Object.entries(style)
      .map(([k, v]) => `${k}: ${v};`)
      .join(' ');
    // END: modify after CSS styles

    let markerStyle = {
      position: '',
      left: '',
      bottom: '',
    };

    let domStyle = {
      position: '',
    };

    const calculateTop = () => {
      let top = '0';
      if (globalThis) {
        const computedStyle = globalThis.getComputedStyle(this.dom);
        const markerComputedStyle = globalThis.getComputedStyle(this.marker);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const markerLineHeight = parseFloat(markerComputedStyle.lineHeight);
        top = `${lineHeight - markerLineHeight}px`;
      }
      return top;
    };

    const rect = this.marker.getBoundingClientRect();
    const markerWidth = rect.width;
    if (justification === 'right') {
      markerStyle.position = 'absolute';
      markerStyle.left = `${-markerWidth}px`;
      markerStyle.top = calculateTop();
      domStyle.position = 'relative';
    } else if (justification === 'center') {
      markerStyle.position = 'absolute';
      markerStyle.left = `${-markerWidth / 2}px`;
      markerStyle.top = calculateTop();
      domStyle.position = 'relative';
    }
    Object.entries(markerStyle).forEach(([k, v]) => {
      this.marker.style[k] = v;
    });
    Object.entries(domStyle).forEach(([k, v]) => {
      this.dom.style[k] = v;
    });
  }

  #removeList() {
    if (this.marker) {
      this.dom.removeChild(this.marker);
      this.marker = null;
    }
    if (this.separator) {
      this.dom.removeChild(this.separator);
      this.separator = null;
    }
    this.dom.style.position = '';
  }

  #getParagraphContext() {
    const $pos = this.editor.state.doc.resolve(this.getPos());
    const start = $pos.start($pos.depth + 1);
    const paragraphContext = extractParagraphContext(this.node, start, this.editor.helpers);
    return { paragraphContext, start };
  }

  /**
   * @param {() => void} fn
   */
  #scheduleAnimation(fn) {
    if (typeof globalThis === 'undefined') {
      return;
    }

    this.#cancelScheduledAnimation();

    this._animationFrameRequest = globalThis.requestAnimationFrame(() => {
      fn();
      this._animationFrameRequest = null;
    });
  }

  #cancelScheduledAnimation() {
    if (typeof globalThis === 'undefined' || !this._animationFrameRequest) {
      return;
    }
    globalThis.cancelAnimationFrame(this._animationFrameRequest);
    this._animationFrameRequest = null;
  }

  destroy() {
    this.#cancelScheduledAnimation();
  }
}
