import { describe, expect, it, vi } from 'vite-plus/test';
import { createDocumentLoadScope } from './document-load.js';

describe('optional whole-load deadline', () => {
  it('leaves unconfigured loads unchanged', () => expect(createDocumentLoadScope()).toBeUndefined());
  it('bounds a stalled phase and rejects late activation', async () => {
    const scope = createDocumentLoadScope({ timeoutMs: 5 }, 'one')!;
    const failure = vi.fn();
    scope.onFailure(failure);
    await expect(scope.wait(new Promise(() => {}))).rejects.toMatchObject({
      code: 'DOCUMENT_LOAD_TIMEOUT',
      documentId: 'one',
    });
    expect(scope.signal.aborted).toBe(true);
    expect(scope.finish()).toBe(false);
    expect(() => scope.assertActive()).toThrow();
    expect(failure).toHaveBeenCalledTimes(1);
  });
  it('distinguishes cancellation and leaves another instance usable', async () => {
    const controller = new AbortController();
    const first = createDocumentLoadScope({ signal: controller.signal })!;
    const second = createDocumentLoadScope({ timeoutMs: 1000 })!;
    controller.abort();
    await expect(first.wait(Promise.resolve('late'))).rejects.toMatchObject({ code: 'DOCUMENT_LOAD_CANCELLED' });
    await expect(second.wait(Promise.resolve('ready'))).resolves.toBe('ready');
    expect(second.finish()).toBe(true);
  });
  it('retires timers and abort listeners at readiness', async () => {
    const controller = new AbortController();
    const scope = createDocumentLoadScope({ signal: controller.signal, timeoutMs: 5 })!;
    expect(scope.finish()).toBe(true);
    controller.abort();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(scope.signal.aborted).toBe(false);
    expect(() => scope.assertActive()).not.toThrow();
  });
});
