/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { SuperDoc } from './SuperDoc.js';

const instances: SuperDoc[] = [];
function create() {
  const selector = document.createElement('div');
  document.body.append(selector);
  const instance = new SuperDoc({ selector, telemetry: { enabled: false } });
  instances.push(instance);
  (instance as unknown as { superdocStore: { documents: unknown[] } }).superdocStore = { documents: [] };
  return instance;
}
afterEach(() => {
  for (const instance of instances.splice(0)) instance.destroy();
  document.body.replaceChildren();
});
describe('SuperDoc source lifecycle event ordering', () => {
  it('publishes actual early terminal source events after mounted readiness in their original order', () => {
    const instance = create(),
      events: string[] = [];
    for (const type of ['ready', 'source:complete', 'source:signals-complete'] as const)
      instance.on(type, () => events.push(type));
    instance.broadcastSourceComplete();
    instance.broadcastSourceSignalsComplete();
    expect(events).toEqual([]);
    instance.broadcastReady();
    expect(events).toEqual(['ready', 'source:complete', 'source:signals-complete']);
  });
  it('publishes subsequent source events immediately after readiness', () => {
    const instance = create(),
      events: string[] = [];
    instance.on('source:complete', () => events.push('complete'));
    instance.broadcastReady();
    instance.broadcastSourceComplete();
    expect(events).toEqual(['complete']);
  });
  it('does not replay pending source events or readiness after destruction', () => {
    const instance = create();
    instance.broadcastSourceComplete();
    instance.broadcastSourceSignalsComplete();
    instance.destroy();
    const events: string[] = [];
    for (const type of ['ready', 'source:complete', 'source:signals-complete'] as const)
      instance.on(type, () => events.push(type));
    instance.broadcastReady();
    instance.broadcastSourceComplete();
    instance.broadcastSourceSignalsComplete();
    expect(events).toEqual([]);
  });
});
