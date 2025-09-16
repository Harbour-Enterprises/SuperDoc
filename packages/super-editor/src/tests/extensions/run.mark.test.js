import { describe, it, expect } from 'vitest';
import { Run } from '../../extensions/run/run.js';
import { getExtensionConfigField } from '../../core/helpers/getExtensionConfigField.js';

describe('Run mark (extensions/run/run.js)', () => {
  it('exposes correct name and inclusive=false', () => {
    expect(Run.name).toBe('run');
    const inclusive = getExtensionConfigField(Run, 'inclusive', { name: Run.name, options: Run.options });
    expect(inclusive).toBe(false);
  });

  it('parseDOM recognizes span[data-run]', () => {
    const parseDOM = getExtensionConfigField(Run, 'parseDOM', { name: Run.name, options: Run.options });
    const rules = parseDOM();
    expect(Array.isArray(rules)).toBe(true);
    const hasSelector = rules.some((r) => r.tag === 'span[data-run]');
    expect(hasSelector).toBe(true);
  });

  it('renderDOM returns span with data-run and merged attributes', () => {
    const renderDOM = getExtensionConfigField(Run, 'renderDOM', { name: Run.name, options: { htmlAttributes: { 'data-extra': 'x', class: 'base' } } });
    const attrs = { htmlAttributes: { id: 'id1', class: 'override' } };
    const out = renderDOM(attrs);
    expect(Array.isArray(out)).toBe(true);
    const [tag, attributes] = out;
    expect(tag).toBe('span');
    expect(attributes['data-run']).toBe('1');
    expect(attributes['data-extra']).toBe('x');
    expect(attributes.id).toBe('id1');
    // class merging is not defined; ensure at least one class key exists
    expect('class' in attributes).toBe(true);
  });

  it('adds runProperties attribute (default null, rendered=false)', () => {
    const addAttributes = getExtensionConfigField(Run, 'addAttributes', { name: Run.name, options: Run.options });
    const defs = addAttributes();
    expect(defs).toHaveProperty('runProperties');
    expect(defs.runProperties.default).toBeNull();
    expect(defs.runProperties.rendered).toBe(false);
  });
});
