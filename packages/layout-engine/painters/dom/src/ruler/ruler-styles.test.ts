import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { ensureRulerStyles, _resetRulerStylesInjection } from './ruler-styles.js';

describe('ensureRulerStyles', () => {
  let dom: JSDOM;
  let doc: Document;

  beforeEach(() => {
    // Reset the injection state before each test
    _resetRulerStylesInjection();

    // Create a fresh DOM for each test
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = dom.window.document;
  });

  afterEach(() => {
    // Clean up: reset injection state
    _resetRulerStylesInjection();
  });

  it('injects styles into the document head', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]');
    expect(styleElement).not.toBeNull();
  });

  it('injects styles only once when called multiple times', () => {
    ensureRulerStyles(doc);
    ensureRulerStyles(doc);
    ensureRulerStyles(doc);

    const styleElements = doc.querySelectorAll('style[data-superdoc-ruler-styles]');
    expect(styleElements.length).toBe(1);
  });

  it('adds data attribute to style element', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]');
    expect(styleElement?.getAttribute('data-superdoc-ruler-styles')).toBe('true');
  });

  it('injects CSS content with ruler class names', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('.superdoc-ruler');
    expect(styleElement?.textContent).toContain('.superdoc-ruler-tick');
    expect(styleElement?.textContent).toContain('.superdoc-ruler-handle');
    expect(styleElement?.textContent).toContain('.superdoc-ruler-indicator');
  });

  it('injects CSS with handle hover styles', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('.superdoc-ruler-handle:hover');
  });

  it('injects CSS with handle active/dragging styles', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('.superdoc-ruler-handle:active');
    expect(styleElement?.textContent).toContain('[data-dragging="true"]');
  });

  it('injects CSS with print media query', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('@media print');
    expect(styleElement?.textContent).toContain('display: none !important');
  });

  it('injects CSS with high contrast mode support', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('@media (prefers-contrast: high)');
  });

  it('injects CSS with reduced motion support', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styleElement?.textContent).toContain('transition: none');
  });

  it('injects CSS with indicator transition', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    expect(styleElement?.textContent).toContain('.superdoc-ruler-indicator');
    expect(styleElement?.textContent).toContain('transition');
  });

  it('appends style element to document head', () => {
    const initialHeadChildCount = doc.head.children.length;

    ensureRulerStyles(doc);

    expect(doc.head.children.length).toBe(initialHeadChildCount + 1);

    const lastChild = doc.head.lastElementChild;
    expect(lastChild?.tagName).toBe('STYLE');
    expect(lastChild?.getAttribute('data-superdoc-ruler-styles')).toBe('true');
  });

  it('does nothing when document is null', () => {
    // Should not throw
    expect(() => {
      ensureRulerStyles(null);
    }).not.toThrow();
  });

  it('does nothing when document is undefined', () => {
    // Should not throw
    expect(() => {
      ensureRulerStyles(undefined);
    }).not.toThrow();
  });

  it('handles document without head gracefully', () => {
    // Create a document without a head element
    const minimalDom = new JSDOM('<!DOCTYPE html><html></html>');
    const minimalDoc = minimalDom.window.document;

    // Should not throw even if head is missing
    expect(() => {
      ensureRulerStyles(minimalDoc);
    }).not.toThrow();
  });

  describe('multiple document instances', () => {
    it('injects styles separately for different documents', () => {
      const dom1 = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
      const doc1 = dom1.window.document;

      const dom2 = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
      const doc2 = dom2.window.document;

      ensureRulerStyles(doc1);

      // After injecting into doc1, doc2 should still be empty
      const styleInDoc2Before = doc2.querySelector('style[data-superdoc-ruler-styles]');
      expect(styleInDoc2Before).toBeNull();

      // Note: The current implementation uses a global flag, so this will not inject again
      // This test documents the current behavior
      ensureRulerStyles(doc2);

      // Due to global flag, it won't inject into doc2
      const styleInDoc2After = doc2.querySelector('style[data-superdoc-ruler-styles]');
      expect(styleInDoc2After).toBeNull();
    });
  });

  describe('CSS content verification', () => {
    it('includes all required class selectors', () => {
      ensureRulerStyles(doc);

      const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
      const cssContent = styleElement?.textContent || '';

      // Verify all main class names are present
      expect(cssContent).toContain('.superdoc-ruler');
      expect(cssContent).toContain('.superdoc-ruler-tick');
      expect(cssContent).toContain('.superdoc-ruler-handle');
      expect(cssContent).toContain('.superdoc-ruler-indicator');
      expect(cssContent).toContain('.superdoc-ruler-label');
    });

    it('includes grabbing cursor for dragging state', () => {
      ensureRulerStyles(doc);

      const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
      const cssContent = styleElement?.textContent || '';

      expect(cssContent).toContain('grabbing');
    });

    it('includes flex-shrink property for ticks', () => {
      ensureRulerStyles(doc);

      const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
      const cssContent = styleElement?.textContent || '';

      expect(cssContent).toContain('flex-shrink');
    });

    it('includes border styling for high contrast mode', () => {
      ensureRulerStyles(doc);

      const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
      const cssContent = styleElement?.textContent || '';

      expect(cssContent).toContain('border');
    });
  });
});

