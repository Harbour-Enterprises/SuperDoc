// @ts-check
import { describe, it, expect } from 'vitest';
import { preProcessPageInstruction } from './page-preprocessor.js';

describe('preProcessPageInstruction', () => {
  const mockDocx = {};

  it('should create a sd:autoPageNumber node', () => {
    const nodesToCombine = [];
    const instruction = 'PAGE';
    const result = preProcessPageInstruction(nodesToCombine, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'sd:autoPageNumber',
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
    const instruction = 'PAGE';
    const result = preProcessPageInstruction(nodesToCombine, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'sd:autoPageNumber',
        type: 'element',
        elements: [{ name: 'w:rPr', elements: [{ name: 'w:b' }] }],
      },
    ]);
  });
});
