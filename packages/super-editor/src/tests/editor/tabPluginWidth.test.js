import { describe, it, expect } from 'vitest';
import { initTestEditor } from '../helpers/helpers.js';

const makeText = (text) => ({
  type: 'text',
  text,
  marks: [
    { type: 'textStyle', attrs: { fontFamily: 'Arial', fontSize: '10pt' } },
    { type: 'run', attrs: { runProperties: null } },
  ],
});

const makeTab = () => ({
  type: 'tab',
  marks: [
    { type: 'textStyle', attrs: {} },
    { type: 'run', attrs: { runProperties: null } },
  ],
});

describe('tab plugin width calculation', () => {
  it('logs width for sample text', () => {
    const paragraph = {
      type: 'paragraph',
      attrs: {
        tabStops: [
          { val: 'start', pos: 96, originalPos: '1440' },
          { val: 'start', pos: 160, originalPos: '2400' },
          { val: 'start', pos: 240, originalPos: '3600' },
          { val: 'start', pos: 336, originalPos: '5040' },
          { val: 'start', pos: 480, originalPos: '7200' },
        ],
      },
      content: [
        makeText('At left margin (1")'),
        makeTab(),
        makeText('At 2.5"'),
        makeTab(),
        makeText('At 3" (custom)'),
        makeTab(),
        makeText('2x Tab (~5.8")'),
        makeTab(),
        makeText('Custom 5"'),
      ],
    };

    const doc = {
      type: 'doc',
      content: [paragraph],
    };

    global.window.__DEBUG_TABS__ = true;

    const {
      editor: { view },
    } = initTestEditor({ loadFromSchema: true, content: doc });

    const decorations = view.state.plugins
      .map((plugin) => plugin.getState?.(view.state))
      .find((state) => state && state.decorations);

    expect(decorations).toBeDefined();
  });
});