describe('_resetRulerStylesInjection', () => {
  let dom: JSDOM;
  let doc: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = dom.window.document;
  });

  afterEach(() => {
    _resetRulerStylesInjection();
  });

  it('allows styles to be injected again after reset', () => {
    // First injection
    ensureRulerStyles(doc);

    const styleElements = doc.querySelectorAll('style[data-superdoc-ruler-styles]');
    expect(styleElements.length).toBe(1);

    // Reset the flag
    _resetRulerStylesInjection();

    // Create a new document
    const dom2 = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const doc2 = dom2.window.document;

    // Second injection should work
    ensureRulerStyles(doc2);

    const styleInDoc2 = doc2.querySelectorAll('style[data-superdoc-ruler-styles]');
    expect(styleInDoc2.length).toBe(1);
  });

  it('can be called multiple times safely', () => {
    _resetRulerStylesInjection();
    _resetRulerStylesInjection();
    _resetRulerStylesInjection();

    // Should still allow injection
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]');
    expect(styleElement).not.toBeNull();
  });

  it('resets the internal injection flag', () => {
    // Inject once
    ensureRulerStyles(doc);

    // Try to inject again (should be skipped due to flag)
    const dom2 = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const doc2 = dom2.window.document;
    ensureRulerStyles(doc2);

    const styleInDoc2 = doc2.querySelector('style[data-superdoc-ruler-styles]');
    expect(styleInDoc2).toBeNull(); // Not injected due to flag

    // Reset and try again
    _resetRulerStylesInjection();

    const dom3 = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const doc3 = dom3.window.document;
    ensureRulerStyles(doc3);

    const styleInDoc3 = doc3.querySelector('style[data-superdoc-ruler-styles]');
    expect(styleInDoc3).not.toBeNull(); // Successfully injected after reset
  });
});

describe('integration: styles and DOM elements', () => {
  let dom: JSDOM;
  let doc: Document;

  beforeEach(() => {
    _resetRulerStylesInjection();
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    doc = dom.window.document;
  });

  afterEach(() => {
    _resetRulerStylesInjection();
  });

  it('styles are available for ruler elements after injection', () => {
    ensureRulerStyles(doc);

    // Create a ruler element
    const ruler = doc.createElement('div');
    ruler.className = 'superdoc-ruler';
    doc.body.appendChild(ruler);

    // Verify element exists and can be styled
    const rulerElement = doc.querySelector('.superdoc-ruler');
    expect(rulerElement).not.toBeNull();

    // Verify style element exists
    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]');
    expect(styleElement).not.toBeNull();
  });

  it('multiple ruler elements can be created after single style injection', () => {
    ensureRulerStyles(doc);

    // Create multiple ruler elements
    const ruler1 = doc.createElement('div');
    ruler1.className = 'superdoc-ruler';
    doc.body.appendChild(ruler1);

    const ruler2 = doc.createElement('div');
    ruler2.className = 'superdoc-ruler';
    doc.body.appendChild(ruler2);

    const rulers = doc.querySelectorAll('.superdoc-ruler');
    expect(rulers.length).toBe(2);

    // Style should still be injected only once
    const styleElements = doc.querySelectorAll('style[data-superdoc-ruler-styles]');
    expect(styleElements.length).toBe(1);
  });

  it('ruler class names in styles match expected values', () => {
    ensureRulerStyles(doc);

    const styleElement = doc.querySelector('style[data-superdoc-ruler-styles]') as HTMLStyleElement;
    const cssContent = styleElement?.textContent || '';

    // These should match the classes used in RULER_STYLES
    // Note: handleLeft and handleRight are applied via inline styles, not CSS
    expect(cssContent).toContain('superdoc-ruler');
    expect(cssContent).toContain('superdoc-ruler-tick');
    expect(cssContent).toContain('superdoc-ruler-handle');
    expect(cssContent).toContain('superdoc-ruler-indicator');
    expect(cssContent).toContain('superdoc-ruler-label');
  });
});
