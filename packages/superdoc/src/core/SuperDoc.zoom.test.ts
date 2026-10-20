/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vite-plus/test';
import { SuperDoc } from './SuperDoc.js';

function zoomInstance(fitWidth?: { min: number; max: number }) {
  const instance = Object.create(SuperDoc.prototype) as InstanceType<typeof SuperDoc>;
  Object.assign(instance, {
    config: { zoom: { fitWidth } },
    superdocStore: {
      activeZoom: 100,
      zoomMode: 'manual',
      viewportMetrics: { availableWidth: 600, documentWidth: 800, fitZoom: 75 },
    },
    emit: vi.fn(),
  });
  return instance;
}

describe('zoom policy metadata', () => {
  it('identifies fit-width bounds without limiting a valid 150% manual zoom', () => {
    const instance = zoomInstance();
    instance.setZoom(150);
    expect(instance.getZoomState()).toEqual({
      mode: 'manual',
      value: 150,
      fitZoom: 75,
      fitWidth: { min: 10, max: 100 },
      min: 10,
      max: 100,
    });
  });

  it('reports normalized custom fit bounds and restores both percentage and mode', () => {
    const instance = zoomInstance({ min: 60, max: 80 });
    instance.setZoomMode('fit-width');
    const before = instance.getZoomState();
    expect(before).toMatchObject({ value: 75, mode: 'fit-width', fitWidth: { min: 60, max: 80 } });
    instance.setZoom(150);
    expect(instance.getZoomState()).toMatchObject({ value: 150, mode: 'manual' });
    instance.setZoom(before.value);
    instance.setZoomMode(before.mode);
    expect(instance.getZoomState()).toEqual(before);
  });

  it('accepts positive finite manual values outside both fit bounds and rejects invalid values', () => {
    const instance = zoomInstance();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const value of [0.5, 150, 1000]) {
      instance.setZoom(value);
      expect(instance.getZoom()).toBe(value);
    }
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      instance.setZoom(value);
      expect(instance.getZoom()).toBe(1000);
    }
    warn.mockRestore();
  });
});
