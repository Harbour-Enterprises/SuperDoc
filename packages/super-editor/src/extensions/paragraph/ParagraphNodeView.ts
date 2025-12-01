import { Attribute } from '@core/index.js';
import { twipsToPixels } from '@converter/helpers.js';
import { extractParagraphContext, calculateTabStyle } from '../tab/helpers/tabDecorations.js';
import { resolveRunProperties, encodeCSSFromRPr, encodeCSSFromPPr } from '../../core/super-converter/styles.js';
import { isList } from '@core/commands/list-helpers';
import { getResolvedParagraphProperties, calculateResolvedParagraphProperties } from './resolvedPropertiesCache.js';
import type { Node as PmNode } from 'prosemirror-model';
import { DecorationSet } from 'prosemirror-view';
import type { Decoration, DecorationSource, NodeView, ViewMutationRecord } from 'prosemirror-view';
import type { Editor } from '@core/Editor.js';
import type { ExtensionAttribute } from '@core/Attribute.js';
import type { ParagraphProperties } from '@converter/styles.js';

/**
 * A map to keep track of paragraph node views for quick access.
 * @type {WeakMap<import('prosemirror-model').Node, ParagraphNodeView>}
 */
const nodeViewMap = new WeakMap<PmNode, ParagraphNodeView>();

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
  innerDecorations?: DecorationSource | readonly Decoration[];
  extensionAttrs: Record<string, unknown>;
  private _forceUpdateNext = false;
  _animationFrameRequest: number | null;
  marker: HTMLElement | null;
  separator: HTMLElement | Text | null;
  surroundingContext: {
    hasPreviousParagraph: boolean;
    previousParagraph: PmNode | null;
    nextParagraphProps: ParagraphProperties | null;
  };

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
    this.surroundingContext = { hasPreviousParagraph: false, previousParagraph: null, nextParagraphProps: null };
    nodeViewMap.set(this.node, this);

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

  /**
   * @param {import('prosemirror-model').Node} node
   * @param {import('prosemirror-view').Decoration[]} decorations
   * @param {import('prosemirror-view').Decoration[]} innerDecorations
   * @param {boolean} [forceUpdate=false]
   * @returns {boolean}
   */
  update(node: PmNode, decorations: readonly Decoration[], innerDecorations: DecorationSource): boolean {
    // Remove cached reference for old node
    if (nodeViewMap.get(this.node) === this) {
      nodeViewMap.delete(this.node);
    }
    const oldProps = getResolvedParagraphProperties(this.node);
    const oldAttrs = this.node.attrs;
    this.node = node;
    this.decorations = decorations;
    this.innerDecorations = innerDecorations;
    nodeViewMap.set(this.node, this);

    const forceUpdate = this._forceUpdateNext;
    this._forceUpdateNext = false;

    if (!forceUpdate && !this.#checkShouldUpdate(oldProps, oldAttrs, this.surroundingContext)) {
      return true;
    }

    const currentPos = this.getPos?.() ?? 0;
    calculateResolvedParagraphProperties(this.editor, this.node, this.editor.state.doc.resolve(currentPos));

    this.#updateHTMLAttributes();
    this.#updateDOMStyles(oldProps);

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

  /**
   * Checks whether the node view should update based on changes to props, attrs, or surrounding context.
   * @param {Record<string, unknown>} oldProps
   * @param {Record<string, unknown>} oldAttrs
   * @param {Record<string, unknown>} oldSurroundingContext
   * @returns {boolean}
   */
  #checkShouldUpdate(
    oldProps: Record<string, unknown> | undefined,
    oldAttrs: Record<string, unknown>,
    oldSurroundingContext: Record<string, unknown>,
  ) {
    this.#resolveNeighborParagraphProperties();
    return (
      JSON.stringify(oldAttrs) !== JSON.stringify(this.node.attrs) ||
      JSON.stringify(oldProps) !== JSON.stringify(getResolvedParagraphProperties(this.node)) ||
      JSON.stringify(oldSurroundingContext) !== JSON.stringify(this.surroundingContext)
    );
  }

  /**
   * Updates the HTML attributes of the paragraph DOM element based on node attributes and properties.
   */
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

  /**
   * Updates the CSS styles of the paragraph DOM element based on resolved paragraph properties.
   * @param {Record<string, unknown> | null} oldParagraphProperties
   */
  #updateDOMStyles(oldParagraphProperties: ParagraphProperties | null = null) {
    this.dom.style.cssText = '';
    const paragraphProperties: ParagraphProperties = getResolvedParagraphProperties(this.node) ?? {};
    this.#resolveNeighborParagraphProperties();

    const style = encodeCSSFromPPr(
      paragraphProperties,
      this.surroundingContext.hasPreviousParagraph ?? false,
      this.surroundingContext.nextParagraphProps,
    );
    Object.entries(style).forEach(([k, v]) => {
      if (k in this.dom.style && typeof v === 'string') {
        // Convert camelCase to kebab-case for CSS properties
        const kebabKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        this.dom.style.setProperty(kebabKey, v);
      }
    });

    // Check if spacing-related props changed and if so, trigger update on previous paragraph so it can adjust its bottom spacing
    const spacingChanged =
      JSON.stringify(paragraphProperties.spacing ?? null) !== JSON.stringify(oldParagraphProperties?.spacing ?? null);
    const styleIdChanged = paragraphProperties.styleId !== oldParagraphProperties?.styleId;
    const contextualSpacingChanged =
      paragraphProperties.contextualSpacing !== oldParagraphProperties?.contextualSpacing;

    if (spacingChanged || styleIdChanged || contextualSpacingChanged) {
      const previousNodeView = this.surroundingContext.previousParagraph
        ? nodeViewMap.get(this.surroundingContext.previousParagraph)
        : null;
      if (previousNodeView) {
        // Check if the previous node view is still valid
        try {
          previousNodeView.getPos();
        } catch (error) {
          console.warn('Failed to get position for previous paragraph node view:', error);
          return;
        }
        previousNodeView._forceUpdateNext = true;
        const inner: DecorationSource =
          previousNodeView.innerDecorations && !Array.isArray(previousNodeView.innerDecorations)
            ? (previousNodeView.innerDecorations as DecorationSource)
            : Array.isArray(previousNodeView.innerDecorations)
              ? DecorationSet.create(this.editor.state.doc, previousNodeView.innerDecorations)
              : DecorationSet.empty;
        previousNodeView.update(previousNodeView.node, previousNodeView.decorations, inner);
      }
    }
  }

  /**
   * Resolves properties of neighboring paragraphs to determine surrounding context.
   */
  #resolveNeighborParagraphProperties() {
    const pos = this.getPos ? (this.getPos() ?? 0) : 0;
    const $pos = this.editor.state.doc.resolve(pos);
    const parent = $pos.parent;
    const index = $pos.index();
    let hasPreviousParagraph = false;
    let previousParagraph: PmNode | null = null;
    let nextParagraphProps: ParagraphProperties | null = null;
    if (index > 0) {
      const previousNode = parent.child(index - 1);
      hasPreviousParagraph =
        previousNode.type.name === 'paragraph' && !getResolvedParagraphProperties(previousNode)?.framePr?.dropCap;
      if (hasPreviousParagraph) {
        previousParagraph = previousNode;
      }
    }
    if (parent) {
      if (index < parent.childCount - 1) {
        const nextNode = parent.child(index + 1);
        if (nextNode.type.name === 'paragraph') {
          nextParagraphProps = getResolvedParagraphProperties(nextNode) ?? null;
        }
      }
    }

    this.surroundingContext = {
      hasPreviousParagraph,
      previousParagraph,
      nextParagraphProps,
    };
  }

  /**
   * Updates the styles of the list marker and separator based on current node attributes.
   * @returns {boolean}
   */
  #updateListStyles() {
    if (!this.marker) return true;
    const { suffix: suffixRaw, justification } = this.node.attrs.listRendering || {};
    const suffix = suffixRaw ?? 'tab';
    const justificationValue = (justification as 'left' | 'right' | 'center') ?? 'left';
    this.#calculateMarkerStyle(justificationValue);
    if (suffix === 'tab') {
      const paragraphProperties = getResolvedParagraphProperties(this.node) ?? {};
      const indent =
        paragraphProperties.indent &&
        typeof paragraphProperties.indent === 'object' &&
        'hanging' in paragraphProperties.indent
          ? (paragraphProperties.indent as { hanging?: number; firstLine?: number })
          : null;
      this.#calculateTabSeparatorStyle(justificationValue, indent);
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
        if (this.separator?.parentNode) {
          this.separator.parentNode.removeChild(this.separator);
        }
        this.separator = document.createElement('span');
        if (this.marker.parentNode) {
          this.marker.after(this.separator);
        }
      }
      if (this.separator instanceof HTMLElement) {
        this.separator.className = 'sd-editor-tab';
        this.separator.contentEditable = 'false';
      }
    } else if (suffix === 'space') {
      if (this.separator == null || this.separator.nodeType !== Node.TEXT_NODE) {
        if (this.separator?.parentNode) {
          this.separator.parentNode.removeChild(this.separator);
        }
        this.separator = document.createTextNode('\u00A0');
        if (this.marker.parentNode) {
          this.marker.after(this.separator);
        }
      }
      if (this.separator) {
        this.separator.textContent = '\u00A0';
      }
    } else if (suffix === 'nothing') {
      if (this.separator == null || this.separator.nodeType !== Node.TEXT_NODE) {
        if (this.separator?.parentNode) {
          this.separator.parentNode.removeChild(this.separator);
        }
        this.separator = document.createTextNode('');
        if (this.marker.parentNode) {
          this.marker.after(this.separator);
        }
      }
      if (this.separator) {
        this.separator.textContent = '';
      }
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
    if (nodeViewMap.get(this.node) === this) {
      nodeViewMap.delete(this.node);
    }
  }
}
