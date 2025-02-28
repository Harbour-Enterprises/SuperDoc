import { h } from 'vue';
import IconGrid from './IconGrid.vue';
import { toolbarIcons } from './toolbarIcons.js';

const closeDropdown = (dropdown) => {
  dropdown.expand.value = false;
};


export const makeColorOption = (color, label = null) => {
  return {
    label,
    icon: toolbarIcons.colorOption,
    value: color,
    style: {
      color,
      boxShadow: '0 0 5px 1px rgba(0, 0, 0, 0.1)',
      borderRadius: '50%',
    },
  };
};

export const renderColorOptions = (superToolbar, button, customIcons = []) => {
  const handleSelect = (e) => {
    button.iconColor.value = e;
    superToolbar.emitCommand({ item: button, argument: e });
    closeDropdown(button);
  };

  return h('div', {}, [
    h(IconGrid, {
      icons,
      customIcons,
      activeColor: button.iconColor,
      onSelect: handleSelect,
    }),
  ]);
}

const icons = [
  [
    makeColorOption('#111111'),
    makeColorOption('#333333'),
    makeColorOption('#5C5C5C'),
    makeColorOption('#858585'),
    makeColorOption('#ADADAD'),
    makeColorOption('#D6D6D6'),
    makeColorOption('#FFFFFF'),
  ],

  [
    makeColorOption('#860028'),
    makeColorOption('#D2003F'),
    makeColorOption('#DB3365'),
    makeColorOption('#E4668C'),
    makeColorOption('#ED99B2'),
    makeColorOption('#F6CCD9'),
    makeColorOption('#FF004D'),
  ],

  [
    makeColorOption('#83015E'),
    makeColorOption('#CD0194'),
    makeColorOption('#D734A9'),
    makeColorOption('#E167BF'),
    makeColorOption('#EB99D4'),
    makeColorOption('#F5CCEA'),
    makeColorOption('#FF00A8'),
  ],

  [
    makeColorOption('#8E220A'),
    makeColorOption('#DD340F'),
    makeColorOption('#E45C3F'),
    makeColorOption('#EB856F'),
    makeColorOption('#F1AE9F'),
    makeColorOption('#F8D6CF'),
    makeColorOption('#FF7A00'),
  ],

  [
    makeColorOption('#947D02'),
    makeColorOption('#E7C302'),
    makeColorOption('#ECCF35'),
    makeColorOption('#F1DB67'),
    makeColorOption('#F5E79A'),
    makeColorOption('#FAF3CC'),
    makeColorOption('#FAFF09'),
  ],

  [
    makeColorOption('#055432'),
    makeColorOption('#07834F'),
    makeColorOption('#399C72'),
    makeColorOption('#6AB595'),
    makeColorOption('#9CCDB9'),
    makeColorOption('#CDE6DC'),
    makeColorOption('#05F38F'),
  ],

  [
    makeColorOption('#063E7E'),
    makeColorOption('#0A60C5'),
    makeColorOption('#3B80D1'),
    makeColorOption('#6CA0DC'),
    makeColorOption('#9DBFE8'),
    makeColorOption('#CEDFF3'),
    makeColorOption('#00E0FF'),
  ],

  [
    makeColorOption('#3E027A'),
    makeColorOption('#6103BF'),
    makeColorOption('#8136CC'),
    makeColorOption('#A068D9'),
    makeColorOption('#C09AE6'),
    makeColorOption('#DFCDF2'),
    makeColorOption('#A91DFF'),
  ],
];

export const getAvailableColorOptions = () => {
  return icons.flat().map((item) => item.value);
}
