import { undoDepth, redoDepth } from 'prosemirror-history';
import { h, ref } from 'vue';

import { scrollToElement } from './scroll-helpers';
import { sanitizeNumber } from './helpers';
import { useToolbarItem } from './use-toolbar-item';
import AIWriter from './AIWriter.vue';
import AlignmentButtons from './AlignmentButtons.vue';
import LinkInput from './LinkInput.vue';
import DocumentMode from './DocumentMode.vue';
import LinkedStyle from './LinkedStyle.vue';
import { renderColorOptions } from './color-dropdown-helpers.js';
import TableGrid from './TableGrid.vue';
import TableActions from './TableActions.vue';

import checkIconSvg from '@harbour-enterprises/common/icons/check.svg?raw';
import SearchInput from './SearchInput.vue';
import { TOOLBAR_FONTS } from './constants.js';

const closeDropdown = (dropdown) => {
  dropdown.expand.value = false;
};

export const makeDefaultItems = ({
  superToolbar,
  toolbarIcons,
  toolbarFonts,
  hideButtons,
  availableWidth,
  role,
  isDev = false,
} = {}) => {
  // bold
  const bold = useToolbarItem({
    type: 'button',
    name: 'bold',
    command: 'toggleBold',
    icon: toolbarIcons.bold,
    tooltip: 'Bold',
  });

  // font
  const fontButton = useToolbarItem({
    type: 'dropdown',
    name: 'fontFamily',
    tooltip: 'Font',
    command: 'setFontFamily',
    defaultLabel: 'Arial',
    label: 'Arial',
    markName: 'textStyle',
    labelAttr: 'fontFamily',
    hasCaret: true,
    isWide: true,
    style: { width: '116px' },
    suppressActiveHighlight: true,
    options: [...(toolbarFonts ? toolbarFonts : TOOLBAR_FONTS)],
    onActivate: ({ fontFamily }) => {
      if (!fontFamily) return;
      fontButton.label.value = fontFamily;
    },
    onDeactivate: () => (fontButton.label.value = fontButton.defaultLabel.value),
  });

  // ai button
  const aiButton = useToolbarItem({
    type: 'dropdown',
    dropdownStyles: {
      padding: 0,
      outline: 'none',
    },
    name: 'ai',
    tooltip: 'AI text generation',
    icon: toolbarIcons.ai,
    hideLabel: true,
    hasCaret: false,
    isWide: true,
    suppressActiveHighlight: true,
    options: [
      {
        type: 'render',
        key: 'ai',
        render: () => {
          let selectedText = '';

          if (superToolbar.activeEditor) {
            const { state } = superToolbar.activeEditor;
            const { from, to, empty } = state.selection;
            selectedText = !empty ? state.doc.textBetween(from, to) : '';
          }

          const handleClose = () => {
            closeDropdown(aiButton);
          };

          return h('div', {}, [
            h(AIWriter, {
              handleClose,
              selectedText,
              editor: superToolbar.activeEditor,
              apiKey: superToolbar.config.aiApiKey,
              endpoint: superToolbar.config.aiEndpoint,
              superToolbar: superToolbar,
            }),
          ]);
        },
      },
    ],
  });

  // font size
  const fontSize = useToolbarItem({
    type: 'dropdown',
    name: 'fontSize',
    defaultLabel: '12',
    label: '12',
    minWidth: '50px',
    markName: 'textStyle',
    labelAttr: 'fontSize',
    tooltip: 'Font size',
    hasCaret: true,
    hasInlineTextInput: false,
    inlineTextInputVisible: true,
    suppressActiveHighlight: true,
    isWide: true,
    command: 'setFontSize',
    options: [
      { label: '8', key: '8pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '9', key: '9pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '10', key: '10pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '11', key: '11pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '12', key: '12pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '14', key: '14pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '18', key: '18pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '24', key: '24pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '30', key: '30pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '36', key: '36pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '48', key: '48pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '60', key: '60pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '72', key: '72pt', props: { 'data-item': 'btn-fontSize-option' } },
      { label: '96', key: '96pt', props: { 'data-item': 'btn-fontSize-option' } },
    ],
    onActivate: ({ fontSize: size }) => {
      if (!size) return (fontSize.label.value = fontSize.defaultLabel.value);

      let sanitizedValue = sanitizeNumber(size, 12);
      if (sanitizedValue < 8) sanitizedValue = 8;
      if (sanitizedValue > 96) sanitizedValue = 96;

      // no units
      fontSize.label.value = String(sanitizedValue);
    },
    onDeactivate: () => (fontSize.label.value = fontSize.defaultLabel.value),
  });

  // separator
  const separator = useToolbarItem({
    type: 'separator',
    name: 'separator',
    isNarrow: true,
  });

  // italic
  const italic = useToolbarItem({
    type: 'button',
    name: 'italic',
    command: 'toggleItalic',
    icon: toolbarIcons.italic,
    active: false,
    tooltip: 'Italic',
  });

  // underline
  const underline = useToolbarItem({
    type: 'button',
    name: 'underline',
    command: 'toggleUnderline',
    icon: toolbarIcons.underline,
    active: false,
    tooltip: 'Underline',
  });

  // highlight
  const highlight = useToolbarItem({
    type: 'dropdown',
    name: 'highlight',
    icon: toolbarIcons.highlight,
    hideLabel: true,
    markName: 'highlight',
    labelAttr: 'color',
    active: false,
    tooltip: 'Highlight color',
    command: 'setHighlight',
    noArgumentCommand: 'unsetHighlight',
    suppressActiveHighlight: true,
    options: [
      {
        key: 'color',
        type: 'render',
        render: () => renderColorOptions(superToolbar, highlight, [], true),
      },
    ],
    onActivate: ({ color }) => {
      highlight.iconColor.value = color || '';
    },
    onDeactivate: () => (highlight.iconColor.value = ''),
  });

  // color
  const colorButton = useToolbarItem({
    type: 'dropdown',
    name: 'color',
    icon: toolbarIcons.color,
    hideLabel: true,
    markName: 'textStyle',
    labelAttr: 'color',
    active: false,
    tooltip: 'Text color',
    command: 'setColor',
    suppressActiveHighlight: true,
    options: [
      {
        key: 'color',
        type: 'render',
        render: () => renderColorOptions(superToolbar, colorButton),
      },
    ],
    onActivate: ({ color }) => {
      colorButton.iconColor.value = color;
    },
    onDeactivate: () => (colorButton.iconColor.value = '#000'),
  });

  // search
  const searchRef = ref(null);
  const search = useToolbarItem({
    type: 'dropdown',
    name: 'search',
    active: false,
    icon: toolbarIcons.search,
    tooltip: 'Search',
    group: 'right',
    inputRef: searchRef,
    options: [
      {
        type: 'render',
        key: 'searchDropdown',
        render: () => renderSearchDropdown(),
      },
    ],
  });

  const renderSearchDropdown = () => {
    const handleSubmit = ({ value }) => {
      superToolbar.activeEditor.commands.search(value);
    };

    return h('div', {}, [
      h(SearchInput, {
        onSubmit: handleSubmit,
        searchRef,
      }),
    ]);
  };

  // link
  const link = useToolbarItem({
    type: 'dropdown',
    name: 'link',
    markName: 'link',
    icon: toolbarIcons.link,
    active: false,
    tooltip: 'Link',
    options: [
      {
        type: 'render',
        key: 'linkDropdown',
        render: () => renderLinkDropdown(link),
      },
    ],
    onActivate: ({ href }) => {
      if (href) link.attributes.value = { href };
      else link.attributes.value = {};
      link.expand.value = true;
    },
    onDeactivate: () => {
      link.attributes.value = {};
      link.expand.value = false;
    },
  });

  function renderLinkDropdown(link) {
    const handleSubmit = ({ href }) => {
      closeDropdown(link);
      link.attributes.value.link = { href };
      const itemWithCommand = { ...link, command: 'toggleLink' };
      superToolbar.emitCommand({ item: itemWithCommand, argument: { href, text: '' } });
      if (!href) link.active.value = false;
    };

    return h('div', {}, [
      h(LinkInput, {
        onSubmit: handleSubmit,
        href: link.attributes.value.href,
        goToAnchor: () => {
          closeDropdown(link);
          if (!superToolbar.activeEditor || !link.attributes.value?.href) return;
          const anchorName = link.attributes.value?.href?.slice(1);
          const container = superToolbar.activeEditor.element;
          const anchor = container.querySelector(`a[name='${anchorName}']`);
          if (anchor) scrollToElement(anchor);
        },
      }),
    ]);
  }

  const linkInput = useToolbarItem({
    type: 'options',
    name: 'linkInput',
    command: 'toggleLink',
    active: false,
  });
  link.childItem = linkInput;
  linkInput.parentItem = link;

  // image
  const image = useToolbarItem({
    type: 'button',
    name: 'image',
    command: 'startImageUpload',
    icon: toolbarIcons.image,
    active: false,
    tooltip: 'Image',
    disabled: false,
  });

  // table
  const tableItem = useToolbarItem({
    type: 'dropdown',
    name: 'table',
    icon: toolbarIcons.table,
    hideLabel: true,
    labelAttr: 'table',
    active: false,
    tooltip: 'Insert table',
    command: 'insertTable',
    suppressActiveHighlight: true,
    options: [
      {
        key: 'table',
        type: 'render',
        render: () => renderTableGrid(tableItem),
      },
    ],
  });

  function renderTableGrid(tableItem) {
    const handleSelect = (e) => {
      superToolbar.emitCommand({ item: tableItem, argument: e });
      closeDropdown(tableItem);
    };

    return h('div', {}, [
      h(TableGrid, {
        onSelect: handleSelect,
      }),
    ]);
  }

  // table actions
  const tableActionsItem = useToolbarItem({
    type: 'dropdown',
    name: 'tableActions',
    command: 'executeTableCommand',
    icon: toolbarIcons.tableActions,
    hideLabel: true,
    disabled: true,
    options: [
      {
        type: 'render',
        render: () => renderTableActions(tableActionsItem),
      },
    ],
  });

  const tableActionsOptions = [
    {
      label: 'Insert row above',
      command: 'addRowBefore',
      icon: toolbarIcons.addRowBefore,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Insert row below',
      command: 'addRowAfter',
      icon: toolbarIcons.addRowAfter,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Insert column left',
      command: 'addColumnBefore',
      icon: toolbarIcons.addColumnBefore,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Insert column right',
      command: 'addColumnAfter',
      icon: toolbarIcons.addColumnAfter,
      bottomBorder: true,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Delete row',
      command: 'deleteRow',
      icon: toolbarIcons.deleteRow,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Delete column',
      command: 'deleteColumn',
      icon: toolbarIcons.deleteColumn,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Delete table',
      command: 'deleteTable',
      icon: toolbarIcons.deleteTable,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Transparent borders',
      command: 'deleteCellAndTableBorders',
      icon: toolbarIcons.deleteBorders,
      bottomBorder: true,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Merge cells',
      command: 'mergeCells',
      icon: toolbarIcons.mergeCells,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Split cell',
      command: 'splitCell',
      icon: toolbarIcons.splitCell,
      props: { 'data-item': 'btn-tableActions-option' },
    },
    {
      label: 'Fix tables',
      command: 'fixTables',
      icon: toolbarIcons.fixTables,
      props: { 'data-item': 'btn-tableActions-option' },
    },
  ];

  function renderTableActions(tableActionsItem) {
    return h(TableActions, {
      options: tableActionsOptions,
      onSelect: (event) => {
        closeDropdown(tableActionsItem);
        const { command } = event;
        superToolbar.emitCommand({ item: tableActionsItem, argument: { command } });
      },
    });
  }

  // alignment
  const alignment = useToolbarItem({
    type: 'dropdown',
    name: 'textAlign',
    tooltip: 'Alignment',
    icon: toolbarIcons.alignLeft,
    command: 'setTextAlign',
    hasCaret: true,
    markName: 'textAlign',
    labelAttr: 'textAlign',
    suppressActiveHighlight: true,
    options: [
      {
        type: 'render',
        render: () => {
          const handleSelect = (e) => {
            closeDropdown(alignment);
            const buttonWithCommand = { ...alignment, command: 'setTextAlign' };
            buttonWithCommand.command = 'setTextAlign';
            superToolbar.emitCommand({ item: buttonWithCommand, argument: e });
            setAlignmentIcon(alignment, e);
          };

          return h('div', {}, [
            h(AlignmentButtons, {
              onSelect: handleSelect,
            }),
          ]);
        },
        key: 'alignment',
      },
    ],
    onActivate: ({ textAlign }) => {
      setAlignmentIcon(alignment, textAlign);
    },
    onDeactivate: () => {
      setAlignmentIcon(alignment, 'left');
    },
  });

  const setAlignmentIcon = (alignment, e) => {
    let alignValue = e === 'both' ? 'justify' : e;
    let icons = {
      left: toolbarIcons.alignLeft,
      right: toolbarIcons.alignRight,
      center: toolbarIcons.alignCenter,
      justify: toolbarIcons.alignJustify,
    };

    let icon = icons[alignValue] ?? icons.left;
    alignment.icon.value = icon;
  };

  // bullet list
  const bulletedList = useToolbarItem({
    type: 'button',
    name: 'list',
    command: 'toggleBulletList',
    icon: toolbarIcons.bulletList,
    active: false,
    tooltip: 'Bullet list',
  });

  // number list
  const numberedList = useToolbarItem({
    type: 'button',
    name: 'numberedlist',
    command: 'toggleOrderedList',
    icon: toolbarIcons.numberedList,
    active: false,
    tooltip: 'Numbered list',
  });

  // indent left
  const indentLeft = useToolbarItem({
    type: 'button',
    name: 'indentleft',
    command: 'decreaseTextIndent',
    icon: toolbarIcons.indentLeft,
    active: false,
    tooltip: 'Left indent',
    disabled: false,
  });

  // indent right
  const indentRight = useToolbarItem({
    type: 'button',
    name: 'indentright',
    command: 'increaseTextIndent',
    icon: toolbarIcons.indentRight,
    active: false,
    tooltip: 'Right indent',
    disabled: false,
  });

  // overflow
  const overflow = useToolbarItem({
    type: 'overflow',
    name: 'overflow',
    command: 'toggleOverflow',
    icon: toolbarIcons.overflow,
    active: false,
    disabled: false,
  });

  // const overflowOptions = useToolbarItem({
  //   type: 'options',
  //   name: 'overflowOptions',
  //   preCommand(self, argument) {
  //     self.parentItem.active = false;
  //   },
  // });

  // zoom
  const zoom = useToolbarItem({
    type: 'dropdown',
    name: 'zoom',
    allowWithoutEditor: true,
    tooltip: 'Zoom',
    defaultLabel: '100%',
    label: '100%',
    hasCaret: true,
    command: 'setZoom',
    isWide: true,
    inlineTextInputVisible: false,
    hasInlineTextInput: true,
    options: [
      { label: '50%', key: 0.5, props: { 'data-item': 'btn-zoom-option' } },
      { label: '75%', key: 0.75, props: { 'data-item': 'btn-zoom-option' } },
      { label: '90%', key: 0.9, props: { 'data-item': 'btn-zoom-option' } },
      { label: '100%', key: 1, props: { 'data-item': 'btn-zoom-option' } },
      { label: '125%', key: 1.25, props: { 'data-item': 'btn-zoom-option' } },
      { label: '150%', key: 1.5, props: { 'data-item': 'btn-zoom-option' } },
      { label: '200%', key: 2, props: { 'data-item': 'btn-zoom-option' } },
    ],
    onActivate: ({ zoom: value }) => {
      if (!value) return;

      zoom.label.value = value;
    },
  });

  // undo
  const undo = useToolbarItem({
    type: 'button',
    name: 'undo',
    disabled: true,
    tooltip: 'Undo',
    command: 'undo',
    icon: toolbarIcons.undo,
    group: 'left',
    onDeactivate: () => {
      undo.disabled.value = !superToolbar.undoDepth;
    },
  });

  // redo
  const redo = useToolbarItem({
    type: 'button',
    disabled: true,
    name: 'redo',
    tooltip: 'Redo',
    command: 'redo',
    icon: toolbarIcons.redo,
    group: 'left',
    onDeactivate: () => {
      redo.disabled.value = !superToolbar.redoDepth;
    },
  });

  // Track changes test buttons
  const toggleTrackChanges = useToolbarItem({
    type: 'button',
    disabled: false,
    name: 'toggleTrackChanges',
    tooltip: 'Track Changes',
    command: 'toggleTrackChanges',
    icon: toolbarIcons.trackChanges,
    group: 'left',
  });

  const acceptTrackedChangeBySelection = useToolbarItem({
    type: 'button',
    disabled: false,
    name: 'acceptTrackedChangeBySelection',
    tooltip: 'Accept changes under selection',
    command: 'acceptTrackedChangeBySelection',
    icon: toolbarIcons.trackChangesAccept,
    group: 'left',
  });

  const rejectTrackedChangeOnSelection = useToolbarItem({
    type: 'button',
    disabled: false,
    name: 'rejectTrackedChangeOnSelection',
    tooltip: 'Reject changes under selection',
    command: 'rejectTrackedChangeOnSelection',
    icon: toolbarIcons.trackChangesReject,
    group: 'left',
  });

  const toggleTrackChangesOriginal = useToolbarItem({
    type: 'button',
    disabled: false,
    name: 'toggleTrackChangesShowOriginal',
    tooltip: 'Toggle Show Original',
    command: 'toggleTrackChangesShowOriginal',
    icon: toolbarIcons.trackChangesOriginal,
    group: 'left',
  });

  const toggleTrackChangesFinal = useToolbarItem({
    type: 'button',
    disabled: false,
    name: 'toggleTrackChangesShowFinal',
    tooltip: 'Toggle Show Final',
    command: 'toggleTrackChangesShowFinal',
    icon: toolbarIcons.trackChangesFinal,
    group: 'left',
  });

  const clearFormatting = useToolbarItem({
    type: 'button',
    name: 'clearFormatting',
    command: 'clearFormat',
    tooltip: 'Clear formatting',
    icon: toolbarIcons.clearFormatting,
  });

  const toolbarItemsMobile = [bold, italic, underline, indentRight, indentLeft, search, overflow].map(
    (item) => item.name,
  );

  const copyFormat = useToolbarItem({
    type: 'button',
    name: 'copyFormat',
    tooltip: 'Format painter',
    icon: toolbarIcons.copyFormat,
    command: 'copyFormat',
    active: false,
  });

  const getDocumentOptionsAfterRole = (role, documentOptions) => {
    if (role === 'editor') return documentOptions;
    else if (role === 'suggester') return documentOptions.filter((option) => option.value === 'suggesting');
    else return documentOptions.filter((option) => option.value === 'viewing');
  };

  const getDefaultLabel = (role) => {
    if (role === 'editor') return 'Editing';
    else if (role === 'suggester') return 'Suggesting';
    else return 'Viewing';
  };

  const documentMode = useToolbarItem({
    type: 'dropdown',
    name: 'documentMode',
    command: 'setDocumentMode',
    allowWithoutEditor: true,
    icon: toolbarIcons.documentMode,
    defaultLabel: getDefaultLabel(role),
    label: getDefaultLabel(role),
    hasCaret: role === 'editor',
    isWide: true,
    style: { display: 'flex', justifyContent: 'flex-end' },
    inlineTextInputVisible: false,
    hasInlineTextInput: false,
    group: 'right',
    disabled: role !== 'editor',
    attributes: {
      dropdownPosition: 'right',
      className: 'toolbar-item--doc-mode',
    },
    options: [
      {
        type: 'render',
        render: () => renderDocumentMode(documentMode),
      },
    ],
  });

  const documentOptions = [
    {
      label: 'Editing',
      value: 'editing',
      icon: toolbarIcons.documentEditingMode,
      description: 'Edit document directly',
    },
    {
      label: 'Suggesting',
      value: 'suggesting',
      icon: toolbarIcons.documentSuggestingMode,
      description: 'Edits become suggestions',
    },
    {
      label: 'Viewing',
      value: 'viewing',
      icon: toolbarIcons.documentViewingMode,
      description: 'View clean version of document only',
    },
  ];

  function renderDocumentMode(renderDocumentButton) {
    const optionsAfterRole = getDocumentOptionsAfterRole(role, documentOptions);
    return h(DocumentMode, {
      options: optionsAfterRole,
      onSelect: (item) => {
        closeDropdown(renderDocumentButton);
        const { label, icon } = item;
        documentMode.label.value = label;
        documentMode.icon.value = icon;
        superToolbar.emitCommand({ item: documentMode, argument: label });
      },
    });
  }

  const pageBreakTool = useToolbarItem({
    type: 'button',
    name: 'pageBreakTool',
    command: 'insertPageBreak',
    icon: toolbarIcons.pageBreak,
    active: false,
    tooltip: 'Insert page break',
  });

  // define sizes to calculate toolbar overflow items
  const controlSizes = new Map([
    ['separator', 20],
    ['zoom', 71],
    ['fontFamily', 118],
    ['fontSize', 57],
    ['textAlign', 40],
    ['linkedStyles', 142],
    ['documentMode', 47],
    ['ai', 32],
    ['default', 32],
  ]);

  const ruler = useToolbarItem({
    type: 'button',
    name: 'ruler',
    command: 'toggleRuler',
    icon: toolbarIcons.ruler,
    active: false,
    tooltip: 'Show or hide ruler',
  });

  const linkedStyles = useToolbarItem({
    type: 'dropdown',
    name: 'linkedStyles',
    command: 'setLinkedStyle',
    icon: toolbarIcons.paintbrush,
    defaultLabel: 'Format text',
    label: 'Format text',
    hasCaret: true,
    isWide: true,
    style: { width: '140px' },
    suppressActiveHighlight: true,
    disabled: false,
    attributes: {
      className: 'toolbar-item--linked-styles',
    },
    options: [
      {
        type: 'render',
        key: 'linkedStyle',
        render: () => {
          const handleSelect = (style) => {
            closeDropdown(linkedStyles);
            const itemWithCommand = { ...linkedStyles, command: 'setLinkedStyle' };
            superToolbar.emitCommand({ item: itemWithCommand, argument: style });
          };

          return h('div', {}, [
            h(LinkedStyle, {
              editor: superToolbar.activeEditor,
              onSelect: handleSelect,
            }),
          ]);
        },
      },
    ],
    onActivate: () => {
      linkedStyles.disabled.value = false;
    },
    onDeactivate: () => {
      linkedStyles.disabled.value = true;
    },
  });

  const renderIcon = (value, selectedValue) => {
    if (selectedValue.value.toString() !== value) return;
    return h('div', { innerHTML: checkIconSvg, class: 'dropdown-select-icon' });
  };

  // line height
  const lineHeight = useToolbarItem({
    type: 'dropdown',
    name: 'lineHeight',
    tooltip: 'Line height',
    icon: toolbarIcons.lineHeight,
    hasCaret: false,
    hasInlineTextInput: false,
    inlineTextInputVisible: false,
    suppressActiveHighlight: true,
    isWide: false,
    command: 'setLineHeight',
    dropdownValueKey: 'key',
    selectedValue: '1',
    options: [
      {
        label: '1,0',
        key: '1',
        icon: () => renderIcon('1', lineHeight.selectedValue),
        props: { 'data-item': 'btn-lineHeight-option' },
      },
      {
        label: '1,15',
        key: '1.15',
        icon: () => renderIcon('1.15', lineHeight.selectedValue),
        props: { 'data-item': 'btn-lineHeight-option' },
      },
      {
        label: '1,5',
        key: '1.5',
        icon: () => renderIcon('1.5', lineHeight.selectedValue),
        props: { 'data-item': 'btn-lineHeight-option' },
      },
      {
        label: '2,0',
        key: '2',
        icon: () => renderIcon('2', lineHeight.selectedValue),
        props: { 'data-item': 'btn-lineHeight-option' },
      },
      {
        label: '2,5',
        key: '2.5',
        icon: () => renderIcon('2.5', lineHeight.selectedValue),
        props: { 'data-item': 'btn-lineHeight-option' },
      },
      {
        label: '3,0',
        key: '3',
        icon: () => renderIcon('3', lineHeight.selectedValue),
        props: { 'data-item': 'btn-lineHeight-option' },
      },
    ],
  });

  // Responsive toolbar calculations
  const breakpoints = {
    sm: 768,
    md: 1024,
    lg: 1280,
    xl: 1410,
  };
  const stickyItemsWidth = 120;
  const toolbarPadding = 32;

  const itemsToHideXL = ['linkedStyles', 'clearFormatting', 'copyFormat', 'ruler'];
  const itemsToHideSM = ['zoom', 'fontFamily', 'fontSize', 'redo'];

  let toolbarItems = [
    undo,
    redo,

    // Dev - tracked changes
    // toggleTrackChanges,
    acceptTrackedChangeBySelection,
    rejectTrackedChangeOnSelection,
    // toggleTrackChangesOriginal,
    // toggleTrackChangesFinal,

    zoom,
    fontButton,
    separator,
    fontSize,
    separator,
    bold,
    italic,
    underline,
    colorButton,
    highlight,
    separator,
    link,
    image,
    tableItem,
    tableActionsItem,
    separator,
    alignment,
    bulletedList,
    numberedList,
    indentLeft,
    indentRight,
    lineHeight,
    separator,
    linkedStyles,
    separator,
    ruler,
    pageBreakTool,
    copyFormat,
    clearFormatting,
    aiButton,
    overflow,
    documentMode,
  ];

  if (!superToolbar.config?.superdoc?.config?.modules?.ai) {
    toolbarItems = toolbarItems.filter((item) => item.name.value !== 'ai');
  }

  // Hide separators on small screens
  if (availableWidth <= breakpoints.md && hideButtons) {
    toolbarItems = toolbarItems.filter((item) => item.type !== 'separator');
  }

  // If no pagination, remove the page break tool
  if (!superToolbar.config.pagination) {
    toolbarItems = toolbarItems.filter((item) => item.name.value !== 'pageBreakTool');
  }

  // Remove docx only items
  if (superToolbar.config.mode !== 'docx') {
    const getLinkedStylesIndex = toolbarItems.findIndex((item) => item.name.value === 'linkedStyles');
    toolbarItems.splice(getLinkedStylesIndex - 1, 2);

    const filterItems = ['ruler', 'zoom', 'undo', 'redo'];
    toolbarItems = toolbarItems.filter((item) => !filterItems.includes(item.name.value));
  }

  // Track changes test buttons
  const devItems = [toggleTrackChanges, toggleTrackChangesOriginal, toggleTrackChangesFinal];
  if (!isDev) {
    if (role === 'viewer') {
      devItems.push(...[acceptTrackedChangeBySelection, rejectTrackedChangeOnSelection]);
    }
    toolbarItems = toolbarItems.filter((item) => !devItems.includes(item));
  }

  // always visible items
  const toolbarItemsSticky = [search, undo, overflow, documentMode].map((item) => item.name);
  const isStickyItem = (item) => toolbarItemsSticky.includes(item.name);

  const overflowItems = [];
  const visibleItems = [];

  // initial width with padding
  let totalWidth = toolbarPadding + stickyItemsWidth;

  toolbarItems.forEach((item) => {
    const itemWidth = controlSizes.get(item.name.value) || controlSizes.get('default');

    if (availableWidth < breakpoints.xl && itemsToHideXL.includes(item.name.value) && hideButtons) {
      overflowItems.push(item);
      if (item.name.value === 'linkedStyles') {
        const linkedStylesIdx = toolbarItems.findIndex((item) => item.name.value === 'linkedStyles');
        toolbarItems.splice(linkedStylesIdx + 1, 1);
      }
      return;
    }

    if (availableWidth < breakpoints.sm && itemsToHideSM.includes(item.name.value) && hideButtons) {
      overflowItems.push(item);
      return;
    }

    if (isStickyItem(item)) {
      visibleItems.push(item);
      totalWidth += itemWidth;
      return;
    }

    if (totalWidth < availableWidth || !hideButtons) {
      visibleItems.push(item);
      totalWidth += itemWidth;
    } else {
      overflowItems.push(item);
    }
  });

  return {
    defaultItems: visibleItems,
    overflowItems: overflowItems.filter((item) => item.type !== 'separator'),
  };
};

export const setHistoryButtonStateOnUpdate =
  (toolbarItemsRef) =>
  ({ editor, transaction }) => {
    // console.debug('[SuperEditor dev] Document updated', editor);
    // activeEditor = editor;

    const undo = toolbarItemsRef.value.find((item) => item.name === 'undo');
    const redo = toolbarItemsRef.value.find((item) => item.name === 'redo');

    undo.disabled = undoDepth(editor.state) <= 0;
    redo.disabled = redoDepth(editor.state) <= 0;
  };
