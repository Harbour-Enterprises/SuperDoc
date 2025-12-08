/**
 * Tests for Image Node Converter
 */

import { describe, it, expect, vi } from 'vitest';
import { imageNodeToBlock, handleImageNode } from './image.js';
import type { PMNode, BlockIdGenerator, PositionMap } from '../types.js';
import type { ImageBlock } from '@superdoc/contracts';

describe('image converter', () => {
  describe('imageNodeToBlock', () => {
    const mockBlockIdGenerator: BlockIdGenerator = vi.fn((kind) => `test-${kind}-id`);
    const mockPositionMap: PositionMap = new Map();

    it('returns null when node has no src', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {},
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap);

      expect(result).toBeNull();
    });

    it('returns null when src is not a string', () => {
      const node: PMNode = {
        type: 'image',
        attrs: { src: 123 },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap);

      expect(result).toBeNull();
    });

    it('converts basic image node with src', () => {
      const node: PMNode = {
        type: 'image',
        attrs: { src: 'https://example.com/image.png' },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap);

      expect(result).toBeDefined();
      expect(result?.kind).toBe('image');
      expect(result?.src).toBe('https://example.com/image.png');
      expect(result?.id).toBe('test-image-id');
      expect(result?.display).toBe('block');
      expect(result?.objectFit).toBe('contain');
    });

    it('includes width and height when provided', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          size: { width: 300, height: 200 },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });

    it('excludes non-finite width/height values', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          size: { width: Infinity, height: NaN },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });

    it('includes alt and title when provided', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          alt: 'Alt text',
          title: 'Image title',
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.alt).toBe('Alt text');
      expect(result.title).toBe('Image title');
    });

    it('sets display to inline when inline attribute is true', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          inline: true,
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.display).toBe('inline');
      expect(result.objectFit).toBe('scale-down');
    });

    it('respects explicit display attribute', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          display: 'inline',
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.display).toBe('inline');
    });

    it('respects explicit objectFit attribute', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          objectFit: 'cover',
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.objectFit).toBe('cover');
    });

    it('handles wrap configuration', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          wrap: {
            type: 'Square',
            attrs: {
              wrapText: 'bothSides',
              distTop: 10,
              distBottom: 10,
              distLeft: 5,
              distRight: 5,
            },
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.wrap).toBeDefined();
      expect(result.wrap?.type).toBe('Square');
      expect(result.wrap?.wrapText).toBe('bothSides');
      expect(result.wrap?.distTop).toBe(10);
      expect(result.wrap?.distBottom).toBe(10);
      expect(result.wrap?.distLeft).toBe(5);
      expect(result.wrap?.distRight).toBe(5);
    });

    it('handles wrap with polygon', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          wrap: {
            type: 'Tight',
            attrs: {
              polygon: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
              ],
            },
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.wrap?.polygon).toEqual([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]);
    });

    it('handles wrap with behindDoc flag', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          wrap: {
            type: 'Through',
            attrs: {
              behindDoc: true,
            },
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.wrap?.behindDoc).toBe(true);
    });

    it('preserves Inline wrap type for spacing attributes', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          wrap: {
            type: 'Inline',
            attrs: {
              distTop: 10,
              distBottom: 20,
            },
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      // Inline wrap type is now preserved to support spacing attributes
      expect(result.wrap).toBeDefined();
      expect(result.wrap?.type).toBe('Inline');
      expect(result.wrap?.distTop).toBe(10);
      expect(result.wrap?.distBottom).toBe(20);
    });

    it('handles anchor data', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          anchorData: {
            hRelativeFrom: 'column',
            vRelativeFrom: 'paragraph',
            alignH: 'center',
            alignV: 'top',
            offsetH: 50,
            offsetV: 100,
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.anchor).toBeDefined();
      expect(result.anchor?.hRelativeFrom).toBe('column');
      expect(result.anchor?.vRelativeFrom).toBe('paragraph');
      expect(result.anchor?.alignH).toBe('center');
      expect(result.anchor?.alignV).toBe('top');
      expect(result.anchor?.offsetH).toBe(50);
      expect(result.anchor?.offsetV).toBe(100);
    });

    it('marks image as anchored when isAnchor is true', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          isAnchor: true,
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.anchor?.isAnchored).toBe(true);
      expect(result.objectFit).toBe('contain');
    });

    it('handles padding', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          padding: {
            top: 10,
            right: 15,
            bottom: 10,
            left: 15,
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.padding).toEqual({
        top: 10,
        right: 15,
        bottom: 10,
        left: 15,
      });
    });

    it('handles margin from marginOffset', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          marginOffset: {
            top: 20,
            left: 10,
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.margin).toEqual({
        top: 20,
        left: 10,
      });
    });

    it('includes PM positions in attrs when available', () => {
      const node: PMNode = {
        type: 'image',
        attrs: { src: 'image.jpg' },
      };

      const positions = new Map();
      positions.set(node, { start: 10, end: 20 });

      const result = imageNodeToBlock(node, mockBlockIdGenerator, positions) as ImageBlock;

      expect(result.attrs?.pmStart).toBe(10);
      expect(result.attrs?.pmEnd).toBe(20);
    });

    it('validates and filters invalid wrap type', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          wrap: {
            type: 'InvalidType',
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.wrap).toBeUndefined();
    });

    it('validates and filters invalid anchor relative values', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {
          src: 'image.jpg',
          anchorData: {
            hRelativeFrom: 'invalidValue',
            vRelativeFrom: 'alsoInvalid',
          },
        },
      };

      const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

      expect(result.anchor?.hRelativeFrom).toBeUndefined();
      expect(result.anchor?.vRelativeFrom).toBeUndefined();
    });

    it('converts boolean-like values for behindDoc', () => {
      const testCases = [
        { input: 1, expected: true },
        { input: 0, expected: false },
        { input: '1', expected: true },
        { input: '0', expected: false },
        { input: 'true', expected: true },
        { input: 'false', expected: false },
      ];

      testCases.forEach(({ input, expected }) => {
        const node: PMNode = {
          type: 'image',
          attrs: {
            src: 'image.jpg',
            wrap: {
              type: 'Square',
              attrs: {
                behindDoc: input,
              },
            },
          },
        };

        const result = imageNodeToBlock(node, mockBlockIdGenerator, mockPositionMap) as ImageBlock;

        expect(result.wrap?.behindDoc).toBe(expected);
      });
    });
  });

  describe('handleImageNode', () => {
    it('converts image node and adds to blocks', () => {
      const node: PMNode = {
        type: 'image',
        attrs: { src: 'image.jpg' },
      };

      const blocks: FlowBlock[] = [];
      const recordBlockKind = vi.fn();
      const nextBlockId = vi.fn(() => 'img-1');
      const positions = new Map();

      const context = {
        blocks,
        recordBlockKind,
        nextBlockId,
        positions,
        trackedChangesConfig: { enabled: false, mode: 'review' as const },
      };

      handleImageNode(node, context as never);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].kind).toBe('image');
      expect(blocks[0].src).toBe('image.jpg');
      expect(recordBlockKind).toHaveBeenCalledWith('image');
    });

    it('does not add block when imageNodeToBlock returns null', () => {
      const node: PMNode = {
        type: 'image',
        attrs: {}, // No src
      };

      const blocks: FlowBlock[] = [];
      const recordBlockKind = vi.fn();

      const context = {
        blocks,
        recordBlockKind,
        nextBlockId: vi.fn(() => 'img-1'),
        positions: new Map(),
        trackedChangesConfig: { enabled: false, mode: 'review' as const },
      };

      handleImageNode(node, context as never);

      expect(blocks).toHaveLength(0);
      expect(recordBlockKind).not.toHaveBeenCalled();
    });

    it('handles tracked changes when enabled', () => {
      const node: PMNode = {
        type: 'image',
        attrs: { src: 'image.jpg' },
        marks: [
          {
            type: 'insertion',
            attrs: { author: 'Test Author', date: '2024-01-01' },
          },
        ],
      };

      const blocks: FlowBlock[] = [];
      const context = {
        blocks,
        recordBlockKind: vi.fn(),
        nextBlockId: vi.fn(() => 'img-1'),
        positions: new Map(),
        trackedChangesConfig: { enabled: true, mode: 'review' as const },
      };

      handleImageNode(node, context as never);

      expect(blocks).toHaveLength(1);
    });
  });
});
