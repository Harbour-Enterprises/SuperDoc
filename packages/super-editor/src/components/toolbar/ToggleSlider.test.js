import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ToggleSlider from './ToggleSlider.vue';

const baseProps = {
  item: { id: 'toggle-item' },
  name: 'toggleItem',
  command: 'toggleCommand',
};

describe('ToggleSlider', () => {
  it('renders inactive slider by default', () => {
    const wrapper = mount(ToggleSlider, {
      props: { ...baseProps, active: false },
    });

    const slider = wrapper.get('.toggle-slider');
    expect(slider.classes()).not.toContain('on');
  });

  it('applies active class when toggled on', async () => {
    const wrapper = mount(ToggleSlider, {
      props: { ...baseProps, active: true },
    });

    const slider = wrapper.get('.toggle-slider');
    expect(slider.classes()).toContain('on');
  });
});
