// @ts-check
import { describe, it, expect } from 'vitest';
import { preProcessNumPagesInstruction } from './num-pages-preprocessor.js';

describe('preProcessNumPagesInstruction', () => {
  const mockDocx = {};

  it('should create a sd:totalPageNumber node', () => {
    const nodesToCombine = [];
    const instruction = 'NUMPAGES';
    const result = preProcessNumPagesInstruction(nodesToCombine, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'sd:totalPageNumber',
        type: 'element',
      },
    ]);
  });

  it('should extract rPr from nodes', () => {
    const nodesToCombine = [
      {
        name: 'w:r',
        elements: [
          { name: 'w:rPr', elements: [{ name: 'w:b' }] },
          { name: 'w:t', elements: [{ type: 'text', text: '1' }] },
        ],
      },
    ];
    const instruction = 'NUMPAGES';
    const result = preProcessNumPagesInstruction(nodesToCombine, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'sd:totalPageNumber',
        type: 'element',
        elements: [{ name: 'w:rPr', elements: [{ name: 'w:b' }] }],
      },
    ]);
  });
});
