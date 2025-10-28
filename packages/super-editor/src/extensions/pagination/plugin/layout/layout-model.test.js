import { describe, it, expect } from 'vitest';
import { buildLayoutModel } from './layout-model.js';

const createMockView = ({ docSize = 0 } = {}) => ({
  state: {
    doc: {
      content: { size: docSize },
      descendants: () => {},
    },
  },
  dom: {
    getBoundingClientRect: () => ({ top: 0 }),
  },
});

describe('buildLayoutModel', () => {
  it('ensures page count matches breaks even when positions are missing', () => {
    const view = createMockView({ docSize: 42 });
    const metrics = {
      pageHeightPx: 720,
      marginsPx: { top: 96, bottom: 96, left: 72, right: 72 },
    };
    const pageBreaks = [{ pageIndex: 0, break: { top: 500 } }];

    const { pages } = buildLayoutModel(view, metrics, { pageBreaks });

    expect(pages).toHaveLength(2);
    expect(pages[0].pageIndex).toBe(0);
    expect(pages[1].pageIndex).toBe(1);
  });
});
