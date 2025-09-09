import { vi, beforeEach, describe, it, expect } from 'vitest';
import { config } from './index.js';
import { processOutputMarks, generateRunProps } from '../../../../exporter.js';

vi.mock('../../../../exporter.js', () => {
  const processOutputMarks = vi.fn((marks) => marks || []);
  const generateRunProps = vi.fn((processedMarks) => ({
    name: 'w:rPr',
    elements: [],
  }));
  return { processOutputMarks, generateRunProps };
});

describe('w:tab translator config', () => {
  describe('encode', () => {
    it('encodes to a SuperDoc tab by default', () => {
      const res = config.encode({}, undefined);
      expect(res).toEqual({ type: 'tab' });
    });

    it('maps known attributes and preserves unknown ones', () => {
      const params = {
        nodes: [
          {
            attributes: {
              'w:val': '96',
              'w:custom': 'foo',
            },
          },
        ],
      };
      const res = config.encode(params, { tabSize: '96' });
      expect(res.type).toBe('tab');
      expect(res.attrs).toEqual({ tabSize: '96', 'w:custom': 'foo' });
    });
  });

  describe('decode', () => {
    it('wraps <w:tab> in a <w:r> run', () => {
      const res = config.decode({ node: { type: 'tab' } }, undefined);
      expect(res).toBeTruthy();
      expect(res.name).toBe('w:r');
      expect(Array.isArray(res.elements)).toBe(true);
      expect(res.elements[0]).toEqual({ name: 'w:tab' });
    });

    it('copies decoded attributes and preserves unknown ones', () => {
      const params = { node: { type: 'tab', attrs: { tabSize: '96', 'w:custom': 'foo' } } };
      const res = config.decode(params, { 'w:val': '96' });
      expect(res.name).toBe('w:r');
      expect(res.elements[0]).toEqual({
        name: 'w:tab',
        attributes: { 'w:val': '96', 'w:custom': 'foo' },
      });
    });

    it('returns undefined when params.node is missing', () => {
      const res = config.decode({}, { 'w:val': '96' });
      expect(res).toBeUndefined();
    });
  });

  describe('attributes mapping metadata', () => {
    it('exposes expected attribute handler (w:val -> tabSize)', () => {
      const attrMap = config.attributes;
      const names = attrMap.map((a) => [a.xmlName, a.sdName]);
      expect(names).toContainEqual(['w:val', 'tabSize']);

      const byXml = Object.fromEntries(attrMap.map((a) => [a.xmlName, a]));
      expect(typeof byXml['w:val'].encode).toBe('function');
      expect(typeof byXml['w:val'].decode).toBe('function');
    });
  });
});

describe('decode — marks and run props', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls processOutputMarks with node.marks and adds run props before <w:tab>', () => {
    const fakeMarks = [{ type: 'bold' }, { type: 'italic' }];
    const processed = [{ type: 'bold' }];
    const rPrNode = { name: 'w:rPr', elements: [{ name: 'w:b' }] };

    processOutputMarks.mockReturnValue(processed);
    generateRunProps.mockReturnValue(rPrNode);

    const params = { node: { type: 'tab', marks: fakeMarks } };
    const res = config.decode(params, undefined);

    expect(processOutputMarks).toHaveBeenCalledTimes(1);
    expect(processOutputMarks).toHaveBeenCalledWith(fakeMarks);

    expect(generateRunProps).toHaveBeenCalledTimes(1);
    expect(generateRunProps).toHaveBeenCalledWith(processed);

    expect(res).toBeTruthy();
    expect(res.name).toBe('w:r');
    expect(Array.isArray(res.elements)).toBe(true);

    expect(res.elements[0]).toEqual(rPrNode); // run props first
    expect(res.elements[1]).toEqual({ name: 'w:tab' });
  });

  it('does not add run props when processOutputMarks returns an empty array', () => {
    processOutputMarks.mockReturnValue([]);

    const params = { node: { type: 'tab', marks: [{ type: 'bold' }] } };
    const res = config.decode(params, undefined);

    expect(processOutputMarks).toHaveBeenCalledTimes(1);
    expect(generateRunProps).not.toHaveBeenCalled();

    expect(res.name).toBe('w:r');
    expect(res.elements).toEqual([{ name: 'w:tab' }]);
  });

  it('still merges attributes correctly when marks are present', () => {
    processOutputMarks.mockReturnValue([{ type: 'bold' }]);
    generateRunProps.mockReturnValue({ name: 'w:rPr', elements: [{ name: 'w:b' }] });

    const params = {
      node: { type: 'tab', attrs: { tabSize: '96', 'w:custom': 'foo' }, marks: [{ type: 'bold' }] },
    };
    const res = config.decode(params, { 'w:val': '96' });

    expect(res.name).toBe('w:r');
    expect(res.elements[0]).toEqual({ name: 'w:rPr', elements: [{ name: 'w:b' }] });
    expect(res.elements[1]).toEqual({
      name: 'w:tab',
      attributes: { 'w:val': '96', 'w:custom': 'foo' },
    });
  });

  it('passes an empty array to processOutputMarks when node.marks is missing', () => {
    processOutputMarks.mockReturnValue([]);

    const res = config.decode({ node: { type: 'tab' } }, undefined);

    expect(processOutputMarks).toHaveBeenCalledTimes(1);
    expect(processOutputMarks).toHaveBeenCalledWith([]);
    expect(res.elements).toEqual([{ name: 'w:tab' }]);
  });
});
