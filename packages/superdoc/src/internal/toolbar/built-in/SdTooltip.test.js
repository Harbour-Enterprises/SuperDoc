import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SdTooltip from './SdTooltip.vue';

let wrapper;

const mountTooltip = () =>
  mount(SdTooltip, {
    props: { delay: 0 },
    slots: {
      trigger: '<button type="button">Aa</button>',
      default: 'Font family',
    },
    attachTo: document.body,
  });

const showTooltip = async () => {
  await wrapper.get('.sd-tooltip-trigger').trigger('mouseenter');
  await nextTick();
  await nextTick();
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('SdTooltip auto-dismiss', () => {
  it('hides automatically after the delay even while the trigger stays hovered', async () => {
    wrapper = mountTooltip();

    await showTooltip();
    expect(document.body.querySelector('.sd-tooltip-content')?.textContent).toContain('Font family');

    vi.advanceTimersByTime(2400);
    await nextTick();
    expect(document.body.querySelector('.sd-tooltip-content')).not.toBeNull();

    vi.advanceTimersByTime(200);
    await nextTick();
    expect(document.body.querySelector('.sd-tooltip-content')).toBeNull();
  });
});

describe('SdTooltip activation', () => {
  it('dismisses when a trigger child stops click propagation', async () => {
    wrapper = mountTooltip();
    wrapper.get('button').element.addEventListener('click', (event) => event.stopPropagation());
    await showTooltip();

    await wrapper.get('button').trigger('click');
    await nextTick();

    expect(document.body.querySelector('.sd-tooltip-content')).toBeNull();
  });

  it('cancels a pending open when the trigger is activated before the hover delay', async () => {
    wrapper = mountTooltip();
    await wrapper.setProps({ delay: 100 });
    await wrapper.get('.sd-tooltip-trigger').trigger('mouseenter');
    await wrapper.get('button').trigger('click');

    vi.advanceTimersByTime(150);
    await nextTick();
    expect(document.body.querySelector('.sd-tooltip-content')).toBeNull();

    await wrapper.get('.sd-tooltip-trigger').trigger('mouseleave');
    await wrapper.get('.sd-tooltip-trigger').trigger('mouseenter');
    vi.advanceTimersByTime(150);
    await nextTick();
    expect(document.body.querySelector('.sd-tooltip-content')).not.toBeNull();
  });
});

describe('SdTooltip positioning', () => {
  const TOOLTIP_WIDTH = 120;
  const TOOLTIP_HEIGHT = 34.1875;
  const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const originalClientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');

  const makeRect = ({ top, left, width, height }) => ({
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  });

  const stubLayout = (triggerRect) => {
    const isTooltipContent = (element) => element.classList?.contains('sd-tooltip-content');
    const contentRect = makeRect({ top: 0, left: 0, width: TOOLTIP_WIDTH, height: TOOLTIP_HEIGHT });

    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () {
      return isTooltipContent(this) ? TOOLTIP_WIDTH : triggerRect.width;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
      return isTooltipContent(this) ? TOOLTIP_HEIGHT : triggerRect.height;
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return isTooltipContent(this) ? contentRect : triggerRect;
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (!isTooltipContent(element)) return {};
      return {
        boxSizing: 'content-box',
        width: '92px',
        height: '18.1875px',
        paddingLeft: '14px',
        paddingRight: '14px',
        paddingTop: '8px',
        paddingBottom: '8px',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
      };
    });
  };

  const openAt = async (triggerRect) => {
    stubLayout(triggerRect);
    wrapper = mountTooltip();
    await showTooltip();
    return document.body.querySelector('.sd-tooltip-content');
  };

  const renderedTop = (content) => parseFloat(content.style.top);

  afterEach(() => {
    if (originalInnerHeight) {
      Object.defineProperty(window, 'innerHeight', originalInnerHeight);
    } else {
      delete window.innerHeight;
    }
    if (originalClientHeight) {
      Object.defineProperty(document.documentElement, 'clientHeight', originalClientHeight);
    } else {
      delete document.documentElement.clientHeight;
    }
  });

  it('renders above the trigger when there is room', async () => {
    const triggerRect = makeRect({ top: 200, left: 300, width: 32, height: 32 });
    const content = await openAt(triggerRect);

    expect(content.dataset.placement).toBe('top');
    expect(renderedTop(content) + TOOLTIP_HEIGHT).toBeLessThanOrEqual(triggerRect.top);
  });

  it('renders below the trigger when it cannot fit above', async () => {
    const triggerRect = makeRect({ top: 0, left: 100, width: 32, height: 32 });
    const content = await openAt(triggerRect);

    expect(content.dataset.placement).toBe('bottom');
    expect(renderedTop(content)).toBeGreaterThanOrEqual(triggerRect.bottom);
  });

  it('keeps a visible top placement when the bottom placement would be clipped', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 120, configurable: true });
    const content = await openAt(makeRect({ top: 50, left: 100, width: 32, height: 32 }));

    expect(content.dataset.placement).toBe('top');
    expect(renderedTop(content)).toBeGreaterThanOrEqual(0);
    expect(renderedTop(content) + TOOLTIP_HEIGHT).toBeLessThanOrEqual(window.innerHeight);
  });

  it('keeps the tooltip inside the viewport when neither side has enough room', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 40, configurable: true });
    const content = await openAt(makeRect({ top: 4, left: 100, width: 32, height: 32 }));

    expect(renderedTop(content)).toBeGreaterThanOrEqual(0);
    expect(renderedTop(content) + TOOLTIP_HEIGHT).toBeLessThanOrEqual(window.innerHeight);
  });

  it('keeps the tooltip above a classic horizontal scrollbar', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 140, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 90, configurable: true });
    const content = await openAt(makeRect({ top: 30, left: 100, width: 32, height: 20 }));

    expect(renderedTop(content) + TOOLTIP_HEIGHT).toBeLessThanOrEqual(document.documentElement.clientHeight - 8);
  });
});
