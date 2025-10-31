import { describe, it, expect, beforeEach } from 'vitest';
import { applyHiddenContainerStyles, HIDDEN_CONTAINER_STYLES } from './hidden-container.js';

describe('hidden-container helpers', () => {
  let element;

  beforeEach(() => {
    element = {
      style: {},
    };
  });

  it('applies the default hidden container styles', () => {
    applyHiddenContainerStyles(element);

    Object.entries(HIDDEN_CONTAINER_STYLES).forEach(([property, value]) => {
      expect(element.style[property]).toBe(value);
    });
  });

  it('allows overrides to supersede default styles', () => {
    applyHiddenContainerStyles(element, { top: '10px', width: '200px' });

    expect(element.style.top).toBe('10px');
    expect(element.style.width).toBe('200px');
    expect(element.style.position).toBe(HIDDEN_CONTAINER_STYLES.position);
  });

  it('returns the same element reference', () => {
    const result = applyHiddenContainerStyles(element);
    expect(result).toBe(element);
  });
});
