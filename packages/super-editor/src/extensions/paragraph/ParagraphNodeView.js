import { Attribute } from '@core/index.js';
import { twipsToPixels } from '@converter/helpers.js';
import { extractParagraphContext, calculateTabStyle } from '../tab/helpers/tabDecorations.js';
import { resolveRunProperties, encodeCSSFromRPr } from '@converter/styles.js';
import { isList } from '@core/commands/list-helpers';

export class ParagraphNodeView {
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
        this.#updateListStyles();
      });
    }
    this.#updateHTMLAttributes();
  }

  update(node, decorations) {
    this.node = node;
    this.decorations = decorations;

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
    return false;
  }

  #initList(listRendering) {
    this.#createMarker(listRendering.markerText);
    this.#createSeparator(listRendering.suffix);
  }

  #checkIsList() {
    return isList(this.node);
  }

  #createMarker(markerText) {
    if (!this.marker) {
      this.marker = document.createElement('span');
    }
    this.marker.contentEditable = 'false';
    this.marker.className = 'list-marker';
    this.dom.insertBefore(this.marker, this.contentDOM);
    this.marker.textContent = markerText;
  }

  #createSeparator(suffix) {
    if (suffix === 'tab' || suffix == null) {
      if (this.separator == null || this.separator.tagName?.toLowerCase() !== 'span') {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createElement('span');
        this.dom.insertBefore(this.separator, this.contentDOM);
      }
      this.separator.className = 'sd-editor-tab';
      this.separator.contentEditable = 'false';
    } else if (suffix === 'space') {
      if (this.separator == null || this.separator.nodeType !== Node.TEXT_NODE) {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createTextNode('\u00A0');
        this.dom.insertBefore(this.separator, this.contentDOM);
      }
      this.separator.textContent = '\u00A0';
    } else if (suffix === 'nothing') {
      if (this.separator == null || this.separator.nodeType !== Node.TEXT_NODE) {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createTextNode('');
        this.dom.insertBefore(this.separator, this.contentDOM);
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
  #calculateTabSeparatorStyle(justification, indent) {
    const markerWidth = this.marker.getBoundingClientRect().width;
    let tabStyle;
    let paragraphContext = this.#getParagraphContext();

    if (justification === 'right') {
      if (indent?.hanging || (!indent?.hanging && !indent?.firstLine)) {
        const hanging = indent?.hanging ? twipsToPixels(indent.hanging) : 0;
        tabStyle = `width: ${hanging}px;`;
      } else {
        const tabNode = this.editor.schema.nodes.tab.create(null);
        tabStyle = calculateTabStyle(tabNode, this.editor.view, 1, this.node, paragraphContext);
      }
    } else if (justification === 'center') {
      // Half the marker width takes up space in the paragraph
      paragraphContext.accumulatedTabWidth = markerWidth / 2;
      const tabNode = this.editor.schema.nodes.tab.create(null);
      tabStyle = calculateTabStyle(tabNode, this.editor.view, 1, this.node, paragraphContext);
      // Since the marker uses absolute position, we need to offset the tab by half the marker width
      tabStyle += `margin-left: ${markerWidth / 2}px;`;
    } else {
      paragraphContext.accumulatedTabWidth = markerWidth;
      const tabNode = this.editor.schema.nodes.tab.create(null);
      tabStyle = calculateTabStyle(tabNode, this.editor.view, 1, this.node, paragraphContext);
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
  #calculateMarkerStyle(justification) {
    // START: modify after CSS styles
    const runProperties = resolveRunProperties(
      { docx: this.editor.converter.convertedXml, numbering: this.editor.converter.numbering },
      this.node.attrs.paragraphProperties.runProperties || {},
      this.node.attrs.paragraphProperties,
      true,
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

    const calculateBottom = () => {
      let bottom = '0';
      const lineBreaks = this.contentDOM.querySelectorAll('br:not(.ProseMirror-trailingBreak)');
      // If the dom element contains a line break, we need to adjust the marker position
      if (lineBreaks.length > 0) {
        const lineBreakHeight = lineBreaks[0].getBoundingClientRect().height;
        const paragraphTop = this.dom.getBoundingClientRect().top;
        const lineBreakTop = lineBreaks[0].getBoundingClientRect().top;
        const offset = lineBreakTop - paragraphTop;
        bottom = `${lineBreakHeight + offset}px`;
      }
      return bottom;
    };

    const markerWidth = this.marker.getBoundingClientRect().width;
    if (justification === 'right') {
      markerStyle.position = 'absolute';
      markerStyle.left = `${-markerWidth}px`;
      markerStyle.bottom = calculateBottom();
      domStyle.position = 'relative';
    } else if (justification === 'center') {
      markerStyle.position = 'absolute';
      markerStyle.left = `${-markerWidth / 2}px`;
      markerStyle.bottom = calculateBottom();
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
    const start = $pos.start();
    const paragraphContext = extractParagraphContext(this.node, start, this.editor.helpers);
    return paragraphContext;
  }

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
