import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import vClickOutside from './v-click-outside';

describe('v-click-outside directive', () => {
  let originalDocument: Document | undefined;
  let addEventListenerMock: any;
  let removeEventListenerMock: any;

  beforeEach(() => {
    originalDocument = globalThis.document;
    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();

    (globalThis as any).document = {
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalDocument === undefined) {
      delete (globalThis as any).document;
    } else {
      (globalThis as any).document = originalDocument;
    }
  });

  it('invokes binding when clicks originate outside the element and unregisters on unmount', () => {
    const containsMock = vi.fn().mockReturnValue(false);
    const binding = { value: vi.fn() };
    const el: any = { contains: containsMock };

    vClickOutside.mounted(el, binding as any);

    expect(addEventListenerMock).toHaveBeenCalledWith('click', expect.any(Function));
    expect(typeof el.__clickOutsideHandler).toBe('function');

    const handler = addEventListenerMock.mock.calls[0][1];

    // Trigger an outside click
    const outsideEvent = { target: {} };
    handler(outsideEvent);
    expect(binding.value).toHaveBeenCalledWith(outsideEvent);

    // Trigger an inside click
    binding.value.mockClear();
    containsMock.mockReturnValue(true);
    handler({ target: {} });
    expect(binding.value).not.toHaveBeenCalled();

    vClickOutside.unmounted(el);
    expect(removeEventListenerMock).toHaveBeenCalledWith('click', handler);
    expect(el.__clickOutsideHandler).toBeUndefined();
  });
});
