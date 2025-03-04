import { undoDepth, redoDepth } from 'prosemirror-history';
import { h } from 'vue';

import { scrollToElement } from './scroll-helpers';
import { sanitizeNumber } from './helpers';
import { useToolbarItem } from './use-toolbar-item';
import AlignmentButtons from './AlignmentButtons.vue';
import LinkInput from './LinkInput.vue';
import DocumentMode from './DocumentMode.vue';
import LinkedStyle from './LinkedStyle.vue';
import { renderColorOptions } from './color-dropdown-helpers.js';
import TableGrid from './TableGrid.vue';
import TableActions from './TableActions.vue';

const closeDropdown = (dropdown) => {
  dropdown.expand.value = false;
};

export const makeDefaultItems = (superToolbar, isDev = false, windowWidth, role, toolbarIcons) => {

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
    style: { width: '150px' },
    suppressActiveHighlight: true,
    options: [
      {
        label: 'Georgia',
        key: 'Georgia, serif',
        fontWeight: 400,
        props: {
          style: { fontFamily: 'Georgia, serif' },
        },
      },
      {
        label: 'Arial',
        key: 'Arial, sans-serif',
        fontWeight: 400,
        props: {
          style: { fontFamily: 'Arial, sans-serif' },
        },
      },
      {
        label: 'Courier New',
        key: 'Courier New, monospace',
        fontWeight: 400,
        props: {
          style: { fontFamily: 'Courier New, monospace' },
        },
      },
      {
        label: 'Times New Roman',
        key: 'Times New Roman, serif',
        fontWeight: 400,
        props: {
          style: { fontFamily: 'Times New Roman, serif' },
        },
      },
    ],
    onActivate: ({ fontFamily }) => {
      if (!fontFamily) return;
      fontButton.label.value = fontFamily;
    },
    onDeactivate: () => (fontButton.label.value = fontButton.defaultLabel.value),
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
      { label: '8', key: '8pt' },
      { label: '9', key: '9pt' },
      { label: '10', key: '10pt' },
      { label: '11', key: '11pt' },
      { label: '12', key: '12pt' },
      { label: '14', key: '14pt' },
      { label: '18', key: '18pt' },
      { label: '24', key: '24pt' },
      { label: '30', key: '30pt' },
      { label: '36', key: '36pt' },
      { label: '48', key: '48pt' },
      { label: '60', key: '60pt' },
      { label: '72', key: '72pt' },
      { label: '96', key: '96pt' },
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
    suppressActiveHighlight: true,
    options: [
      {
        key: 'color',
        type: 'render',
        render: () => renderColorOptions(superToolbar, highlight),
      },
    ],
    onActivate: ({ color }) => {
      highlight.iconColor.value = color || '';
    },
    onDeactivate: () => (highlight.iconColor.value = ''),
  })

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
    },
    { 
      label: 'Insert row below',
      command: 'addRowAfter',
      icon: toolbarIcons.addRowAfter,
    },
    { 
      label: 'Insert column left',
      command: 'addColumnBefore',
      icon: toolbarIcons.addColumnBefore,
    },
    { 
      label: 'Insert column right',
      command: 'addColumnAfter',
      icon: toolbarIcons.addColumnAfter,
      bottomBorder: true,
    },
    { 
      label: 'Delete row',
      command: 'deleteRow',
      icon: toolbarIcons.deleteRow,
    },
    { 
      label: 'Delete column',
      command: 'deleteColumn',
      icon: toolbarIcons.deleteColumn,
    },
    { 
      label: 'Delete table',
      command: 'deleteTable',
      icon: toolbarIcons.deleteTable,
    },
    { 
      label: 'Delete borders',
      command: 'deleteCellAndTableBorders',
      icon: toolbarIcons.deleteBorders,
      bottomBorder: true,
    },
    { 
      label: 'Merge cells',
      command: 'mergeCells',
      icon: toolbarIcons.mergeCells,
    },
    { 
      label: 'Split cell',
      command: 'splitCell',
      icon: toolbarIcons.splitCell,
    },
    { 
      label: 'Fix tables',
      command: 'fixTables',
      icon: toolbarIcons.fixTables,
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
  };

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
      { label: '50%', key: 0.5 },
      { label: '75%', key: 0.75 },
      { label: '90%', key: 0.9 },
      { label: '100%', key: 1 },
      { label: '125%', key: 1.25 },
      { label: '150%', key: 1.5 },
      { label: '200%', key: 2 },
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
  //

  // search
  // const search = useToolbarItem({
  //   type: "button",
  //   allowWithoutEditor: true,
  //   name: "search",
  //   tooltip: "Search",
  //   disabled: true,
  //   icon: "fas fa-magnifying-glass", // change to svg
  //   group: "right",
  // });

  const clearFormatting = useToolbarItem({
    type: 'button',
    name: 'clearFormatting',
    command: 'clearFormat',
    tooltip: 'Clear formatting',
    icon: toolbarIcons.clearFormatting,
  });

  const toolbarItemsMobile = [
    bold,
    italic,
    underline,
    indentRight,
    indentLeft,
    // search,
    overflow,
  ].map((item) => item.name);

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
    // else if (role === 'suggester') return documentOptions.filter((option) => option.value !== 'editing');
    else if (role === 'viewer') return documentOptions.filter((option) => option.value === 'viewing');
  };

  const getDefaultLabel = (role) => {
    if (role === 'editor') return 'Editing';
    // if (role === 'suggester') return 'Suggesting';
    if (role === 'viewer') return 'Viewing';
  };

  const documentMode = useToolbarItem({
    type: 'dropdown',
    name: 'documentMode',
    command: 'setDocumentMode',
    allowWithoutEditor: true,
    icon: toolbarIcons.documentMode,
    defaultLabel: getDefaultLabel(role),
    label: getDefaultLabel(role),
    hasCaret: true,
    isWide: true,
    style: { display: 'flex', justifyContent: 'flex-end' },
    inlineTextInputVisible: false,
    hasInlineTextInput: false,
    group: 'right',
    attributes: {
      dropdownPosition: 'right',
      className: 'doc-mode',
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
      description: 'Edit document directly' 
    },
    { 
      label: 'Suggesting', 
      value: 'suggesting', 
      icon: toolbarIcons.documentSuggestingMode, 
      description: 'Edits become suggestions' 
    },
    { 
      label: 'Viewing', 
      value: 'viewing', 
      icon: toolbarIcons.documentViewingMode, 
      description: 'View clean version of document only' 
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
  };

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
    ['textAlign', 37],
    ['documentMode', 45],
    ['zoom', 70],
    ['fontSize', 56],
    ['fontFamily', 72],
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
    style: { width: '150px' },
    suppressActiveHighlight: true,
    disabled: false,
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
            })
          ])
        }
      }
    ],
    onActivate: () => {
      linkedStyles.disabled.value = false;
    },
    onDeactivate: () => {
      linkedStyles.disabled.value = true;
    },
  });

  // Responsive toolbar calculations
  const itemsToHide = ['zoom', 'fontFamily', 'fontSize', 'redo'];
  const hideWideItemsEndpoint = 600;
  const toolbarPadding = 32;
  const stickyItemsWidth = 120;

  let toolbarItems = [
    undo,
    redo,

    // Dev - tracked changes
    toggleTrackChanges,
    acceptTrackedChangeBySelection,
    rejectTrackedChangeOnSelection,
    toggleTrackChangesOriginal,
    toggleTrackChangesFinal,

    zoom,
    separator,
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
    separator,
    linkedStyles,
    separator,
    pageBreakTool,
    copyFormat,
    clearFormatting,
    ruler,
    overflow,
    documentMode,
    // search,
  ];

  // Hide separators on small screens
  if (windowWidth <= hideWideItemsEndpoint) {
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
    toolbarItems = toolbarItems.filter((item) => item.name.value !== 'ruler');
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
  const toolbarItemsSticky = [undo, overflow, documentMode].map((item) => item.name);

  const isStickyItem = (item) => toolbarItemsSticky.includes(item.name);

  const overflowItems = [];
  const visibleItems = [];
  // initial width with padding

  let totalWidth = toolbarPadding + stickyItemsWidth;
  toolbarItems.forEach((item) => {
    const itemWidth = controlSizes.get(item.name.value) || controlSizes.get('default');

    if (windowWidth < hideWideItemsEndpoint && itemsToHide.includes(item.name.value)) {
      overflowItems.push(item);
      return;
    }
    if (isStickyItem(item)) {
      visibleItems.push(item);
      totalWidth += itemWidth;
      return;
    }

    if (totalWidth < windowWidth) {
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
