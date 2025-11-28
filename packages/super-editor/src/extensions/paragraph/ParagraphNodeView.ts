import { Attribute } from '@core/index.js';
import { twipsToPixels } from '@converter/helpers.js';
import { extractParagraphContext, calculateTabStyle } from '../tab/helpers/tabDecorations.js';
import { resolveRunProperties, encodeCSSFromRPr, encodeCSSFromPPr } from '../../core/super-converter/styles.js';
import { isList } from '@core/commands/list-helpers';
import { getResolvedParagraphProperties, calculateResolvedParagraphProperties } from './resolvedPropertiesCache.js';
import type { Node as PmNode } from 'prosemirror-model';
import type { Decoration, NodeView, ViewMutationRecord } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';
import type { ExtensionAttribute } from '@core/Attribute.js';

/**
 * ProseMirror node view that renders paragraphs, including special handling for
 * numbered/bulleted lists so marker/separator elements stay in sync with docx
 * layout expectations.
 */
export class ParagraphNodeView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  node: PmNode;
  editor: Editor;
  getPos: () => number | undefined;
  decorations: readonly Decoration[];
  extensionAttrs: Record<string, unknown>;
  _animationFrameRequest: number | null;
  marker: HTMLElement | null;
  separator: HTMLElement | Text | null;

  constructor(
    node: PmNode,
    editor: Editor,
    getPos: () => number | undefined,
    decorations: readonly Decoration[],
    extensionAttrs: Record<string, unknown>,
  ) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;
    this.decorations = decorations;
    this.extensionAttrs = extensionAttrs;
    this._animationFrameRequest = null;
    this.marker = null;
    this.separator = null;

    const initialPos = this.getPos?.() ?? 0;
    calculateResolvedParagraphProperties(this.editor, this.node, this.editor.state.doc.resolve(initialPos));

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
    this.#updateDOMStyles();
  }

  update(node: PmNode, decorations: readonly Decoration[], _innerDecorations?: unknown): boolean {
    const oldAttrs = this.node.attrs;
    const newAttrs = node.attrs;
    this.node = node;
    this.decorations = decorations;

    if (JSON.stringify(oldAttrs) === JSON.stringify(newAttrs)) {
      return true;
    }

    const currentPos = this.getPos?.() ?? 0;
    calculateResolvedParagraphProperties(this.editor, this.node, this.editor.state.doc.resolve(currentPos));

    this.#updateHTMLAttributes();
    this.#updateDOMStyles();

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
    const htmlAttributes = Attribute.getAttributesToRender(
      this.node,
      this.extensionAttrs as unknown as ExtensionAttribute[],
    );
    htmlAttributes.style = htmlAttributes.style || '';
    for (const [key, value] of Object.entries(htmlAttributes || {})) {
      if (value == null) {
        this.dom.removeAttribute(key);
        continue;
      }
      this.dom.setAttribute(key, String(value));
    }
    const paragraphProperties = getResolvedParagraphProperties(this.node) ?? {};
    const numbering = paragraphProperties.numberingProperties;
    if (this.#checkIsList() && numbering) {
      this.dom.setAttribute('data-num-id', String(numbering.numId ?? ''));
      this.dom.setAttribute('data-level', String(numbering.ilvl ?? ''));
    } else {
      this.dom.removeAttribute('data-num-id');
      this.dom.removeAttribute('data-level');
    }
    if (paragraphProperties.framePr?.dropCap) {
      this.dom.classList.add('sd-editor-dropcap');
    } else {
      this.dom.classList.remove('sd-editor-dropcap');
    }

    if (paragraphProperties.styleId) {
      this.dom.setAttribute('styleid', String(paragraphProperties.styleId));
    }
  }

  #updateDOMStyles() {
    this.dom.style.cssText = '';
    const paragraphProperties = getResolvedParagraphProperties(this.node) ?? {};
    const style = encodeCSSFromPPr(paragraphProperties);
    Object.entries(style).forEach(([k, v]) => {
      (this.dom.style as unknown as Record<string, string>)[k] = v as string;
    });
  }

  #updateListStyles() {
    if (!this.marker) return true;
    const { suffix: suffixRaw, justification } = this.node.attrs.listRendering || {};
    const suffix = suffixRaw ?? 'tab';
    const justificationValue = (justification as 'left' | 'right' | 'center') ?? 'left';
    this.#calculateMarkerStyle(justificationValue);
    if (suffix === 'tab') {
      const paragraphProperties = getResolvedParagraphProperties(this.node) ?? {};
      this.#calculateTabSeparatorStyle(
        justificationValue,
        (paragraphProperties.indent as { hanging?: number; firstLine?: number } | undefined) ?? null,
      );
    } else {
      if (this.separator) {
        this.separator.textContent = suffix === 'space' ? '\u00A0' : '';
      }
    }

    return true;
  }

  ignoreMutation = (mutation: ViewMutationRecord): boolean => {
    // Ignore mutations to the list marker and separator}
    if (
      this.marker &&
      'target' in mutation &&
      mutation.target instanceof Node &&
      (mutation.target === this.marker || this.marker.contains(mutation.target))
    ) {
      return true;
    }
    if (
      this.separator &&
      'target' in mutation &&
      mutation.target instanceof Node &&
      (mutation.target === this.separator ||
        (this.separator instanceof HTMLElement && this.separator.contains(mutation.target)))
    ) {
      return true;
    }
    // Ignore style attribute changes on the paragraph DOM element
    if (
      mutation.type === 'attributes' &&
      'target' in mutation &&
      mutation.target === this.dom &&
      (mutation as MutationRecord).attributeName === 'style'
    ) {
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
  };

  #initList(listRendering: { markerText: string; suffix?: string }): void {
    this.#createMarker(listRendering.markerText);
    this.#createSeparator(listRendering.suffix);
  }

  #checkIsList(): boolean {
    return isList(this.node);
  }

  #createMarker(markerText: string): void {
    if (!this.marker) {
      this.marker = document.createElement('span');
      this.dom.insertBefore(this.marker, this.contentDOM);
    }
    this.marker.contentEditable = 'false';
    this.marker.className = 'list-marker';
    this.marker.textContent = markerText;
  }

  #createSeparator(suffix?: string): void {
    if (!this.marker) return;
    if (suffix === 'tab' || suffix == null) {
      if (this.separator == null || (this.separator as HTMLElement).tagName?.toLowerCase() !== 'span') {
        this.separator?.parentNode?.removeChild(this.separator);
        this.separator = document.createElement('span');
        this.marker.after(this.separator);
      }
      (this.separator as HTMLElement).className = 'sd-editor-tab';
      (this.separator as HTMLElement).contentEditable = 'false';
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
  #calculateTabSeparatorStyle(
    justification: 'left' | 'right' | 'center',
    indent: { hanging?: number; firstLine?: number } | null,
  ): void {
    if (!this.marker || !this.separator) return;
    const markerWidth = this.marker.getBoundingClientRect().width;
    let tabStyle;
    const { paragraphContext, start } = this.#getParagraphContext();

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
    if (this.separator && 'style' in this.separator && tabStyle) {
      (this.separator as HTMLElement).style.cssText = tabStyle;
    }
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
  #calculateMarkerStyle(justification: 'left' | 'right' | 'center'): void {
    if (!this.marker) return;
    const markerEl = this.marker;
    // START: modify after CSS styles
    const paragraphProperties = getResolvedParagraphProperties(this.node) ?? {};
    const runProperties = resolveRunProperties(
      { docx: this.editor.converter.convertedXml, numbering: this.editor.converter.numbering },
      paragraphProperties.runProperties || {},
      paragraphProperties,
      true,
      Boolean(this.node.attrs.paragraphProperties?.numberingProperties),
    );
    const style = encodeCSSFromRPr(runProperties, this.editor.converter.convertedXml);
    this.marker.style.cssText = Object.entries(style)
      .map(([k, v]) => `${k}: ${v};`)
      .join(' ');
    // END: modify after CSS styles

    const markerStyle: {
      position: string;
      left: string;
      bottom: string;
      top?: string;
    } = {
      position: '',
      left: '',
      bottom: '',
    };

    const domStyle = {
      position: '',
    };

    const calculateTop = () => {
      let top = '0';
      if (globalThis) {
        const computedStyle = globalThis.getComputedStyle(this.dom);
        const markerComputedStyle = globalThis.getComputedStyle(markerEl);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const markerLineHeight = parseFloat(markerComputedStyle.lineHeight);
        top = `${lineHeight - markerLineHeight}px`;
      }
      return top;
    };

    const rect = markerEl.getBoundingClientRect();
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
      markerEl.style.setProperty(k, v);
    });
    Object.entries(domStyle).forEach(([k, v]) => {
      this.dom.style.setProperty(k, v);
    });
  }

  #removeList() {
    if (this.marker) {
      this.dom.removeChild(this.marker as Element);
      this.marker = null;
    }
    if (this.separator) {
      this.dom.removeChild(this.separator as unknown as Node);
      this.separator = null;
    }
    this.dom.style.position = '';
  }

  #getParagraphContext() {
    const pos = this.getPos?.() ?? 0;
    const $pos = this.editor.state.doc.resolve(pos);
    const start = $pos.start($pos.depth + 1);
    const paragraphContext = extractParagraphContext(this.node, start, this.editor.helpers);
    return { paragraphContext, start };
  }

  #scheduleAnimation(fn: () => void): void {
    if (typeof globalThis === 'undefined') {
      return;
    }

    this.#cancelScheduledAnimation();

    this._animationFrameRequest = globalThis.requestAnimationFrame(() => {
      fn();
      this._animationFrameRequest = null;
    });
  }

  #cancelScheduledAnimation(): void {
    if (typeof globalThis === 'undefined' || !this._animationFrameRequest) {
      return;
    }
    globalThis.cancelAnimationFrame(this._animationFrameRequest);
    this._animationFrameRequest = null;
  }

  destroy(): void {
    this.#cancelScheduledAnimation();
  }
}
