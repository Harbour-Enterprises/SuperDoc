import { describe, it, expect } from 'vitest';
import { imageNodeToBlock } from '@layout-engine/pm-adapter/src/converters/image';

describe('Watermark End-to-End Test', () => {
  it('should convert watermark ProseMirror node to ImageBlock with correct anchor', () => {
    // This is what our watermark import creates
    const watermarkPmNode = {
      type: { name: 'image' },
      attrs: {
        src: 'word/media/baloons.png',
        alt: 'Baloons',
        extension: 'png',
        title: 'Baloons',
        rId: 'rId1',
        vmlWatermark: true,
        vmlStyle: 'position:absolute;margin-left:0;margin-top:0;width:466.55pt;height:233.25pt;z-index:-251653120',
        vmlAttributes: {
          id: 'WordPictureWatermark100927634',
          'o:spid': '_x0000_s1027',
          type: '#_x0000_t75',
        },
        vmlImagedata: {
          'r:id': 'rId1',
          'o:title': 'Baloons',
          gain: '19661f',
          blacklevel: '22938f',
        },
        isAnchor: true,
        inline: false,
        wrap: {
          type: 'None',
          attrs: {
            behindDoc: true,
          },
        },
        anchorData: {
          hRelativeFrom: 'margin',
          vRelativeFrom: 'margin',
          alignH: 'center',
          alignV: 'center',
        },
        size: {
          width: 622.07,
          height: 311,
        },
        marginOffset: {
          horizontal: 0,
          top: 0,
        },
        gain: '19661f',
        blacklevel: '22938f',
      },
    };

    const nextBlockId = (kind) => `${kind}-block-1`;
    const positions = new Map();

    const imageBlock = imageNodeToBlock(watermarkPmNode, nextBlockId, positions);

    console.log('ImageBlock:', JSON.stringify(imageBlock, null, 2));

    expect(imageBlock).not.toBeNull();
    expect(imageBlock.kind).toBe('image');
    expect(imageBlock.src).toBe('word/media/baloons.png');

    // Check anchor properties
    expect(imageBlock.anchor).toBeDefined();
    expect(imageBlock.anchor.isAnchored).toBe(true);
    expect(imageBlock.anchor.hRelativeFrom).toBe('margin');
    expect(imageBlock.anchor.vRelativeFrom).toBe('margin');
    expect(imageBlock.anchor.alignH).toBe('center');
    expect(imageBlock.anchor.alignV).toBe('center');
    expect(imageBlock.anchor.behindDoc).toBe(true);

    // Check wrap
    expect(imageBlock.wrap).toBeDefined();
    expect(imageBlock.wrap.type).toBe('None');
    expect(imageBlock.wrap.behindDoc).toBe(true);

    // Check dimensions
    expect(imageBlock.width).toBeCloseTo(622.07, 1);
    expect(imageBlock.height).toBeCloseTo(311, 1);

    console.log('\n✓ ImageBlock has correct anchor.isAnchored:', imageBlock.anchor.isAnchored);
    console.log('✓ ImageBlock has correct anchor.vRelativeFrom:', imageBlock.anchor.vRelativeFrom);
    console.log('✓ ImageBlock has correct anchor.behindDoc:', imageBlock.anchor.behindDoc);
    console.log('✓ This should be picked up by collectPreRegisteredAnchors() because vRelativeFrom === "margin"');
  });
});
