var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _SuperToolbar_instances, initToolbarGroups_fn, _interceptedCommands, makeToolbarItems_fn, initDefaultFonts_fn, updateHighlightColors_fn, deactivateAll_fn, updateToolbarHistory_fn, runCommandWithArgumentOnly_fn;
import { au as getDefaultExportFromCjs, U as v4, T as TextSelection$1, q as getMarkRange, ax as vClickOutside, y as findParentNode, ay as getActiveFormatting, ao as isInTable, az as readFromClipboard, aA as handleClipboardPaste, a as Plugin } from "./chunks/converter-DP1ZH-FY.js";
import { ar, a4, d, a1 } from "./chunks/converter-DP1ZH-FY.js";
import { _ as _export_sfc, u as useHighContrastMode, a as getQuickFormatList, b as generateLinkedStyleString, c as getFileOpener, s as startImageUpload, y as yUndoPluginKey, d as undoDepth, r as redoDepth, S as SlashMenuPluginKey, E as Editor, e as getStarterExtensions, P as Placeholder, f as getRichTextExtensions, M as Mark, h as Extension, A as Attribute, N as Node } from "./chunks/editor-mlXVnPsL.js";
import { k, C, T, i, l, j } from "./chunks/editor-mlXVnPsL.js";
import { ref, onMounted, createElementBlock, openBlock, normalizeClass, unref, Fragment, renderList, createElementVNode, withModifiers, toDisplayString, createCommentVNode, normalizeStyle, computed, watch, withDirectives, withKeys, vModelText, createTextVNode, createVNode, h, createApp, markRaw, nextTick, onBeforeUnmount, reactive, onUnmounted, renderSlot, shallowRef, createBlock, withCtx, resolveDynamicComponent, normalizeProps, guardReactiveProps } from "vue";
import { t as toolbarIcons, s as sanitizeNumber, T as Toolbar, m as magicWandIcon, p as plusIconSvg, a as trashIconSvg, l as linkIconSvg, b as tableIconSvg, c as scissorsIconSvg, d as copyIconSvg, e as pasteIconSvg, f as borderNoneIconSvg, g as arrowsToDotIconSvg, h as arrowsLeftRightIconSvg, w as wrenchIconSvg, N as NSkeleton } from "./chunks/toolbar-D5SRfmIh.js";
import AIWriter from "./ai-writer.es.js";
import { D } from "./chunks/docx-zipper-CfqgvnK0.js";
import { createZip } from "./file-zipper.es.js";
var eventemitter3 = { exports: {} };
var hasRequiredEventemitter3;
function requireEventemitter3() {
  if (hasRequiredEventemitter3) return eventemitter3.exports;
  hasRequiredEventemitter3 = 1;
  (function(module) {
    var has = Object.prototype.hasOwnProperty, prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter2() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter2.prototype.eventNames = function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter2.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i2 = 0, l2 = handlers.length, ee = new Array(l2); i2 < l2; i2++) {
        ee[i2] = handlers[i2].fn;
      }
      return ee;
    };
    EventEmitter2.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter2.prototype.emit = function emit(event, a12, a2, a3, a42, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i2;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a12), true;
          case 3:
            return listeners.fn.call(listeners.context, a12, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a12, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a12, a2, a3, a42), true;
          case 6:
            return listeners.fn.call(listeners.context, a12, a2, a3, a42, a5), true;
        }
        for (i2 = 1, args = new Array(len - 1); i2 < len; i2++) {
          args[i2 - 1] = arguments[i2];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j2;
        for (i2 = 0; i2 < length; i2++) {
          if (listeners[i2].once) this.removeListener(event, listeners[i2].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i2].fn.call(listeners[i2].context);
              break;
            case 2:
              listeners[i2].fn.call(listeners[i2].context, a12);
              break;
            case 3:
              listeners[i2].fn.call(listeners[i2].context, a12, a2);
              break;
            case 4:
              listeners[i2].fn.call(listeners[i2].context, a12, a2, a3);
              break;
            default:
              if (!args) for (j2 = 1, args = new Array(len - 1); j2 < len; j2++) {
                args[j2 - 1] = arguments[j2];
              }
              listeners[i2].fn.apply(listeners[i2].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter2.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter2.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter2.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i2 = 0, events = [], length = listeners.length; i2 < length; i2++) {
          if (listeners[i2].fn !== fn || once && !listeners[i2].once || context && listeners[i2].context !== context) {
            events.push(listeners[i2]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter2.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter2.prototype.off = EventEmitter2.prototype.removeListener;
    EventEmitter2.prototype.addListener = EventEmitter2.prototype.on;
    EventEmitter2.prefixed = prefix;
    EventEmitter2.EventEmitter = EventEmitter2;
    {
      module.exports = EventEmitter2;
    }
  })(eventemitter3);
  return eventemitter3.exports;
}
var eventemitter3Exports = requireEventemitter3();
const EventEmitter = /* @__PURE__ */ getDefaultExportFromCjs(eventemitter3Exports);
const useToolbarItem = (options) => {
  const types = ["button", "options", "separator", "dropdown", "overflow"];
  if (!types.includes(options.type)) {
    throw new Error("Invalid toolbar item type - " + options.type);
  }
  if (options.type === "button" && !options.defaultLabel && !options.icon) {
    throw new Error("Toolbar button item needs either icon or label - " + options.name);
  }
  if (!options.name) {
    throw new Error("Invalid toolbar item name - " + options.name);
  }
  const id = ref(v4());
  const type = options.type;
  const name = ref(options.name);
  const command = options.command;
  const noArgumentCommand = options.noArgumentCommand;
  const icon = ref(options.icon);
  const group = ref(options.group || "center");
  const allowWithoutEditor = ref(options.allowWithoutEditor);
  const attributes = ref(options.attributes || {});
  const initiallyDisabled = options.disabled || false;
  const disabled = ref(options.disabled);
  const active = ref(false);
  const expand = ref(false);
  const style = ref(options.style);
  const isNarrow = ref(options.isNarrow);
  const isWide = ref(options.isWide);
  const minWidth = ref(options.minWidth);
  const suppressActiveHighlight = ref(options.suppressActiveHighlight || false);
  const argument = ref(options.argument);
  const childItem = ref(null);
  const parentItem = ref(null);
  const iconColor = ref(options.iconColor);
  const hasCaret = ref(options.hasCaret);
  const dropdownStyles = ref(options.dropdownStyles);
  const tooltip = ref(options.tooltip);
  const tooltipVisible = ref(options.tooltipVisible);
  const tooltipTimeout = ref(options.tooltipTimeout);
  const defaultLabel = ref(options.defaultLabel);
  const label = ref(options.label);
  const hideLabel = ref(options.hideLabel);
  const inlineTextInputVisible = ref(options.inlineTextInputVisible);
  const hasInlineTextInput = ref(options.hasInlineTextInput);
  const markName = ref(options.markName);
  const labelAttr = ref(options.labelAttr);
  const selectedValue = ref(options.selectedValue);
  const dropdownValueKey = ref(options.dropdownValueKey);
  const inputRef = ref(options.inputRef || null);
  const nestedOptions = ref([]);
  if (options.options) {
    if (!Array.isArray(options.options)) throw new Error("Invalid toolbar item options - " + options.options);
    nestedOptions.value?.push(...options.options);
  }
  const activate = (attrs) => {
    onActivate(attrs);
    if (suppressActiveHighlight.value) return;
    active.value = true;
  };
  const deactivate = () => {
    onDeactivate();
    active.value = false;
  };
  const setDisabled = (state) => {
    disabled.value = state;
  };
  const resetDisabled = () => {
    disabled.value = initiallyDisabled;
  };
  const onActivate = options.onActivate || (() => null);
  const onDeactivate = options.onDeactivate || (() => null);
  const unref2 = () => {
    const flattened = {};
    Object.keys(refs).forEach((key) => {
      if (refs[key].value !== void 0) {
        flattened[key] = refs[key].value;
      }
    });
    return flattened;
  };
  const refs = {
    id,
    name,
    type,
    command,
    noArgumentCommand,
    icon,
    tooltip,
    group,
    attributes,
    disabled,
    active,
    expand,
    nestedOptions,
    style,
    isNarrow,
    isWide,
    minWidth,
    argument,
    parentItem,
    iconColor,
    hasCaret,
    dropdownStyles,
    tooltipVisible,
    tooltipTimeout,
    defaultLabel,
    label,
    hideLabel,
    inlineTextInputVisible,
    hasInlineTextInput,
    markName,
    labelAttr,
    childItem,
    allowWithoutEditor,
    dropdownValueKey,
    selectedValue,
    inputRef
  };
  return {
    ...refs,
    unref: unref2,
    activate,
    deactivate,
    setDisabled,
    resetDisabled,
    onActivate,
    onDeactivate
  };
};
const _hoisted_1$c = ["onClick", "innerHTML", "aria-label", "onKeydown"];
const _sfc_main$e = {
  __name: "AlignmentButtons",
  emits: ["select"],
  setup(__props, { emit: __emit }) {
    const { isHighContrastMode } = useHighContrastMode();
    const emit = __emit;
    const alignmentButtonsRefs = ref([]);
    const alignmentButtons = [
      {
        key: "left",
        ariaLabel: "Align left",
        icon: toolbarIcons.alignLeft
      },
      {
        key: "center",
        ariaLabel: "Align center",
        icon: toolbarIcons.alignCenter
      },
      {
        key: "right",
        ariaLabel: "Align right",
        icon: toolbarIcons.alignRight
      },
      {
        key: "justify",
        ariaLabel: "Justify",
        icon: toolbarIcons.alignJustify
      }
    ];
    const select = (alignment2) => {
      emit("select", alignment2);
    };
    const moveToNextButton = (index) => {
      if (index === alignmentButtonsRefs.value.length - 1) return;
      const nextButton = alignmentButtonsRefs.value[index + 1];
      if (nextButton) {
        nextButton.setAttribute("tabindex", "0");
        nextButton.focus();
      }
    };
    const moveToPreviousButton = (index) => {
      if (index === 0) return;
      const previousButton = alignmentButtonsRefs.value[index - 1];
      if (previousButton) {
        previousButton.setAttribute("tabindex", "0");
        previousButton.focus();
      }
    };
    const handleKeyDown = (e, index) => {
      switch (e.key) {
        case "ArrowLeft":
          moveToPreviousButton(index);
          break;
        case "ArrowRight":
          moveToNextButton(index);
          break;
        case "Enter":
          select(alignmentButtons[index].key);
          break;
      }
    };
    onMounted(() => {
      const firstButton = alignmentButtonsRefs.value[0];
      if (firstButton) {
        firstButton.setAttribute("tabindex", "0");
        firstButton.focus();
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["alignment-buttons", { "high-contrast": unref(isHighContrastMode) }])
      }, [
        (openBlock(), createElementBlock(Fragment, null, renderList(alignmentButtons, (button, index) => {
          return createElementVNode("div", {
            key: button.key,
            class: "button-icon",
            onClick: ($event) => select(button.key),
            innerHTML: button.icon,
            "data-item": "btn-textAlign-option",
            role: "menuitem",
            "aria-label": button.ariaLabel,
            ref_for: true,
            ref_key: "alignmentButtonsRefs",
            ref: alignmentButtonsRefs,
            onKeydown: withModifiers((event) => handleKeyDown(event, index), ["prevent"])
          }, null, 40, _hoisted_1$c);
        }), 64))
      ], 2);
    };
  }
};
const AlignmentButtons = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["__scopeId", "data-v-d84f57b6"]]);
const _hoisted_1$b = ["onClick", "onKeydown"];
const _hoisted_2$9 = { class: "document-mode-column icon-column" };
const _hoisted_3$7 = ["innerHTML"];
const _hoisted_4$3 = { class: "document-mode-column text-column" };
const _hoisted_5$2 = { class: "document-mode-type" };
const _hoisted_6$1 = { class: "document-mode-description" };
const _sfc_main$d = {
  __name: "DocumentMode",
  props: {
    options: {
      type: Array
    }
  },
  emits: ["select"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const documentModeRefs = ref([]);
    const { isHighContrastMode } = useHighContrastMode();
    const props = __props;
    const handleClick = (item) => {
      emit("select", item);
    };
    const moveToNextOption = (index) => {
      if (index === documentModeRefs.value.length - 1) return;
      const nextOption = documentModeRefs.value[index + 1];
      if (nextOption) {
        nextOption.setAttribute("tabindex", "0");
        nextOption.focus();
      }
    };
    const moveToPreviousOption = (index) => {
      if (index === 0) return;
      const previousOption = documentModeRefs.value[index - 1];
      if (previousOption) {
        previousOption.setAttribute("tabindex", "0");
        previousOption.focus();
      }
    };
    const handleKeyDown = (e, index) => {
      switch (e.key) {
        case "ArrowDown":
          moveToNextOption(index);
          break;
        case "ArrowUp":
          moveToPreviousOption(index);
          break;
        case "Enter":
          handleClick(props.options[index]);
          break;
      }
    };
    onMounted(() => {
      documentModeRefs.value[0].setAttribute("tabindex", "0");
      documentModeRefs.value[0].focus();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["document-mode", { "high-contrast": unref(isHighContrastMode) }])
      }, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(__props.options, (option, index) => {
          return openBlock(), createElementBlock("div", {
            class: normalizeClass(["option-item", { disabled: option.disabled }]),
            onClick: ($event) => handleClick(option),
            "data-item": "btn-documentMode-option",
            role: "menuitem",
            ref_for: true,
            ref_key: "documentModeRefs",
            ref: documentModeRefs,
            onKeydown: withModifiers((event) => handleKeyDown(event, index), ["prevent"])
          }, [
            createElementVNode("div", _hoisted_2$9, [
              createElementVNode("div", {
                class: "icon-column__icon",
                innerHTML: option.icon
              }, null, 8, _hoisted_3$7)
            ]),
            createElementVNode("div", _hoisted_4$3, [
              createElementVNode("div", _hoisted_5$2, toDisplayString(option.label), 1),
              createElementVNode("div", _hoisted_6$1, toDisplayString(option.description), 1)
            ])
          ], 42, _hoisted_1$b);
        }), 256))
      ], 2);
    };
  }
};
const DocumentMode = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["__scopeId", "data-v-8730b752"]]);
const _hoisted_1$a = {
  key: 0,
  class: "linked-style-buttons"
};
const _hoisted_2$8 = ["onClick", "onKeydown"];
const _sfc_main$c = {
  __name: "LinkedStyle",
  props: {
    editor: {
      type: Object,
      required: true
    },
    selectedOption: {
      type: String
    }
  },
  emits: ["select"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const styleRefs = ref([]);
    const props = __props;
    const select = (style) => {
      emit("select", style);
    };
    const moveToNextStyle = (index) => {
      if (index === styleRefs.value.length - 1) {
        return;
      }
      const nextItem = styleRefs.value[index + 1];
      nextItem.setAttribute("tabindex", "0");
      nextItem.focus();
    };
    const moveToPreviousStyle = (index) => {
      if (index === 0) {
        return;
      }
      const previousItem = styleRefs.value[index - 1];
      previousItem.setAttribute("tabindex", "0");
      previousItem.focus();
    };
    const handleKeyDown = (event, index, style) => {
      switch (event.key) {
        case "ArrowDown":
          moveToNextStyle(index);
          break;
        case "ArrowUp":
          moveToPreviousStyle(index);
          break;
        case "Enter":
          console.log("style", style);
          select(style);
          break;
      }
    };
    onMounted(() => {
      styleRefs.value[0].setAttribute("tabindex", "0");
      styleRefs.value[0].focus();
    });
    return (_ctx, _cache) => {
      return props.editor ? (openBlock(), createElementBlock("div", _hoisted_1$a, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(getQuickFormatList)(__props.editor), (style, index) => {
          return openBlock(), createElementBlock("div", {
            class: normalizeClass(["style-item", { selected: __props.selectedOption === style.id }]),
            onClick: ($event) => select(style),
            onKeydown: (event) => handleKeyDown(event, index, style),
            ref_for: true,
            ref_key: "styleRefs",
            ref: styleRefs
          }, [
            createElementVNode("div", {
              class: "style-name",
              style: normalizeStyle(unref(generateLinkedStyleString)(style, null, null, false)),
              "data-item": "btn-linkedStyles-option"
            }, toDisplayString(style.definition.attrs.name), 5)
          ], 42, _hoisted_2$8);
        }), 256))
      ])) : createCommentVNode("", true);
    };
  }
};
const LinkedStyle = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["__scopeId", "data-v-698bdb8e"]]);
const _hoisted_1$9 = {
  key: 0,
  class: "link-title"
};
const _hoisted_2$7 = {
  key: 1,
  class: "link-title"
};
const _hoisted_3$6 = {
  key: 2,
  class: "link-title"
};
const _hoisted_4$2 = {
  key: 3,
  class: "link-input-wrapper"
};
const _hoisted_5$1 = { class: "input-row text-input-row" };
const _hoisted_6 = ["onKeydown"];
const _hoisted_7 = { class: "input-row url-input-row" };
const _hoisted_8 = ["innerHTML"];
const _hoisted_9 = ["onKeydown"];
const _hoisted_10 = ["innerHTML"];
const _hoisted_11 = { class: "input-row link-buttons" };
const _hoisted_12 = ["innerHTML"];
const _hoisted_13 = {
  key: 4,
  class: "input-row go-to-anchor clickable"
};
const _sfc_main$b = {
  __name: "LinkInput",
  props: {
    showInput: {
      type: Boolean,
      default: true
    },
    showLink: {
      type: Boolean,
      default: true
    },
    goToAnchor: {
      type: Function,
      default: () => {
      }
    },
    editor: {
      type: Object,
      required: true
    },
    closePopover: {
      type: Function,
      default: () => {
      }
    }
  },
  setup(__props) {
    const props = __props;
    const { isHighContrastMode } = useHighContrastMode();
    const urlError = ref(false);
    const getSelectedText = () => {
      if (!props.editor || !props.editor.state) return "";
      const { state } = props.editor;
      const { selection } = state;
      const linkMark = state.schema.marks.link;
      if (selection.empty) {
        const range = getMarkRange(selection.$from, linkMark);
        return range ? state.doc.textBetween(range.from, range.to, " ") : "";
      }
      const rangeFrom = getMarkRange(selection.$from, linkMark);
      const rangeTo = getMarkRange(selection.$to, linkMark);
      if (rangeFrom || rangeTo) {
        const linkRange = rangeFrom || rangeTo;
        return state.doc.textBetween(linkRange.from, linkRange.to, " ");
      }
      return state.doc.textBetween(selection.from, selection.to, " ");
    };
    const getLinkHrefAtSelection = () => {
      if (!props.editor || !props.editor.state) return "";
      const { state } = props.editor;
      const { schema, selection } = state;
      const linkMark = schema.marks.link;
      if (!linkMark) return "";
      let href = "";
      const { $from, empty } = selection;
      if (empty) {
        const marks = state.storedMarks || $from.marks();
        const link = marks.find((mark) => mark.type === linkMark);
        if (link) href = link.attrs.href;
      } else {
        state.doc.nodesBetween(selection.from, selection.to, (node) => {
          if (node.marks) {
            const link = node.marks.find((mark) => mark.type === linkMark);
            if (link) href = link.attrs.href;
          }
        });
      }
      return href || "";
    };
    const text = ref("");
    const rawUrl = ref("");
    const isAnchor = ref(false);
    const url = computed(() => {
      if (!rawUrl.value) return "";
      if (!rawUrl.value.startsWith("http") && !rawUrl.value.startsWith("#")) return "http://" + rawUrl.value;
      return rawUrl.value;
    });
    const validUrl = computed(() => {
      if (url.value.startsWith("#")) return true;
      const urlSplit = url.value.split(".").filter(Boolean);
      return url.value.includes(".") && urlSplit.length > 1;
    });
    const isEditing = computed(() => !isAnchor.value && !!getLinkHrefAtSelection());
    const isDisabled = computed(() => !validUrl.value);
    const openLink = () => {
      window.open(url.value, "_blank");
    };
    const updateFromEditor = () => {
      text.value = getSelectedText();
      rawUrl.value = getLinkHrefAtSelection();
    };
    watch(
      () => props.editor?.state?.selection,
      () => {
        updateFromEditor();
      },
      { immediate: true }
    );
    const focusInput = () => {
      const input = document.querySelector(".link-input-ctn input");
      if (!input) return;
      input.focus();
    };
    onMounted(() => {
      updateFromEditor();
      isAnchor.value = rawUrl.value.startsWith("#");
      if (props.showInput) focusInput();
    });
    const handleSubmit = () => {
      const editor = props.editor;
      if (!editor) return;
      if (!rawUrl.value) {
        if (editor.commands?.unsetLink) editor.commands.unsetLink();
        props.closePopover();
        return;
      }
      if (!validUrl.value) {
        urlError.value = true;
        return;
      }
      const finalText = text.value || url.value;
      if (editor.commands?.toggleLink) {
        editor.commands.toggleLink({ href: url.value, text: finalText });
      }
      const endPos = editor.view.state.selection.$to.pos;
      editor.view.dispatch(editor.view.state.tr.setSelection(new TextSelection$1(editor.view.state.doc.resolve(endPos))));
      setTimeout(() => editor.view.focus(), 100);
      props.closePopover();
    };
    const handleRemove = () => {
      if (props.editor && props.editor.commands && props.editor.commands.unsetLink) {
        props.editor.commands.unsetLink();
        props.closePopover();
      }
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["link-input-ctn", { "high-contrast": unref(isHighContrastMode) }])
      }, [
        isAnchor.value ? (openBlock(), createElementBlock("div", _hoisted_1$9, "Page anchor")) : isEditing.value ? (openBlock(), createElementBlock("div", _hoisted_2$7, "Edit link")) : (openBlock(), createElementBlock("div", _hoisted_3$6, "Add link")),
        __props.showInput && !isAnchor.value ? (openBlock(), createElementBlock("div", _hoisted_4$2, [
          createElementVNode("div", _hoisted_5$1, [
            _cache[4] || (_cache[4] = createElementVNode("div", { class: "input-icon text-input-icon" }, "T", -1)),
            withDirectives(createElementVNode("input", {
              type: "text",
              name: "text",
              placeholder: "Text",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => text.value = $event),
              onKeydown: withKeys(withModifiers(handleSubmit, ["stop", "prevent"]), ["enter"])
            }, null, 40, _hoisted_6), [
              [vModelText, text.value]
            ])
          ]),
          createElementVNode("div", _hoisted_7, [
            createElementVNode("div", {
              class: "input-icon",
              innerHTML: unref(toolbarIcons).linkInput
            }, null, 8, _hoisted_8),
            withDirectives(createElementVNode("input", {
              type: "text",
              name: "link",
              placeholder: "Type or paste a link",
              class: normalizeClass({ error: urlError.value }),
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => rawUrl.value = $event),
              onKeydown: [
                withKeys(withModifiers(handleSubmit, ["stop", "prevent"]), ["enter"]),
                _cache[2] || (_cache[2] = ($event) => urlError.value = false)
              ]
            }, null, 42, _hoisted_9), [
              [vModelText, rawUrl.value]
            ]),
            createElementVNode("div", {
              class: normalizeClass(["open-link-icon", { disabled: !validUrl.value }]),
              innerHTML: unref(toolbarIcons).openLink,
              onClick: openLink,
              "data-item": "btn-link-open"
            }, null, 10, _hoisted_10)
          ]),
          createElementVNode("div", _hoisted_11, [
            isEditing.value ? (openBlock(), createElementBlock("button", {
              key: 0,
              class: "remove-btn",
              onClick: handleRemove,
              "data-item": "btn-link-remove"
            }, [
              createElementVNode("div", {
                class: "remove-btn__icon",
                innerHTML: unref(toolbarIcons).removeLink
              }, null, 8, _hoisted_12),
              _cache[5] || (_cache[5] = createTextVNode(" Remove ", -1))
            ])) : createCommentVNode("", true),
            createElementVNode("button", {
              class: normalizeClass(["submit-btn", { "disable-btn": isDisabled.value }]),
              onClick: handleSubmit,
              "data-item": "btn-link-apply"
            }, " Apply ", 2)
          ])
        ])) : isAnchor.value ? (openBlock(), createElementBlock("div", _hoisted_13, [
          createElementVNode("a", {
            onClick: _cache[3] || (_cache[3] = withModifiers((...args) => __props.goToAnchor && __props.goToAnchor(...args), ["stop", "prevent"]))
          }, "Go to " + toDisplayString(rawUrl.value.startsWith("#_") ? rawUrl.value.substring(2) : rawUrl.value), 1)
        ])) : createCommentVNode("", true)
      ], 2);
    };
  }
};
const LinkInput = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["__scopeId", "data-v-ba50627b"]]);
const _hoisted_1$8 = ["aria-label", "onClick", "onKeydown"];
const _hoisted_2$6 = ["innerHTML"];
const _hoisted_3$5 = ["innerHTML"];
const ROW_SIZE$1 = 7;
const _sfc_main$a = {
  __name: "IconGridRow",
  props: {
    icons: {
      type: Array,
      required: true
    },
    activeColor: {
      type: Object,
      required: false
    }
  },
  emits: ["select", "clickoutside"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const isActive = computed(() => (option) => {
      if (!props.activeColor.value) return false;
      return props.activeColor.value.toUpperCase() === option.value;
    });
    const getCheckStyle = (color, optionIndex) => {
      const lightColors = ["#FFFFFF", "#FAFF09"];
      if (optionIndex === 5 || lightColors.includes(color)) return { color: "#000" };
      return { color: "#FFF" };
    };
    const handleClick = (option) => {
      emit("select", option.value);
    };
    const rowRefs = ref([]);
    const iconRefs = ref([]);
    onMounted(() => {
      const isMatrix = props.icons.every((row) => Array.isArray(row));
      if (!isMatrix) throw new Error("icon props must be 2d array");
      const firstIcon = iconRefs.value[0];
      if (firstIcon) {
        firstIcon.setAttribute("tabindex", "0");
        firstIcon.focus();
      }
    });
    const moveToNextIcon = (rowIndex, optionIndex) => {
      const iconIndex = ROW_SIZE$1 * rowIndex + optionIndex + 1;
      const nextIcon = iconRefs.value[iconIndex];
      if (nextIcon) {
        nextIcon.setAttribute("tabindex", "0");
        nextIcon.focus();
      }
    };
    const moveToPreviousIcon = (rowIndex, optionIndex) => {
      const iconIndex = ROW_SIZE$1 * rowIndex + optionIndex - 1;
      const previousIcon = iconRefs.value[iconIndex];
      if (previousIcon) {
        previousIcon.setAttribute("tabindex", "0");
        previousIcon.focus();
      }
    };
    const moveToNextRow = (rowIndex, optionIndex) => {
      const iconIndex = optionIndex + ROW_SIZE$1 * (rowIndex + 1);
      const nextIcon = iconRefs.value[iconIndex];
      if (nextIcon) {
        nextIcon.setAttribute("tabindex", "0");
        nextIcon.focus();
      }
    };
    const moveToPreviousRow = (rowIndex, optionIndex) => {
      const iconIndex = optionIndex + ROW_SIZE$1 * (rowIndex - 1);
      const previousIcon = iconRefs.value[iconIndex];
      if (previousIcon) {
        previousIcon.setAttribute("tabindex", "0");
        previousIcon.focus();
      }
    };
    const handleKeyDown = (event, rowIndex, optionIndex, option) => {
      switch (event.key) {
        case "ArrowRight":
          moveToNextIcon(rowIndex, optionIndex);
          break;
        case "ArrowLeft":
          moveToPreviousIcon(rowIndex, optionIndex);
          break;
        case "ArrowDown":
          moveToNextRow(rowIndex, optionIndex);
          break;
        case "ArrowUp":
          moveToPreviousRow(rowIndex, optionIndex);
          break;
        case "Enter":
          handleClick(option);
          break;
        case "Escape":
          emit("clickoutside");
          break;
      }
    };
    return (_ctx, _cache) => {
      return openBlock(true), createElementBlock(Fragment, null, renderList(__props.icons, (row, rowIndex) => {
        return openBlock(), createElementBlock("div", {
          class: "option-row",
          key: rowIndex,
          role: "group",
          ref_for: true,
          ref_key: "rowRefs",
          ref: rowRefs
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(row, (option, optionIndex) => {
            return openBlock(), createElementBlock("div", {
              class: "option",
              key: optionIndex,
              "aria-label": option.label,
              role: "menuitem",
              ref_for: true,
              ref_key: "iconRefs",
              ref: iconRefs,
              onClick: withModifiers(($event) => handleClick(option), ["stop", "prevent"]),
              onKeydown: withModifiers((event) => handleKeyDown(event, rowIndex, optionIndex, option), ["prevent"])
            }, [
              createElementVNode("div", {
                class: "option__icon",
                innerHTML: option.icon,
                style: normalizeStyle(option.style)
              }, null, 12, _hoisted_2$6),
              isActive.value(option) ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: "option__check",
                innerHTML: unref(toolbarIcons).colorOptionCheck,
                style: normalizeStyle(getCheckStyle(option.value, optionIndex))
              }, null, 12, _hoisted_3$5)) : createCommentVNode("", true)
            ], 40, _hoisted_1$8);
          }), 128))
        ]);
      }), 128);
    };
  }
};
const IconGridRow = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["__scopeId", "data-v-0f479b6c"]]);
const DropIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M320 512c53.2 0 101.4-21.6 136.1-56.6l-298.3-235C140 257.1 128 292.3 128 320c0 106 86 192 192 192zM505.2 370.7c4.4-16.2 6.8-33.1 6.8-50.7c0-91.2-130.2-262.3-166.6-308.3C339.4 4.2 330.5 0 320.9 0l-1.8 0c-9.6 0-18.5 4.2-24.5 11.7C277.8 33 240.7 81.3 205.8 136L38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L505.2 370.7zM224 336c0 44.2 35.8 80 80 80c8.8 0 16 7.2 16 16s-7.2 16-16 16c-61.9 0-112-50.1-112-112c0-8.8 7.2-16 16-16s16 7.2 16 16z"/></svg>\n';
const _hoisted_1$7 = { class: "options-grid-wrap" };
const _hoisted_2$5 = ["innerHTML"];
const _hoisted_3$4 = { class: "option-grid-ctn" };
const _sfc_main$9 = {
  __name: "IconGrid",
  props: {
    icons: {
      type: Array,
      required: true
    },
    customIcons: {
      type: Array,
      required: false
    },
    activeColor: {
      type: Object,
      required: false
    },
    hasNoneIcon: {
      type: Boolean,
      required: false
    }
  },
  emits: ["select", "clickoutside"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const handleSelect = (option) => {
      emit("select", option);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$7, [
        __props.hasNoneIcon ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "none-option",
          role: "menuitem",
          "aria-label": "Clear color selection",
          onClick: _cache[0] || (_cache[0] = ($event) => handleSelect("none"))
        }, [
          createElementVNode("span", {
            innerHTML: unref(DropIcon),
            class: "none-icon"
          }, null, 8, _hoisted_2$5),
          _cache[1] || (_cache[1] = createTextVNode(" None ", -1))
        ])) : createCommentVNode("", true),
        createElementVNode("div", _hoisted_3$4, [
          createVNode(IconGridRow, {
            icons: __props.icons,
            "active-color": __props.activeColor,
            onSelect: handleSelect
          }, null, 8, ["icons", "active-color"]),
          __props.customIcons.flat().length ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            _cache[2] || (_cache[2] = createElementVNode("span", { class: "option-grid-ctn__subtitle" }, "Custom colors", -1)),
            createVNode(IconGridRow, {
              icons: __props.customIcons,
              "active-color": __props.activeColor,
              onSelect: handleSelect
            }, null, 8, ["icons", "active-color"])
          ], 64)) : createCommentVNode("", true)
        ])
      ]);
    };
  }
};
const IconGrid = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["__scopeId", "data-v-4c0091c8"]]);
const closeDropdown$1 = (dropdown) => {
  dropdown.expand.value = false;
};
const makeColorOption = (color, label = null) => {
  return {
    label,
    icon: toolbarIcons.colorOption,
    value: color,
    style: {
      color,
      boxShadow: "0 0 5px 1px rgba(0, 0, 0, 0.1)",
      borderRadius: "50%"
    }
  };
};
const renderColorOptions = (superToolbar, button, customIcons = [], hasNoneIcon = false) => {
  const handleSelect = (e) => {
    button.iconColor.value = e;
    superToolbar.emitCommand({ item: button, argument: e });
    closeDropdown$1(button);
  };
  return h("div", {}, [
    h(IconGrid, {
      icons,
      customIcons,
      activeColor: button.iconColor,
      hasNoneIcon,
      onSelect: handleSelect
    })
  ]);
};
const icons = [
  [
    makeColorOption("#111111", "black"),
    makeColorOption("#333333", "dark gray"),
    makeColorOption("#5C5C5C", "medium gray"),
    makeColorOption("#858585", "light gray"),
    makeColorOption("#ADADAD", "very light gray"),
    makeColorOption("#D6D6D6", "transparent gray"),
    makeColorOption("#FFFFFF", "white")
  ],
  [
    makeColorOption("#860028", "dark red"),
    makeColorOption("#D2003F", "red"),
    makeColorOption("#DB3365", "coral red"),
    makeColorOption("#E4668C", "light red"),
    makeColorOption("#ED99B2", "pale pink"),
    makeColorOption("#F6CCD9", "transparent pink"),
    makeColorOption("#FF004D", "bright pink")
  ],
  [
    makeColorOption("#83015E", "dark purple"),
    makeColorOption("#CD0194", "purple"),
    makeColorOption("#D734A9", "orchid"),
    makeColorOption("#E167BF", "light purple"),
    makeColorOption("#EB99D4", "lavender"),
    makeColorOption("#F5CCEA", "transparent pink"),
    makeColorOption("#FF00A8", "neon pink")
  ],
  [
    makeColorOption("#8E220A", "maroon"),
    makeColorOption("#DD340F", "red-orange"),
    makeColorOption("#E45C3F", "burnt orange"),
    makeColorOption("#EB856F", "peach"),
    makeColorOption("#F1AE9F", "pale peach"),
    makeColorOption("#F8D6CF", "transparent peach"),
    makeColorOption("#FF7A00", "orange")
  ],
  [
    makeColorOption("#947D02", "olive"),
    makeColorOption("#E7C302", "mustard yellow"),
    makeColorOption("#ECCF35", "yellow"),
    makeColorOption("#F1DB67", "light yellow"),
    makeColorOption("#F5E79A", "very pale yellow"),
    makeColorOption("#FAF3CC", "transparent yellow"),
    makeColorOption("#FAFF09", "neon yellow")
  ],
  [
    makeColorOption("#055432", "forest green"),
    makeColorOption("#07834F", "green"),
    makeColorOption("#399C72", "medium green"),
    makeColorOption("#6AB595", "light green"),
    makeColorOption("#9CCDB9", "mint"),
    makeColorOption("#CDE6DC", "transparent mint"),
    makeColorOption("#05F38F", "bright teal")
  ],
  [
    makeColorOption("#063E7E", "navy blue"),
    makeColorOption("#0A60C5", "blue"),
    makeColorOption("#3B80D1", "sky blue"),
    makeColorOption("#6CA0DC", "cornflower blue"),
    makeColorOption("#9DBFE8", "light blue"),
    makeColorOption("#CEDFF3", "very light blue"),
    makeColorOption("#21c8ce", "cyan")
  ],
  [
    makeColorOption("#3E027A", "deep purple"),
    makeColorOption("#6103BF", "indigo"),
    makeColorOption("#8136CC", "violet"),
    makeColorOption("#A068D9", "lavender pink"),
    makeColorOption("#C09AE6", "light lilac"),
    makeColorOption("#DFCDF2", "transparent lilac"),
    makeColorOption("#A91DFF", "neon purple")
  ]
];
const getAvailableColorOptions = () => {
  return icons.flat().map((item) => item.value);
};
const _hoisted_1$6 = ["data-cols", "data-rows", "onKeydown", "onClick"];
const _hoisted_2$4 = ["aria-valuetext"];
const ROW_SIZE = 5;
const _sfc_main$8 = {
  __name: "TableGrid",
  emits: ["select", "clickoutside"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const selectedRows = ref(0);
    const selectedCols = ref(0);
    const { isHighContrastMode } = useHighContrastMode();
    const tableGridItems = ref([]);
    const onTableGridMouseOver = (event) => {
      let target = event.target;
      let isGrid = !!target.dataset.grid;
      if (isGrid) {
        return;
      }
      let grid = target.parentElement;
      let allItems = [...grid.querySelectorAll("[data-item]")];
      let cols = parseInt(target.dataset.cols, 10);
      let rows = parseInt(target.dataset.rows, 10);
      selectGridItems(allItems, cols, rows);
    };
    const selectGridItems = (allItems, cols, rows) => {
      selectedCols.value = cols;
      selectedRows.value = rows;
      for (let i2 = 0; i2 < allItems.length; i2++) {
        let item = allItems[i2];
        let itemsCols = parseInt(item.dataset.cols, 10);
        let itemsRows = parseInt(item.dataset.rows, 10);
        if (itemsCols <= cols && itemsRows <= rows) {
          item.classList.add("selected");
        } else {
          item.classList.remove("selected");
        }
      }
    };
    const handleClick = ({ cols, rows }) => {
      emit("select", { cols, rows });
    };
    const handleKeyDown = (event, cols, rows) => {
      let normalizedCols = cols - 1;
      let normalizedRows = rows - 1;
      switch (event.key) {
        case "ArrowRight": {
          if (normalizedCols >= 4) {
            return;
          }
          const currentRow = normalizedRows * ROW_SIZE;
          tableGridItems.value[currentRow + normalizedCols + 1].setAttribute("tabindex", "0");
          tableGridItems.value[currentRow + normalizedCols + 1].focus();
          selectGridItems(tableGridItems.value, cols + 1, rows);
          break;
        }
        case "ArrowLeft": {
          if (normalizedCols <= 0) {
            return;
          }
          const currentRow = normalizedRows * ROW_SIZE;
          tableGridItems.value[currentRow + normalizedCols - 1].setAttribute("tabindex", "0");
          tableGridItems.value[currentRow + normalizedCols - 1].focus();
          selectGridItems(tableGridItems.value, cols - 1, rows);
          break;
        }
        case "ArrowDown": {
          if (normalizedRows >= 4) {
            return;
          }
          const nextRow = (normalizedRows + 1) * ROW_SIZE;
          tableGridItems.value[nextRow + normalizedCols].setAttribute("tabindex", "0");
          tableGridItems.value[nextRow + normalizedCols].focus();
          selectGridItems(tableGridItems.value, cols, rows + 1);
          break;
        }
        case "ArrowUp": {
          if (normalizedRows <= 0) {
            return;
          }
          const previousRow = (normalizedRows - 1) * ROW_SIZE;
          tableGridItems.value[previousRow + normalizedCols].setAttribute("tabindex", "0");
          tableGridItems.value[previousRow + normalizedCols].focus();
          selectGridItems(tableGridItems.value, cols, rows - 1);
          break;
        }
        case "Enter": {
          handleClick({ cols, rows });
          break;
        }
      }
    };
    onMounted(() => {
      tableGridItems.value[0].setAttribute("tabindex", "0");
      tableGridItems.value[0].focus();
      selectGridItems(tableGridItems.value, 1, 1);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["toolbar-table-grid-wrapper", { "high-contrast": unref(isHighContrastMode) }])
      }, [
        createElementVNode("div", {
          class: "toolbar-table-grid",
          onMouseover: onTableGridMouseOver,
          "data-grid": "true"
        }, [
          (openBlock(), createElementBlock(Fragment, null, renderList(5, (i2) => {
            return openBlock(), createElementBlock(Fragment, { key: i2 }, [
              (openBlock(), createElementBlock(Fragment, null, renderList(5, (n) => {
                return createElementVNode("div", {
                  class: "toolbar-table-grid__item",
                  key: `${i2}_${n}`,
                  "data-cols": n,
                  "data-rows": i2,
                  "data-item": "true",
                  ref_for: true,
                  ref_key: "tableGridItems",
                  ref: tableGridItems,
                  onKeydown: withModifiers((event) => handleKeyDown(event, n, i2), ["prevent"]),
                  onClick: withModifiers(($event) => handleClick({ cols: n, rows: i2 }), ["stop", "prevent"])
                }, null, 40, _hoisted_1$6);
              }), 64))
            ], 64);
          }), 64))
        ], 32),
        createElementVNode("div", {
          class: "toolbar-table-grid-value",
          "aria-valuetext": `${selectedRows.value} x ${selectedCols.value}`
        }, toDisplayString(selectedRows.value) + " x " + toDisplayString(selectedCols.value), 9, _hoisted_2$4)
      ], 2);
    };
  }
};
const TableGrid = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["__scopeId", "data-v-92e8d5fb"]]);
const _hoisted_1$5 = { class: "toolbar-table-actions" };
const _hoisted_2$3 = ["onClick", "data-item", "ariaLabel"];
const _hoisted_3$3 = { class: "toolbar-table-actions__icon" };
const _hoisted_4$1 = ["innerHTML"];
const _hoisted_5 = { class: "toolbar-table-actions__label" };
const _sfc_main$7 = {
  __name: "TableActions",
  props: {
    options: {
      type: Array
    }
  },
  emits: ["select"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const handleClick = (item) => {
      emit("select", { command: item.command });
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(__props.options, (option) => {
          return openBlock(), createElementBlock("div", {
            class: normalizeClass(["toolbar-table-actions__item", { "toolbar-table-actions__item--border": option.bottomBorder }]),
            onClick: ($event) => handleClick(option),
            "data-item": option.props?.["data-item"] || "",
            ariaLabel: option.props?.ariaLabel,
            role: "menuitem"
          }, [
            createElementVNode("div", _hoisted_3$3, [
              createElementVNode("div", {
                class: "toolbar-table-actions__icon-wrapper",
                innerHTML: option.icon
              }, null, 8, _hoisted_4$1)
            ]),
            createElementVNode("div", _hoisted_5, toDisplayString(option.label), 1)
          ], 10, _hoisted_2$3);
        }), 256))
      ]);
    };
  }
};
const TableActions = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-990b9a25"]]);
function getScrollableParent(element) {
  let currentElement = element;
  while (currentElement) {
    const overflowY = window.getComputedStyle(currentElement).overflowY;
    if (/(auto|scroll)/.test(overflowY) && currentElement.scrollHeight > currentElement.clientHeight) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}
function scrollToElement(targetElement, options = { behavior: "smooth", block: "start" }) {
  if (!targetElement) return;
  const container = getScrollableParent(targetElement);
  const containerRect = container.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const offsetTop = targetRect.top - containerRect.top + container.scrollTop;
  container.scrollTo({
    top: options.block === "start" ? offsetTop : offsetTop - container.clientHeight + targetElement.offsetHeight,
    behavior: options.behavior
  });
}
const checkIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>\n';
const _hoisted_1$4 = { class: "search-input-ctn" };
const _hoisted_2$2 = { class: "row" };
const _hoisted_3$2 = ["onKeydown"];
const _sfc_main$6 = {
  __name: "SearchInput",
  props: {
    searchRef: {
      type: Object
    }
  },
  emits: ["submit"],
  setup(__props, { emit: __emit }) {
    const searchValue = ref("");
    const emit = __emit;
    const handleSubmit = () => {
      emit("submit", { value: searchValue.value });
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        createElementVNode("div", _hoisted_2$2, [
          withDirectives(createElementVNode("input", {
            ref: __props.searchRef,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => searchValue.value = $event),
            class: "search-input",
            type: "text",
            name: "search",
            placeholder: "Type search string",
            onKeydown: withKeys(withModifiers(handleSubmit, ["stop", "prevent"]), ["enter"])
          }, null, 40, _hoisted_3$2), [
            [vModelText, searchValue.value]
          ])
        ]),
        createElementVNode("div", { class: "row submit" }, [
          createElementVNode("button", {
            class: "submit-btn",
            onClick: handleSubmit
          }, "Apply")
        ])
      ]);
    };
  }
};
const SearchInput = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-957cbcf2"]]);
const TOOLBAR_FONTS = [
  {
    label: "Georgia",
    key: "Georgia, serif",
    fontWeight: 400,
    props: {
      style: { fontFamily: "Georgia, serif" },
      "data-item": "btn-fontFamily-option"
    }
  },
  {
    label: "Arial",
    key: "Arial, sans-serif",
    fontWeight: 400,
    props: {
      style: { fontFamily: "Arial, sans-serif" },
      "data-item": "btn-fontFamily-option"
    }
  },
  {
    label: "Courier New",
    key: "Courier New, monospace",
    fontWeight: 400,
    props: {
      style: { fontFamily: "Courier New, monospace" },
      "data-item": "btn-fontFamily-option"
    }
  },
  {
    label: "Times New Roman",
    key: "Times New Roman, serif",
    fontWeight: 400,
    props: {
      style: { fontFamily: "Times New Roman, serif" },
      "data-item": "btn-fontFamily-option"
    }
  }
];
const closeDropdown = (dropdown) => {
  dropdown.expand.value = false;
};
const makeDefaultItems = ({
  superToolbar,
  toolbarIcons: toolbarIcons2,
  toolbarTexts: toolbarTexts2,
  toolbarFonts,
  hideButtons,
  availableWidth,
  role,
  isDev = false
} = {}) => {
  const bold = useToolbarItem({
    type: "button",
    name: "bold",
    command: "toggleBold",
    icon: toolbarIcons2.bold,
    tooltip: toolbarTexts2.bold,
    attributes: {
      ariaLabel: "Bold"
    }
  });
  const fontButton = useToolbarItem({
    type: "dropdown",
    name: "fontFamily",
    tooltip: toolbarTexts2.fontFamily,
    command: "setFontFamily",
    defaultLabel: "Arial",
    label: "Arial",
    markName: "textStyle",
    labelAttr: "fontFamily",
    hasCaret: true,
    isWide: true,
    style: { width: "116px" },
    suppressActiveHighlight: true,
    attributes: {
      ariaLabel: "Font family"
    },
    options: [...toolbarFonts ? toolbarFonts : TOOLBAR_FONTS],
    onActivate: ({ fontFamily }) => {
      if (!fontFamily) return;
      fontButton.label.value = fontFamily;
    },
    onDeactivate: () => fontButton.label.value = fontButton.defaultLabel.value
  });
  const aiButton = useToolbarItem({
    type: "dropdown",
    dropdownStyles: {
      padding: 0,
      outline: "none"
    },
    name: "ai",
    tooltip: toolbarTexts2.ai,
    icon: toolbarIcons2.ai,
    hideLabel: true,
    hasCaret: false,
    isWide: true,
    suppressActiveHighlight: true,
    attributes: {
      ariaLabel: "AI"
    },
    options: [
      {
        type: "render",
        key: "ai",
        render: () => {
          let selectedText = "";
          if (superToolbar.activeEditor) {
            const { state } = superToolbar.activeEditor;
            const { from, to, empty } = state.selection;
            selectedText = !empty ? state.doc.textBetween(from, to) : "";
          }
          const handleClose = () => {
            closeDropdown(aiButton);
          };
          return h("div", {}, [
            h(AIWriter, {
              handleClose,
              selectedText,
              editor: superToolbar.activeEditor,
              apiKey: superToolbar.config.aiApiKey,
              endpoint: superToolbar.config.aiEndpoint,
              superToolbar
            })
          ]);
        }
      }
    ]
  });
  const fontSize = useToolbarItem({
    type: "dropdown",
    name: "fontSize",
    defaultLabel: "12",
    label: "12",
    minWidth: "50px",
    markName: "textStyle",
    labelAttr: "fontSize",
    tooltip: toolbarTexts2.fontSize,
    hasCaret: true,
    hasInlineTextInput: true,
    inlineTextInputVisible: true,
    suppressActiveHighlight: true,
    isWide: true,
    command: "setFontSize",
    attributes: {
      ariaLabel: "Font size"
    },
    options: [
      { label: "8", key: "8pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "9", key: "9pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "10", key: "10pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "11", key: "11pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "12", key: "12pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "14", key: "14pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "18", key: "18pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "24", key: "24pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "30", key: "30pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "36", key: "36pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "48", key: "48pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "60", key: "60pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "72", key: "72pt", props: { "data-item": "btn-fontSize-option" } },
      { label: "96", key: "96pt", props: { "data-item": "btn-fontSize-option" } }
    ],
    onActivate: ({ fontSize: size }) => {
      if (!size) return fontSize.label.value = fontSize.defaultLabel.value;
      let sanitizedValue = sanitizeNumber(size, 12);
      if (sanitizedValue < 8) sanitizedValue = 8;
      if (sanitizedValue > 96) sanitizedValue = 96;
      fontSize.label.value = String(sanitizedValue);
    },
    onDeactivate: () => fontSize.label.value = fontSize.defaultLabel.value
  });
  const separator = useToolbarItem({
    type: "separator",
    name: "separator",
    isNarrow: true
  });
  const italic = useToolbarItem({
    type: "button",
    name: "italic",
    command: "toggleItalic",
    icon: toolbarIcons2.italic,
    tooltip: toolbarTexts2.italic,
    attributes: {
      ariaLabel: "Italic"
    }
  });
  const underline = useToolbarItem({
    type: "button",
    name: "underline",
    command: "toggleUnderline",
    icon: toolbarIcons2.underline,
    tooltip: toolbarTexts2.underline,
    attributes: {
      ariaLabel: "Underline"
    }
  });
  const strikethrough = useToolbarItem({
    type: "button",
    name: "strikethrough",
    command: "toggleStrike",
    icon: toolbarIcons2.strikethrough,
    tooltip: toolbarTexts2.strikethrough,
    attributes: {
      ariaLabel: "Strikethrough"
    }
  });
  const highlight = useToolbarItem({
    type: "dropdown",
    name: "highlight",
    icon: toolbarIcons2.highlight,
    hideLabel: true,
    markName: "highlight",
    labelAttr: "color",
    tooltip: toolbarTexts2.highlight,
    command: "setHighlight",
    noArgumentCommand: "unsetHighlight",
    suppressActiveHighlight: true,
    attributes: {
      ariaLabel: "Highlight"
    },
    options: [
      {
        key: "color",
        type: "render",
        render: () => renderColorOptions(superToolbar, highlight, [], true)
      }
    ],
    onActivate: ({ color }) => {
      highlight.iconColor.value = color || "";
    },
    onDeactivate: () => highlight.iconColor.value = ""
  });
  const colorButton = useToolbarItem({
    type: "dropdown",
    name: "color",
    icon: toolbarIcons2.color,
    hideLabel: true,
    markName: "textStyle",
    labelAttr: "color",
    tooltip: toolbarTexts2.color,
    command: "setColor",
    suppressActiveHighlight: true,
    attributes: {
      ariaLabel: "Color"
    },
    options: [
      {
        key: "color",
        type: "render",
        render: () => renderColorOptions(superToolbar, colorButton)
      }
    ],
    onActivate: ({ color }) => {
      colorButton.iconColor.value = color;
    },
    onDeactivate: () => colorButton.iconColor.value = "#000"
  });
  const searchRef = ref(null);
  const search = useToolbarItem({
    type: "dropdown",
    name: "search",
    icon: toolbarIcons2.search,
    tooltip: toolbarTexts2.search,
    group: "right",
    inputRef: searchRef,
    attributes: {
      ariaLabel: "Search"
    },
    options: [
      {
        type: "render",
        key: "searchDropdown",
        render: () => renderSearchDropdown()
      }
    ]
  });
  const renderSearchDropdown = () => {
    const handleSubmit = ({ value }) => {
      superToolbar.activeEditor.commands.search(value);
    };
    return h("div", {}, [
      h(SearchInput, {
        onSubmit: handleSubmit,
        searchRef
      })
    ]);
  };
  const link = useToolbarItem({
    type: "dropdown",
    name: "link",
    markName: "link",
    icon: toolbarIcons2.link,
    tooltip: toolbarTexts2.link,
    attributes: {
      ariaLabel: "Link dropdown"
    },
    options: [
      {
        type: "render",
        key: "linkDropdown",
        render: () => renderLinkDropdown(link)
      }
    ],
    onActivate: ({ href }) => {
      if (href) link.attributes.value = { href };
      else link.attributes.value = {};
    },
    onDeactivate: () => {
      link.attributes.value = {};
      link.expand.value = false;
    }
  });
  function renderLinkDropdown(link2) {
    return h("div", {}, [
      h(LinkInput, {
        editor: superToolbar.activeEditor,
        closePopover: () => closeDropdown(link2),
        goToAnchor: () => {
          closeDropdown(link2);
          if (!superToolbar.activeEditor || !link2.attributes.value?.href) return;
          const anchorName = link2.attributes.value?.href?.slice(1);
          const container = superToolbar.activeEditor.element;
          const anchor = container.querySelector(`a[name='${anchorName}']`);
          if (anchor) scrollToElement(anchor);
        }
      })
    ]);
  }
  const linkInput = useToolbarItem({
    type: "options",
    name: "linkInput",
    command: "toggleLink"
  });
  link.childItem = linkInput;
  linkInput.parentItem = link;
  const image = useToolbarItem({
    type: "button",
    name: "image",
    command: "startImageUpload",
    icon: toolbarIcons2.image,
    tooltip: toolbarTexts2.image,
    disabled: false,
    attributes: {
      ariaLabel: "Image"
    }
  });
  const tableItem = useToolbarItem({
    type: "dropdown",
    name: "table",
    icon: toolbarIcons2.table,
    hideLabel: true,
    labelAttr: "table",
    tooltip: toolbarTexts2.table,
    command: "insertTable",
    suppressActiveHighlight: true,
    attributes: {
      ariaLabel: "Table"
    },
    options: [
      {
        key: "table",
        type: "render",
        render: () => renderTableGrid(tableItem)
      }
    ]
  });
  function renderTableGrid(tableItem2) {
    const handleSelect = (e) => {
      superToolbar.emitCommand({ item: tableItem2, argument: e });
      closeDropdown(tableItem2);
    };
    return h("div", {}, [
      h(TableGrid, {
        onSelect: handleSelect
      })
    ]);
  }
  const tableActionsItem = useToolbarItem({
    type: "dropdown",
    name: "tableActions",
    command: "executeTableCommand",
    icon: toolbarIcons2.tableActions,
    hideLabel: true,
    disabled: true,
    attributes: {
      ariaLabel: "Table actions"
    },
    options: [
      {
        type: "render",
        render: () => renderTableActions(tableActionsItem)
      }
    ]
  });
  const tableActionsOptions2 = [
    {
      label: toolbarTexts2.addRowBefore,
      command: "addRowBefore",
      icon: toolbarIcons2.addRowBefore,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Add row before"
      }
    },
    {
      label: toolbarTexts2.addRowAfter,
      command: "addRowAfter",
      icon: toolbarIcons2.addRowAfter,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Add row after"
      }
    },
    {
      label: toolbarTexts2.addColumnBefore,
      command: "addColumnBefore",
      icon: toolbarIcons2.addColumnBefore,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Add column before"
      }
    },
    {
      label: toolbarTexts2.addColumnAfter,
      command: "addColumnAfter",
      icon: toolbarIcons2.addColumnAfter,
      bottomBorder: true,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Add column after"
      }
    },
    {
      label: toolbarTexts2.deleteRow,
      command: "deleteRow",
      icon: toolbarIcons2.deleteRow,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Delete row"
      }
    },
    {
      label: toolbarTexts2.deleteColumn,
      command: "deleteColumn",
      icon: toolbarIcons2.deleteColumn,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Delete column"
      }
    },
    {
      label: toolbarTexts2.deleteTable,
      command: "deleteTable",
      icon: toolbarIcons2.deleteTable,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Delete table"
      }
    },
    {
      label: toolbarTexts2.transparentBorders,
      command: "deleteCellAndTableBorders",
      icon: toolbarIcons2.deleteBorders,
      bottomBorder: true,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Delete cell and table borders"
      }
    },
    {
      label: toolbarTexts2.mergeCells,
      command: "mergeCells",
      icon: toolbarIcons2.mergeCells,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Merge cells"
      }
    },
    {
      label: toolbarTexts2.splitCell,
      command: "splitCell",
      icon: toolbarIcons2.splitCell,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Split cells"
      }
    },
    {
      label: toolbarTexts2.fixTables,
      command: "fixTables",
      icon: toolbarIcons2.fixTables,
      props: {
        "data-item": "btn-tableActions-option",
        ariaLabel: "Fix tables"
      }
    }
  ];
  function renderTableActions(tableActionsItem2) {
    return h(TableActions, {
      options: tableActionsOptions2,
      onSelect: (event) => {
        closeDropdown(tableActionsItem2);
        const { command } = event;
        superToolbar.emitCommand({ item: tableActionsItem2, argument: { command } });
      }
    });
  }
  const alignment2 = useToolbarItem({
    type: "dropdown",
    name: "textAlign",
    tooltip: toolbarTexts2.textAlign,
    icon: toolbarIcons2.alignLeft,
    command: "setTextAlign",
    hasCaret: true,
    markName: "textAlign",
    labelAttr: "textAlign",
    suppressActiveHighlight: true,
    attributes: {
      ariaLabel: "Text align"
    },
    options: [
      {
        type: "render",
        render: () => {
          const handleSelect = (e) => {
            closeDropdown(alignment2);
            const buttonWithCommand = { ...alignment2, command: "setTextAlign" };
            buttonWithCommand.command = "setTextAlign";
            superToolbar.emitCommand({ item: buttonWithCommand, argument: e });
            setAlignmentIcon(alignment2, e);
          };
          return h("div", {}, [
            h(AlignmentButtons, {
              onSelect: handleSelect
            })
          ]);
        },
        key: "alignment"
      }
    ],
    onActivate: ({ textAlign }) => {
      setAlignmentIcon(alignment2, textAlign);
    },
    onDeactivate: () => {
      setAlignmentIcon(alignment2, "left");
    }
  });
  const setAlignmentIcon = (alignment3, e) => {
    let alignValue = e === "both" ? "justify" : e;
    let icons2 = {
      left: toolbarIcons2.alignLeft,
      right: toolbarIcons2.alignRight,
      center: toolbarIcons2.alignCenter,
      justify: toolbarIcons2.alignJustify
    };
    let icon = icons2[alignValue] ?? icons2.left;
    alignment3.icon.value = icon;
  };
  const bulletedList = useToolbarItem({
    type: "button",
    name: "list",
    command: "toggleBulletList",
    icon: toolbarIcons2.bulletList,
    tooltip: toolbarTexts2.bulletList,
    attributes: {
      ariaLabel: "Bullet list"
    }
  });
  const numberedList = useToolbarItem({
    type: "button",
    name: "numberedlist",
    command: "toggleOrderedList",
    icon: toolbarIcons2.numberedList,
    tooltip: toolbarTexts2.numberedList,
    attributes: {
      ariaLabel: "Numbered list"
    }
  });
  const indentLeft = useToolbarItem({
    type: "button",
    name: "indentleft",
    command: "decreaseTextIndent",
    icon: toolbarIcons2.indentLeft,
    tooltip: toolbarTexts2.indentLeft,
    disabled: false,
    attributes: {
      ariaLabel: "Left indent"
    }
  });
  const indentRight = useToolbarItem({
    type: "button",
    name: "indentright",
    command: "increaseTextIndent",
    icon: toolbarIcons2.indentRight,
    tooltip: toolbarTexts2.indentRight,
    disabled: false,
    attributes: {
      ariaLabel: "Right indent"
    }
  });
  const overflow = useToolbarItem({
    type: "overflow",
    name: "overflow",
    command: "toggleOverflow",
    icon: toolbarIcons2.overflow,
    disabled: false,
    attributes: {
      ariaLabel: "Overflow items"
    }
  });
  const zoom = useToolbarItem({
    type: "dropdown",
    name: "zoom",
    allowWithoutEditor: true,
    tooltip: toolbarTexts2.zoom,
    defaultLabel: "100%",
    label: "100%",
    hasCaret: true,
    command: "setZoom",
    isWide: true,
    inlineTextInputVisible: false,
    hasInlineTextInput: true,
    attributes: {
      ariaLabel: "Zoom"
    },
    options: [
      { label: "50%", key: 0.5, props: { "data-item": "btn-zoom-option" } },
      { label: "75%", key: 0.75, props: { "data-item": "btn-zoom-option" } },
      { label: "90%", key: 0.9, props: { "data-item": "btn-zoom-option" } },
      { label: "100%", key: 1, props: { "data-item": "btn-zoom-option" } },
      { label: "125%", key: 1.25, props: { "data-item": "btn-zoom-option" } },
      { label: "150%", key: 1.5, props: { "data-item": "btn-zoom-option" } },
      { label: "200%", key: 2, props: { "data-item": "btn-zoom-option" } }
    ],
    onActivate: ({ zoom: value }) => {
      if (!value) return;
      zoom.label.value = value;
    }
  });
  const undo = useToolbarItem({
    type: "button",
    name: "undo",
    disabled: true,
    tooltip: toolbarTexts2.undo,
    command: "undo",
    icon: toolbarIcons2.undo,
    group: "left",
    attributes: {
      ariaLabel: "Undo"
    },
    onDeactivate: () => {
      undo.disabled.value = !superToolbar.undoDepth;
    }
  });
  const redo = useToolbarItem({
    type: "button",
    disabled: true,
    name: "redo",
    tooltip: toolbarTexts2.redo,
    command: "redo",
    icon: toolbarIcons2.redo,
    group: "left",
    attributes: {
      ariaLabel: "Redo"
    },
    onDeactivate: () => {
      redo.disabled.value = !superToolbar.redoDepth;
    }
  });
  const toggleTrackChanges = useToolbarItem({
    type: "button",
    disabled: false,
    name: "toggleTrackChanges",
    tooltip: toolbarTexts2.trackChanges,
    command: "toggleTrackChanges",
    icon: toolbarIcons2.trackChanges,
    group: "left",
    attributes: {
      ariaLabel: "Track changes"
    }
  });
  const acceptTrackedChangeBySelection = useToolbarItem({
    type: "button",
    disabled: false,
    name: "acceptTrackedChangeBySelection",
    tooltip: toolbarTexts2.trackChangesAccept,
    command: "acceptTrackedChangeBySelection",
    icon: toolbarIcons2.trackChangesAccept,
    group: "left",
    attributes: {
      ariaLabel: "Accept tracked changes"
    }
  });
  const rejectTrackedChangeOnSelection = useToolbarItem({
    type: "button",
    disabled: false,
    name: "rejectTrackedChangeOnSelection",
    tooltip: toolbarTexts2.trackChangesReject,
    command: "rejectTrackedChangeOnSelection",
    icon: toolbarIcons2.trackChangesReject,
    group: "left",
    attributes: {
      ariaLabel: "Reject tracked changes"
    }
  });
  const toggleTrackChangesOriginal = useToolbarItem({
    type: "button",
    disabled: false,
    name: "toggleTrackChangesShowOriginal",
    tooltip: toolbarTexts2.trackChangesOriginal,
    command: "toggleTrackChangesShowOriginal",
    icon: toolbarIcons2.trackChangesOriginal,
    group: "left",
    attributes: {
      ariaLabel: "Toggle tracked changes show original"
    }
  });
  const toggleTrackChangesFinal = useToolbarItem({
    type: "button",
    disabled: false,
    name: "toggleTrackChangesShowFinal",
    tooltip: toolbarTexts2.trackChangesFinal,
    command: "toggleTrackChangesShowFinal",
    icon: toolbarIcons2.trackChangesFinal,
    group: "left",
    attributes: {
      ariaLabel: "Toggle tracked changes show final"
    }
  });
  const clearFormatting = useToolbarItem({
    type: "button",
    name: "clearFormatting",
    command: "clearFormat",
    tooltip: toolbarTexts2.clearFormatting,
    icon: toolbarIcons2.clearFormatting,
    attributes: {
      ariaLabel: "Clear formatting"
    }
  });
  [bold, italic, underline, indentRight, indentLeft, search, overflow].map(
    (item) => item.name
  );
  const copyFormat = useToolbarItem({
    type: "button",
    name: "copyFormat",
    tooltip: toolbarTexts2.copyFormat,
    icon: toolbarIcons2.copyFormat,
    command: "copyFormat",
    attributes: {
      ariaLabel: "Copy formatting"
    }
  });
  const getDocumentOptionsAfterRole = (role2, documentOptions2) => {
    if (role2 === "editor") return documentOptions2;
    else if (role2 === "suggester") return documentOptions2.filter((option) => option.value === "suggesting");
    else return documentOptions2.filter((option) => option.value === "viewing");
  };
  const getDefaultLabel = (role2) => {
    if (role2 === "editor") return "Editing";
    else if (role2 === "suggester") return "Suggesting";
    else return "Viewing";
  };
  const documentMode = useToolbarItem({
    type: "dropdown",
    name: "documentMode",
    command: "setDocumentMode",
    allowWithoutEditor: true,
    icon: toolbarIcons2.documentMode,
    defaultLabel: getDefaultLabel(role),
    label: getDefaultLabel(role),
    hasCaret: role === "editor",
    isWide: true,
    style: { display: "flex", justifyContent: "flex-end" },
    inlineTextInputVisible: false,
    hasInlineTextInput: false,
    group: "right",
    disabled: role !== "editor",
    attributes: {
      dropdownPosition: "right",
      className: "toolbar-item--doc-mode",
      ariaLabel: "Document mode"
    },
    options: [
      {
        type: "render",
        render: () => renderDocumentMode(documentMode)
      }
    ]
  });
  const documentOptions = [
    {
      label: toolbarTexts2.documentEditingMode,
      value: "editing",
      icon: toolbarIcons2.documentEditingMode,
      description: toolbarTexts2.documentEditingModeDescription
    },
    {
      label: toolbarTexts2.documentSuggestingMode,
      value: "suggesting",
      icon: toolbarIcons2.documentSuggestingMode,
      description: toolbarTexts2.documentSuggestingModeDescription
    },
    {
      label: toolbarTexts2.documentViewingMode,
      value: "viewing",
      icon: toolbarIcons2.documentViewingMode,
      description: toolbarTexts2.documentViewingModeDescription
    }
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
      }
    });
  }
  const pageBreakTool = useToolbarItem({
    type: "button",
    name: "pageBreakTool",
    command: "insertPageBreak",
    icon: toolbarIcons2.pageBreak,
    tooltip: toolbarTexts2.pageBreak,
    attributes: {
      ariaLabel: "Page break"
    }
  });
  const controlSizes = /* @__PURE__ */ new Map([
    ["separator", 20],
    ["zoom", 71],
    ["fontFamily", 118],
    ["fontSize", 57],
    ["textAlign", 40],
    ["linkedStyles", 142],
    ["documentMode", 47],
    ["ai", 32],
    ["default", 32]
  ]);
  const ruler = useToolbarItem({
    type: "button",
    name: "ruler",
    command: "toggleRuler",
    icon: toolbarIcons2.ruler,
    tooltip: toolbarTexts2.ruler,
    attributes: {
      ariaLabel: "Ruler"
    }
  });
  const selectedLinkedStyle = ref(null);
  const linkedStyles = useToolbarItem({
    type: "dropdown",
    name: "linkedStyles",
    command: "setLinkedStyle",
    icon: toolbarIcons2.paintbrush,
    defaultLabel: toolbarTexts2.formatText,
    label: toolbarTexts2.formatText,
    hasCaret: true,
    isWide: true,
    style: { width: "140px" },
    suppressActiveHighlight: true,
    disabled: false,
    attributes: {
      className: "toolbar-item--linked-styles",
      ariaLabel: "Linked styles"
    },
    options: [
      {
        type: "render",
        key: "linkedStyle",
        render: () => {
          const handleSelect = (style) => {
            closeDropdown(linkedStyles);
            const itemWithCommand = { ...linkedStyles, command: "setLinkedStyle" };
            superToolbar.emitCommand({ item: itemWithCommand, argument: style });
            selectedLinkedStyle.value = style.id;
          };
          return h("div", {}, [
            h(LinkedStyle, {
              editor: superToolbar.activeEditor,
              onSelect: handleSelect,
              selectedOption: selectedLinkedStyle.value
            })
          ]);
        }
      }
    ],
    onActivate: () => {
      linkedStyles.disabled.value = false;
    },
    onDeactivate: () => {
      linkedStyles.disabled.value = true;
    }
  });
  const renderIcon = (value, selectedValue) => {
    if (selectedValue.value.toString() !== value) return;
    return h("div", { innerHTML: checkIconSvg, class: "dropdown-select-icon" });
  };
  const lineHeight = useToolbarItem({
    type: "dropdown",
    name: "lineHeight",
    tooltip: toolbarTexts2.lineHeight,
    icon: toolbarIcons2.lineHeight,
    hasCaret: false,
    hasInlineTextInput: false,
    inlineTextInputVisible: false,
    suppressActiveHighlight: true,
    isWide: false,
    command: "setLineHeight",
    dropdownValueKey: "key",
    selectedValue: "1",
    attributes: {
      ariaLabel: "Line height"
    },
    options: [
      {
        label: "1,0",
        key: "1",
        icon: () => renderIcon("1", lineHeight.selectedValue),
        props: { "data-item": "btn-lineHeight-option" }
      },
      {
        label: "1,15",
        key: "1.15",
        icon: () => renderIcon("1.15", lineHeight.selectedValue),
        props: { "data-item": "btn-lineHeight-option" }
      },
      {
        label: "1,5",
        key: "1.5",
        icon: () => renderIcon("1.5", lineHeight.selectedValue),
        props: { "data-item": "btn-lineHeight-option" }
      },
      {
        label: "2,0",
        key: "2",
        icon: () => renderIcon("2", lineHeight.selectedValue),
        props: { "data-item": "btn-lineHeight-option" }
      },
      {
        label: "2,5",
        key: "2.5",
        icon: () => renderIcon("2.5", lineHeight.selectedValue),
        props: { "data-item": "btn-lineHeight-option" }
      },
      {
        label: "3,0",
        key: "3",
        icon: () => renderIcon("3", lineHeight.selectedValue),
        props: { "data-item": "btn-lineHeight-option" }
      }
    ]
  });
  const breakpoints = {
    sm: 768,
    md: 1024,
    xl: 1410
  };
  const stickyItemsWidth = 120;
  const toolbarPadding = 32;
  const itemsToHideXL = ["linkedStyles", "clearFormatting", "copyFormat", "ruler"];
  const itemsToHideSM = ["zoom", "fontFamily", "fontSize", "redo"];
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
    strikethrough,
    colorButton,
    highlight,
    separator,
    link,
    image,
    tableItem,
    tableActionsItem,
    separator,
    alignment2,
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
    documentMode
  ];
  if (!superToolbar.config?.superdoc?.config?.modules?.ai) {
    toolbarItems = toolbarItems.filter((item) => item.name.value !== "ai");
  }
  if (availableWidth <= breakpoints.md && hideButtons) {
    toolbarItems = toolbarItems.filter((item) => item.type !== "separator");
  }
  if (!superToolbar.config.pagination) {
    toolbarItems = toolbarItems.filter((item) => item.name.value !== "pageBreakTool");
  }
  if (superToolbar.config.mode !== "docx") {
    const getLinkedStylesIndex = toolbarItems.findIndex((item) => item.name.value === "linkedStyles");
    toolbarItems.splice(getLinkedStylesIndex - 1, 2);
    const filterItems = ["ruler", "zoom", "undo", "redo"];
    toolbarItems = toolbarItems.filter((item) => !filterItems.includes(item.name.value));
  }
  const devItems = [toggleTrackChanges, toggleTrackChangesOriginal, toggleTrackChangesFinal];
  if (!isDev) {
    if (role === "viewer") {
      devItems.push(...[acceptTrackedChangeBySelection, rejectTrackedChangeOnSelection]);
    }
    toolbarItems = toolbarItems.filter((item) => !devItems.includes(item));
  }
  const toolbarItemsSticky = [search, undo, overflow, documentMode].map((item) => item.name);
  const isStickyItem = (item) => toolbarItemsSticky.includes(item.name);
  const overflowItems = [];
  const visibleItems = [];
  let totalWidth = toolbarPadding + stickyItemsWidth;
  toolbarItems.forEach((item) => {
    const itemWidth = controlSizes.get(item.name.value) || controlSizes.get("default");
    if (availableWidth < breakpoints.xl && itemsToHideXL.includes(item.name.value) && hideButtons) {
      overflowItems.push(item);
      if (item.name.value === "linkedStyles") {
        const linkedStylesIdx = toolbarItems.findIndex((item2) => item2.name.value === "linkedStyles");
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
    overflowItems: overflowItems.filter((item) => item.type !== "separator")
  };
};
const toolbarTexts = {
  bold: "Bold",
  fontFamily: "Font",
  ai: "AI text generation",
  fontSize: "Font size",
  italic: "Italic",
  underline: "Underline",
  highlight: "Highlight color",
  strikethrough: "Strikethrough",
  color: "Text color",
  search: "Search",
  link: "Link",
  image: "Image",
  table: "Insert table",
  addRowBefore: "Insert row above",
  addRowAfter: "Insert row below",
  addColumnBefore: "Insert column left",
  addColumnAfter: "Insert column right",
  deleteRow: "Delete row",
  deleteColumn: "Delete column",
  deleteTable: "Delete table",
  transparentBorders: "Transparent borders",
  mergeCells: "Merge cells",
  splitCell: "Split cell",
  fixTables: "Fix tables",
  textAlign: "Alignment",
  bulletList: "Bullet list",
  numberedList: "Numbered list",
  indentLeft: "Left indent",
  indentRight: "Right indent",
  zoom: "Zoom",
  undo: "Undo",
  redo: "Redo",
  trackChanges: "Track Changes",
  trackChangesAccept: "Accept changes under selection",
  trackChangesReject: "Reject changes under selection",
  trackChangesOriginal: "Toggle Show Original",
  trackChangesFinal: "Toggle Show Final",
  clearFormatting: "Clear formatting",
  copyFormat: "Format painter",
  lineHeight: "Line height",
  formatText: "Format text",
  ruler: "Show or hide ruler",
  pageBreak: "Insert page break",
  documentEditingMode: "Editing",
  documentSuggestingMode: "Suggesting",
  documentViewingMode: "Viewing",
  documentEditingModeDescription: "Edit document directly",
  documentSuggestingModeDescription: "Edits become suggestions",
  documentViewingModeDescription: "View clean version of document only"
};
class SuperToolbar extends EventEmitter {
  /**
   * Creates a new SuperToolbar instance
   * @param {ToolbarConfig} config - The configuration for the toolbar
   * @returns {void}
   */
  constructor(config) {
    super();
    __privateAdd(this, _SuperToolbar_instances);
    /**
     * Default configuration for the toolbar
     * @type {ToolbarConfig}
     */
    __publicField(this, "config", {
      selector: null,
      toolbarGroups: ["left", "center", "right"],
      role: "editor",
      pagination: false,
      icons: { ...toolbarIcons },
      texts: { ...toolbarTexts },
      fonts: null,
      hideButtons: true,
      responsiveToContainer: false,
      mode: "docx",
      excludeItems: [],
      groups: null,
      editor: null,
      aiApiKey: null,
      aiEndpoint: null,
      customButtons: []
    });
    /**
     * Custom commands that override default behavior
     * @private
     * @type {Object.<string, function(CommandItem): void>}
     */
    __privateAdd(this, _interceptedCommands, {
      /**
       * Handles zoom level changes
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {string|number} params.argument - The zoom level (percentage)
       * @returns {void}
       */
      setZoom: ({ item, argument }) => {
        if (!argument) return;
        item.onActivate({ zoom: argument });
        this.emit("superdoc-command", { item, argument });
        const layers = document.querySelector(this.superdoc.config.selector)?.querySelector(".layers");
        if (!layers) return;
        const isMobileDevice = typeof screen.orientation !== "undefined";
        const isSmallScreen = window.matchMedia("(max-width: 834px)").matches;
        if (isMobileDevice && isSmallScreen) {
          layers.style.transformOrigin = "0 0";
          layers.style.transform = `scale(${parseInt(argument) / 100})`;
        } else {
          layers.style.zoom = parseInt(argument) / 100;
        }
        this.superdoc.superdocStore.activeZoom = parseInt(argument);
      },
      /**
       * Sets the document mode
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {string} params.argument - The document mode to set
       * @returns {void}
       */
      setDocumentMode: ({ item, argument }) => {
        if (!argument) return;
        this.emit("superdoc-command", { item, argument });
      },
      /**
       * Sets the font size for text
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {string|number} params.argument - The font size to set
       * @returns {void}
       */
      setFontSize: ({ item, argument }) => {
        __privateMethod(this, _SuperToolbar_instances, runCommandWithArgumentOnly_fn).call(this, { item, argument }, () => {
          this.activeEditor?.commands.setFieldAnnotationsFontSize(argument, true);
        });
      },
      /**
       * Sets the font family for text
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {string} params.argument - The font family to set
       * @returns {void}
       */
      setFontFamily: ({ item, argument }) => {
        __privateMethod(this, _SuperToolbar_instances, runCommandWithArgumentOnly_fn).call(this, { item, argument }, () => {
          this.activeEditor?.commands.setFieldAnnotationsFontFamily(argument, true);
        });
      },
      /**
       * Sets the text color
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {string} params.argument - The color to set
       * @returns {void}
       */
      setColor: ({ item, argument }) => {
        __privateMethod(this, _SuperToolbar_instances, runCommandWithArgumentOnly_fn).call(this, { item, argument }, () => {
          this.activeEditor?.commands.setFieldAnnotationsTextColor(argument, true);
        });
      },
      /**
       * Sets the highlight color for text
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {string} params.argument - The highlight color to set
       * @returns {void}
       */
      setHighlight: ({ item, argument }) => {
        __privateMethod(this, _SuperToolbar_instances, runCommandWithArgumentOnly_fn).call(this, { item, argument, noArgumentCallback: true }, () => {
          let arg = argument !== "none" ? argument : null;
          this.activeEditor?.commands.setFieldAnnotationsTextHighlight(arg, true);
          this.activeEditor?.commands.setCellBackground(arg);
        });
      },
      /**
       * Toggles the ruler visibility
       * @param {Object} [_params=null] - Command parameters (not used)
       * @returns {void}
       */
      toggleRuler: (_params = null) => {
        this.superdoc.toggleRuler();
      },
      /**
       * Initiates the image upload process
       * @async
       * @param {Object} [_params=null - Command parameters (not used)
       * @returns {Promise<void>}
       */
      startImageUpload: async (_params = null) => {
        let open = getFileOpener();
        let result = await open();
        if (!result?.file) {
          return;
        }
        startImageUpload({
          editor: this.activeEditor,
          view: this.activeEditor.view,
          file: result.file
        });
      },
      /**
       * Increases text indentation or list level
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {*} params.argument - Command arguments
       * @returns {void}
       */
      increaseTextIndent: ({ item, argument }) => {
        let command = item.command;
        let { state } = this.activeEditor;
        let listItem = findParentNode((node) => node.type.name === "listItem")(state.selection);
        if (listItem) {
          return this.activeEditor.commands.increaseListIndent();
        }
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
        }
      },
      /**
       * Decreases text indentation or list level
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {*} params.argument - Command arguments
       * @returns {boolean}
       */
      decreaseTextIndent: ({ item, argument }) => {
        let command = item.command;
        let { state } = this.activeEditor;
        let listItem = findParentNode((node) => node.type.name === "listItem")(state.selection);
        if (listItem) {
          return this.activeEditor.commands.decreaseListIndent();
        }
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
        }
      },
      /**
       * Toggles bold formatting for text
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {*} params.argument - Command arguments
       * @returns {void}
       */
      toggleBold: ({ item, argument }) => {
        let command = item.command;
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
          this.activeEditor.commands.toggleFieldAnnotationsFormat("bold", true);
        }
        this.updateToolbarState();
      },
      /**
       * Toggles italic formatting for text
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {*} params.argument - Command arguments
       * @returns {void}
       */
      toggleItalic: ({ item, argument }) => {
        let command = item.command;
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
          this.activeEditor.commands.toggleFieldAnnotationsFormat("italic", true);
        }
        this.updateToolbarState();
      },
      /**
       * Toggles underline formatting for text
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {*} params.argument - Command arguments
       * @returns {void}
       */
      toggleUnderline: ({ item, argument }) => {
        let command = item.command;
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
          this.activeEditor.commands.toggleFieldAnnotationsFormat("underline", true);
        }
        this.updateToolbarState();
      },
      /**
       * Toggles link formatting and updates cursor position
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {*} params.argument - Command arguments
       * @returns {void}
       */
      toggleLink: ({ item, argument }) => {
        let command = item.command;
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
          const { view } = this.activeEditor;
          let { selection } = view.state;
          if (this.activeEditor.options.isHeaderOrFooter) {
            selection = this.activeEditor.options.lastSelection;
          }
          const endPos = selection.$to.pos;
          const newSelection = new TextSelection(view.state.doc.resolve(endPos));
          const tr = view.state.tr.setSelection(newSelection);
          const state = view.state.apply(tr);
          view.updateState(state);
          if (!this.activeEditor.options.isHeaderOrFooter) {
            setTimeout(() => {
              view.focus();
            }, 100);
          }
        }
        this.updateToolbarState();
      },
      /**
       * Inserts a table into the document
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {Object} params.argument - Table configuration
       * @returns {void}
       */
      insertTable: ({ item, argument }) => {
        __privateMethod(this, _SuperToolbar_instances, runCommandWithArgumentOnly_fn).call(this, { item, argument });
      },
      /**
       * Executes a table-related command
       * @param {Object} params - Command parameters
       * @param {CommandItem} params.item - The command item
       * @param {Object} params.argument - The table command and its parameters
       * @param {string} params.argument.command - The specific table command to execute
       * @returns {void}
       */
      executeTableCommand: ({ item, argument }) => {
        if (!argument) return;
        let command = argument.command;
        if (command in this.activeEditor.commands) {
          this.activeEditor.commands[command](argument);
        }
        this.updateToolbarState();
      }
    });
    /**
     * Handler for toolbar resize events
     * @returns {void}
     */
    __publicField(this, "onToolbarResize", () => {
      __privateMethod(this, _SuperToolbar_instances, makeToolbarItems_fn).call(this, {
        superToolbar: this,
        icons: this.config.icons,
        texts: this.config.texts,
        fonts: this.config.fonts,
        hideButtons: this.config.hideButtons,
        isDev: this.isDev
      });
      if (this.role === "viewer") {
        __privateMethod(this, _SuperToolbar_instances, deactivateAll_fn).call(this);
      }
    });
    this.config = { ...this.config, ...config };
    this.toolbarItems = [];
    this.overflowItems = [];
    this.documentMode = config.documentMode || "editing";
    this.isDev = config.isDev || false;
    this.superdoc = config.superdoc;
    this.role = config.role || "editor";
    this.toolbarContainer = null;
    if (this.config.editor) {
      this.config.mode = this.config.editor.options.mode;
    }
    this.config.icons = {
      ...toolbarIcons,
      ...config.icons
    };
    this.config.texts = {
      ...toolbarTexts,
      ...config.texts
    };
    this.config.hideButtons = config.hideButtons ?? true;
    this.config.responsiveToContainer = config.responsiveToContainer ?? false;
    if (!this.config.selector && this.config.element) {
      this.config.selector = this.config.element;
    }
    this.toolbarContainer = this.findElementBySelector(this.config.selector);
    __privateMethod(this, _SuperToolbar_instances, initToolbarGroups_fn).call(this);
    __privateMethod(this, _SuperToolbar_instances, makeToolbarItems_fn).call(this, {
      superToolbar: this,
      icons: this.config.icons,
      texts: this.config.texts,
      fonts: this.config.fonts,
      hideButtons: this.config.hideButtons,
      isDev: config.isDev
    });
    if (this.config.selector && !this.toolbarContainer) {
      return;
    }
    this.app = createApp(Toolbar);
    this.app.directive("click-outside", vClickOutside);
    this.app.config.globalProperties.$toolbar = this;
    if (this.toolbarContainer) {
      this.toolbar = this.app.mount(this.toolbarContainer);
    }
    this.activeEditor = config.editor || null;
    this.updateToolbarState();
  }
  findElementBySelector(selector) {
    let el = null;
    if (selector) {
      if (selector.startsWith("#") || selector.startsWith(".")) {
        el = document.querySelector(selector);
      } else {
        el = document.getElementById(selector);
      }
      if (!el) {
        console.warn(`[super-toolbar 🎨] Element not found: ${selector}`);
        return null;
      }
    }
    return el;
  }
  /**
   * Log debug information to the console
   * @param {...*} args - Arguments to log
   * @returns {void}
   */
  log(...args) {
    console.debug("[🎨 super-toolbar]", ...args);
  }
  /**
   * Set the zoom level
   * @param {number} percent_int - The zoom percentage as an integer
   * @returns {void}
   */
  setZoom(percent_int) {
    const allItems = [...this.toolbarItems, ...this.overflowItems];
    const item = allItems.find((item2) => item2.name.value === "zoom");
    __privateGet(this, _interceptedCommands).setZoom({ item, argument: percent_int });
  }
  /**
   * The toolbar expects an active Super Editor instance.
   * @param {Object} editor - The editor instance to attach to the toolbar
   * @returns {void}
   */
  setActiveEditor(editor) {
    this.activeEditor = editor;
    this.activeEditor.on("transaction", this.onEditorTransaction.bind(this));
  }
  /**
   * Get toolbar items by group name
   * @param {string} groupName - The name of the group
   * @returns {ToolbarItem[]} An array of toolbar items in the specified group
   */
  getToolbarItemByGroup(groupName) {
    return this.toolbarItems.filter((item) => (item.group?.value || "center") === groupName);
  }
  /**
   * Get a toolbar item by name
   * @param {string} name - The name of the toolbar item
   * @returns {ToolbarItem|undefined} The toolbar item with the specified name or undefined if not found
   */
  getToolbarItemByName(name) {
    return this.toolbarItems.find((item) => item.name.value === name);
  }
  /**
   * Update the toolbar state based on the current editor state
   * Updates active/inactive state of all toolbar items
   * @returns {void}
   */
  updateToolbarState() {
    __privateMethod(this, _SuperToolbar_instances, updateToolbarHistory_fn).call(this);
    __privateMethod(this, _SuperToolbar_instances, initDefaultFonts_fn).call(this);
    __privateMethod(this, _SuperToolbar_instances, updateHighlightColors_fn).call(this);
    if (!this.activeEditor || this.documentMode === "viewing") {
      __privateMethod(this, _SuperToolbar_instances, deactivateAll_fn).call(this);
      return;
    }
    const marks = getActiveFormatting(this.activeEditor);
    const inTable = isInTable(this.activeEditor.state);
    this.toolbarItems.forEach((item) => {
      item.resetDisabled();
      if (item.name.value === "linkedStyles") {
        if (this.activeEditor && !getQuickFormatList(this.activeEditor).length) {
          return item.deactivate();
        } else {
          return item.activate();
        }
      }
      const activeMark = marks.find((mark) => mark.name === item.name.value);
      if (activeMark) {
        item.activate(activeMark.attrs);
      } else {
        item.deactivate();
      }
      const styleIdMark = marks.find((mark) => mark.name === "styleId");
      if (!activeMark && styleIdMark?.attrs.styleId) {
        const markToStyleMap = {
          fontSize: "font-size",
          fontFamily: "font-family",
          bold: "bold",
          textAlign: "textAlign"
        };
        const linkedStyles = this.activeEditor.converter?.linkedStyles.find(
          (style) => style.id === styleIdMark.attrs.styleId
        );
        if (linkedStyles && markToStyleMap[item.name.value] in linkedStyles?.definition.styles) {
          const linkedStylesItem = linkedStyles?.definition.styles[markToStyleMap[item.name.value]];
          const value = {
            [item.name.value]: linkedStylesItem
          };
          item.activate(value);
        }
      }
      const spacingAttr = marks.find((mark) => mark.name === "spacing");
      if (item.name.value === "lineHeight" && (activeMark?.attrs?.lineHeight || spacingAttr)) {
        item.selectedValue.value = activeMark?.attrs?.lineHeight || spacingAttr.attrs?.spacing?.line || "";
      }
      if (item.name.value === "tableActions") {
        item.disabled.value = !inTable;
      }
      const listNumberingType = marks.find((mark) => mark.name === "listNumberingType")?.attrs?.listNumberingType;
      if (item.name.value === "list" && listNumberingType === "bullet") {
        item.activate();
      } else if (item.name.value === "numberedlist" && listNumberingType && listNumberingType !== "bullet") {
        item.activate();
      }
    });
  }
  /**
   * React to editor transactions. Might want to debounce this.
   * @param {Object} params - Transaction parameters
   * @param {Object} params.editor - The editor instance (not used)
   * @param {Object} params.transaction - The transaction object
   * @returns {void}
   */
  onEditorTransaction({ editor, transaction }) {
    if (!transaction.docChanged && !transaction.selectionSet) return;
    this.updateToolbarState();
  }
  /**
   * Main handler for toolbar commands
   * @param {CommandItem} params - Command parameters
   * @param {ToolbarItem} params.item - An instance of the useToolbarItem composable
   * @param {*} [params.argument] - The argument passed to the command
   * @returns {*} The result of the executed command, undefined if no result is returned
   */
  emitCommand({ item, argument, option }) {
    if (this.activeEditor && !this.activeEditor.options.isHeaderOrFooter) {
      this.activeEditor.focus();
    }
    const { command } = item;
    if (!command) {
      return;
    }
    this.log("(emmitCommand) Command:", command, "\n	item:", item, "\n	argument:", argument, "\n	option:", option);
    if (command in __privateGet(this, _interceptedCommands)) {
      return __privateGet(this, _interceptedCommands)[command]({ item, argument });
    }
    if (command in this.activeEditor?.commands) {
      this.activeEditor.commands[command](argument);
    } else if (typeof command === "function") {
      command({ item, argument, option });
    } else {
      throw new Error(`[super-toolbar 🎨] Command not found: ${command}`);
    }
    this.updateToolbarState();
  }
}
_SuperToolbar_instances = new WeakSet();
/**
 * Initiate toolbar groups
 * @private
 * @returns {void}
 */
initToolbarGroups_fn = function() {
  if (this.config.groups && !Array.isArray(this.config.groups) && Object.keys(this.config.groups).length) {
    this.config.toolbarGroups = Object.keys(this.config.groups);
  }
};
_interceptedCommands = new WeakMap();
/**
 * Create toolbar items based on configuration
 * @private
 * @param {SuperToolbar} options.superToolbar - The toolbar instance
 * @param {Object} options.icons - Icons to use for toolbar items
 * @param {Object} options.texts - Texts to use for toolbar items
 * @param {Array} options.fonts - Fonts for the toolbar item
 * @param {boolean} options.isDev - Whether in development mode
 * @returns {void}
 */
makeToolbarItems_fn = function({ superToolbar, icons: icons2, texts, fonts, hideButtons, isDev = false } = {}) {
  const documentWidth = document.documentElement.clientWidth;
  const containerWidth = this.toolbarContainer?.offsetWidth ?? 0;
  const availableWidth = this.config.responsiveToContainer ? containerWidth : documentWidth;
  const { defaultItems, overflowItems } = makeDefaultItems({
    superToolbar,
    toolbarIcons: icons2,
    toolbarTexts: texts,
    toolbarFonts: fonts,
    hideButtons,
    availableWidth,
    role: this.role,
    isDev
  });
  const customItems = this.config.customButtons || [];
  if (customItems.length) {
    defaultItems.push(...customItems.map((item) => useToolbarItem({ ...item })));
  }
  let allConfigItems = [
    ...defaultItems.map((item) => item.name.value),
    ...overflowItems.map((item) => item.name.value)
  ];
  if (this.config.groups) allConfigItems = Object.values(this.config.groups).flatMap((item) => item);
  const filteredItems = defaultItems.filter((item) => allConfigItems.includes(item.name.value)).filter((item) => !this.config.excludeItems.includes(item.name.value));
  this.toolbarItems = filteredItems;
  this.overflowItems = overflowItems.filter((item) => allConfigItems.includes(item.name.value));
};
/**
 * Initialize default fonts from the editor
 * @private
 * @returns {void}
 */
initDefaultFonts_fn = function() {
  if (!this.activeEditor || !this.activeEditor.converter) return;
  const { typeface = "Arial", fontSizePt = 12 } = this.activeEditor.converter.getDocumentDefaultStyles() ?? {};
  const fontSizeItem = this.toolbarItems.find((item) => item.name.value === "fontSize");
  if (fontSizeItem) fontSizeItem.defaultLabel.value = fontSizePt;
  const fontFamilyItem = this.toolbarItems.find((item) => item.name.value === "fontFamily");
  if (fontFamilyItem) fontFamilyItem.defaultLabel.value = typeface;
};
/**
 * Update highlight color options based on document colors
 * @private
 * @returns {void}
 */
updateHighlightColors_fn = function() {
  if (!this.activeEditor || !this.activeEditor.converter) return;
  if (!this.activeEditor.converter.docHiglightColors.size) return;
  const highlightItem = this.toolbarItems.find((item) => item.name.value === "highlight");
  if (!highlightItem) return;
  const pickerColorOptions = getAvailableColorOptions();
  const perChunk = 7;
  const result = Array.from(this.activeEditor.converter.docHiglightColors).reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
    }
    if (!pickerColorOptions.includes(item)) resultArray[chunkIndex].push(makeColorOption(item));
    return resultArray;
  }, []);
  const option = {
    key: "color",
    type: "render",
    render: () => renderColorOptions(this, highlightItem, result, true)
  };
  highlightItem.nestedOptions.value = [option];
};
/**
 * Deactivate all toolbar items
 * @private
 * @returns {void}
 */
deactivateAll_fn = function() {
  this.activeEditor = null;
  this.toolbarItems.forEach((item) => {
    const { allowWithoutEditor } = item;
    if (allowWithoutEditor.value) return;
    item.setDisabled(true);
  });
};
/**
 * Update undo/redo history state in the toolbar
 * @private
 * @returns {void}
 */
updateToolbarHistory_fn = function() {
  if (!this.activeEditor) return;
  if (this.activeEditor.options.ydoc) {
    const undoManager = yUndoPluginKey.getState(this.activeEditor.state)?.undoManager;
    this.undoDepth = undoManager?.undoStack.length || 0;
    this.redoDepth = undoManager?.redoStack.length || 0;
  } else {
    this.undoDepth = undoDepth(this.activeEditor.state);
    this.redoDepth = redoDepth(this.activeEditor.state);
  }
};
/**
 * Run a command that requires an argument
 * @private
 * @param {CommandItem} params - Command parameters
 * @param {ToolbarItem} params.item - The toolbar item
 * @param {*} params.argument - The argument for the command
 * @param {boolean} params.noArgumentCallback - Whether to call callback even if argument === 'none'
 * @param {Function} [callback] - Optional callback to run after the command
 * @returns {void}
 */
runCommandWithArgumentOnly_fn = function({ item, argument, noArgumentCallback = false }, callback) {
  if (!argument || !this.activeEditor) return;
  let command = item.command;
  const noArgumentCommand = item.noArgumentCommand;
  if (argument === "none" && noArgumentCommand in this.activeEditor?.commands) {
    this.activeEditor.commands[noArgumentCommand]();
    if (typeof callback === "function" && noArgumentCallback) callback(argument);
    this.updateToolbarState();
    return;
  }
  if (command in this.activeEditor?.commands) {
    this.activeEditor.commands[command](argument);
    if (typeof callback === "function") callback(argument);
    this.updateToolbarState();
  }
};
const ICONS = {
  addRowBefore: plusIconSvg,
  addRowAfter: plusIconSvg,
  addColumnBefore: plusIconSvg,
  addColumnAfter: plusIconSvg,
  deleteRow: trashIconSvg,
  deleteColumn: trashIconSvg,
  deleteTable: trashIconSvg,
  deleteBorders: borderNoneIconSvg,
  mergeCells: arrowsToDotIconSvg,
  splitCell: arrowsLeftRightIconSvg,
  fixTables: wrenchIconSvg,
  ai: magicWandIcon,
  link: linkIconSvg,
  table: tableIconSvg,
  cut: scissorsIconSvg,
  copy: copyIconSvg,
  paste: pasteIconSvg,
  addDocumentSection: plusIconSvg,
  removeDocumentSection: trashIconSvg
};
const TEXTS = {
  addRowBefore: "Insert row above",
  addRowAfter: "Insert row below",
  addColumnBefore: "Insert column left",
  addColumnAfter: "Insert column right",
  deleteRow: "Delete row",
  deleteColumn: "Delete column",
  deleteTable: "Delete table",
  transparentBorders: "Transparent borders",
  mergeCells: "Merge cells",
  splitCell: "Split cell",
  fixTables: "Fix tables",
  insertText: "Insert text",
  replaceText: "Replace text",
  insertLink: "Insert link",
  insertTable: "Insert table",
  editTable: "Edit table",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  removeDocumentSection: "Remove section",
  createDocumentSection: "Create section"
};
const tableActionsOptions = [
  {
    label: TEXTS.addRowBefore,
    command: "addRowBefore",
    icon: ICONS.addRowBefore,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Add row before"
    }
  },
  {
    label: TEXTS.addRowAfter,
    command: "addRowAfter",
    icon: ICONS.addRowAfter,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Add row after"
    }
  },
  {
    label: TEXTS.addColumnBefore,
    command: "addColumnBefore",
    icon: ICONS.addColumnBefore,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Add column before"
    }
  },
  {
    label: TEXTS.addColumnAfter,
    command: "addColumnAfter",
    icon: ICONS.addColumnAfter,
    bottomBorder: true,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Add column after"
    }
  },
  {
    label: TEXTS.deleteRow,
    command: "deleteRow",
    icon: ICONS.deleteRow,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Delete row"
    }
  },
  {
    label: TEXTS.deleteColumn,
    command: "deleteColumn",
    icon: ICONS.deleteColumn,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Delete column"
    }
  },
  {
    label: TEXTS.deleteTable,
    command: "deleteTable",
    icon: ICONS.deleteTable,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Delete table"
    }
  },
  {
    label: TEXTS.transparentBorders,
    command: "deleteCellAndTableBorders",
    icon: ICONS.deleteBorders,
    bottomBorder: true,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Delete cell and table borders"
    }
  },
  {
    label: TEXTS.mergeCells,
    command: "mergeCells",
    icon: ICONS.mergeCells,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Merge cells"
    }
  },
  {
    label: TEXTS.splitCell,
    command: "splitCell",
    icon: ICONS.splitCell,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Split cells"
    }
  },
  {
    label: TEXTS.fixTables,
    command: "fixTables",
    icon: ICONS.fixTables,
    props: {
      "data-item": "btn-tableActions-option",
      ariaLabel: "Fix tables"
    }
  }
];
const TRIGGERS = {
  slash: "slash",
  click: "click"
};
const getPropsByItemId = (itemId, props) => {
  const editor = props.editor;
  const baseProps = {
    editor: markRaw(props.editor)
  };
  switch (itemId) {
    case "insert-text":
      const { state } = editor.view;
      const { from, to, empty } = state.selection;
      const selectedText = !empty ? state.doc.textBetween(from, to) : "";
      return {
        ...baseProps,
        selectedText,
        handleClose: props.closePopover || (() => null),
        apiKey: editor.options?.aiApiKey,
        endpoint: editor.options?.aiEndpoint
      };
    case "insert-link":
      return baseProps;
    case "insert-table":
      return {
        ...baseProps,
        onSelect: ({ rows, cols }) => {
          editor.commands.insertTable({ rows, cols });
          props.closePopover();
        }
      };
    case "edit-table":
      return {
        ...baseProps,
        options: tableActionsOptions,
        onSelect: ({ command }) => {
          if (editor.commands[command]) {
            editor.commands[command]();
          }
          props.closePopover();
        }
      };
    case "copy":
    case "paste":
      return {
        ...baseProps
        // These actions don't need additional props
      };
    default:
      return baseProps;
  }
};
async function getEditorContext(editor, event) {
  const { view } = editor;
  const { state } = view;
  const { from, to, empty } = state.selection;
  const selectedText = !empty ? state.doc.textBetween(from, to) : "";
  let pos = null;
  let node = null;
  if (event) {
    const coords = { left: event.clientX, top: event.clientY };
    pos = view.posAtCoords(coords)?.pos ?? null;
    node = pos !== null ? state.doc.nodeAt(pos) : null;
  } else {
    pos = from;
    node = state.doc.nodeAt(pos);
  }
  const clipboardContent = await readFromClipboard(state);
  return {
    editor,
    selectedText,
    pos,
    node,
    event,
    clipboardContent
  };
}
const onMarginClickCursorChange = (event, editor) => {
  const y = event.clientY;
  const x = event.clientX;
  const { view } = editor;
  const editorRect = view.dom.getBoundingClientRect();
  let coords = {
    left: 0,
    top: y
  };
  let isRightMargin = false;
  if (x > editorRect.right) {
    coords.left = editorRect.left + editorRect.width - 1;
    isRightMargin = true;
  } else if (x < editorRect.left) {
    coords.left = editorRect.left;
  }
  const pos = view.posAtCoords(coords)?.pos;
  if (pos) {
    let cursorPos = pos;
    if (isRightMargin) {
      const $pos = view.state.doc.resolve(pos);
      const charOffset = $pos.textOffset;
      const node = view.state.doc.nodeAt(pos);
      const text = node?.text;
      const charAtPos = text?.charAt(charOffset);
      cursorPos = node?.isText && charAtPos !== " " ? pos - 1 : pos;
    }
    const transaction = view.state.tr.setSelection(TextSelection$1.create(view.state.doc, cursorPos));
    view.dispatch(transaction);
    view.focus();
  }
};
const checkNodeSpecificClicks = (editor, event, popoverControls) => {
  if (!editor) return;
  if (selectionHasNodeOrMark(editor.view.state, "link", { requireEnds: true })) {
    popoverControls.component = LinkInput;
    popoverControls.position = {
      left: `${event.clientX - editor.element.getBoundingClientRect().left}px`,
      top: `${event.clientY - editor.element.getBoundingClientRect().top + 15}px`
    };
    popoverControls.props = {
      showInput: true
    };
    popoverControls.visible = true;
  }
};
function selectionHasNodeOrMark(state, name, options = {}) {
  const { requireEnds = false } = options;
  const $from = state.selection.$from;
  const $to = state.selection.$to;
  if (requireEnds) {
    for (let d2 = $from.depth; d2 > 0; d2--) {
      if ($from.node(d2).type.name === name) {
        return true;
      }
    }
    for (let d2 = $to.depth; d2 > 0; d2--) {
      if ($to.node(d2).type.name === name) {
        return true;
      }
    }
  } else {
    for (let d2 = $from.depth; d2 > 0; d2--) {
      if ($from.node(d2).type.name === name) {
        return true;
      }
    }
  }
  const markType = state.schema.marks[name];
  if (markType) {
    const { from, to, empty } = state.selection;
    if (requireEnds) {
      const fromMarks = markType.isInSet($from.marks());
      const toMarks = markType.isInSet($to.marks());
      if (fromMarks || toMarks) {
        return true;
      }
      if (empty && markType.isInSet(state.storedMarks || $from.marks())) {
        return true;
      }
    } else {
      if (empty) {
        if (markType.isInSet(state.storedMarks || $from.marks())) {
          return true;
        }
      } else {
        let hasMark = false;
        state.doc.nodesBetween(from, to, (node) => {
          if (markType.isInSet(node.marks)) {
            hasMark = true;
            return false;
          }
        });
        if (hasMark) return true;
      }
    }
  }
  return false;
}
function moveCursorToMouseEvent(event, editor) {
  const { view } = editor;
  const coords = { left: event.clientX, top: event.clientY };
  const pos = view.posAtCoords(coords)?.pos;
  if (typeof pos === "number") {
    const tr = view.state.tr.setSelection(TextSelection$1.create(view.state.doc, pos));
    view.dispatch(tr);
    view.focus();
  }
}
const isModuleEnabled = (editorOptions, moduleName) => {
  switch (moduleName) {
    case "ai":
      return !!editorOptions?.isAiEnabled;
    // Example for future use cases
    // case 'comments':
    // return !!editorOptions?.isCommentsEnabled;
    default:
      return true;
  }
};
function getItems(context) {
  const { editor, selectedText, trigger, clipboardContent } = context;
  const isInTable2 = selectionHasNodeOrMark(editor.view.state, "table", { requireEnds: true });
  const isInSectionNode = selectionHasNodeOrMark(editor.view.state, "documentSection", { requireEnds: true });
  const sections = [
    {
      id: "ai-content",
      items: [
        {
          id: "insert-text",
          label: selectedText ? TEXTS.replaceText : TEXTS.insertText,
          icon: ICONS.ai,
          component: AIWriter,
          action: (editor2) => {
            if (editor2?.commands && typeof editor2.commands?.insertAiMark === "function") {
              editor2.commands.insertAiMark();
            }
          },
          allowedTriggers: [TRIGGERS.slash, TRIGGERS.click],
          requiresModule: "ai"
        }
      ]
    },
    {
      id: "document-sections",
      items: [
        {
          id: "insert-document-section",
          label: TEXTS.createDocumentSection,
          icon: ICONS.addDocumentSection,
          action: (editor2) => {
            editor2.commands.createDocumentSection();
          },
          allowedTriggers: [TRIGGERS.click]
        },
        {
          id: "remove-section",
          label: TEXTS.removeDocumentSection,
          icon: ICONS.removeDocumentSection,
          action: (editor2) => {
            editor2.commands.removeSectionAtSelection();
          },
          allowedTriggers: [TRIGGERS.click],
          requiresSectionParent: true
        }
      ]
    },
    {
      id: "general",
      items: [
        {
          id: "insert-link",
          label: TEXTS.insertLink,
          icon: ICONS.link,
          component: LinkInput,
          allowedTriggers: [TRIGGERS.click]
        },
        {
          id: "insert-table",
          label: TEXTS.insertTable,
          icon: ICONS.table,
          component: TableGrid,
          allowedTriggers: [TRIGGERS.slash, TRIGGERS.click]
        },
        {
          id: "edit-table",
          label: TEXTS.editTable,
          icon: ICONS.table,
          component: TableActions,
          allowedTriggers: [TRIGGERS.slash, TRIGGERS.click],
          requiresTableParent: true
        }
      ]
    },
    {
      id: "clipboard",
      items: [
        {
          id: "cut",
          label: TEXTS.cut,
          icon: ICONS.cut,
          action: (editor2) => {
            editor2.view.focus();
            document.execCommand("cut");
          },
          allowedTriggers: [TRIGGERS.click],
          requiresSelection: true
        },
        {
          id: "copy",
          label: TEXTS.copy,
          icon: ICONS.copy,
          action: (editor2) => {
            editor2.view.focus();
            document.execCommand("copy");
          },
          allowedTriggers: [TRIGGERS.click],
          requiresSelection: true
        },
        {
          id: "paste",
          label: TEXTS.paste,
          icon: ICONS.paste,
          action: async (editor2) => {
            try {
              const clipboardItems = await navigator.clipboard.read();
              let html = "";
              let text = "";
              for (const item of clipboardItems) {
                if (!html && item.types.includes("text/html")) {
                  html = await (await item.getType("text/html")).text();
                }
                if (!text && item.types.includes("text/plain")) {
                  text = await (await item.getType("text/plain")).text();
                }
              }
              const handled = handleClipboardPaste({ editor: editor2, view: editor2.view }, html, text);
              if (!handled) {
                const dataTransfer = new DataTransfer();
                if (html) dataTransfer.setData("text/html", html);
                if (text) dataTransfer.setData("text/plain", text);
                const event = new ClipboardEvent("paste", {
                  clipboardData: dataTransfer,
                  bubbles: true,
                  cancelable: true
                });
                editor2.view.dom.dispatchEvent(event);
              }
            } catch (error) {
              console.warn("Failed to paste:", error);
            }
          },
          allowedTriggers: [TRIGGERS.click, TRIGGERS.slash],
          requiresClipboard: true
        }
      ]
    }
  ];
  const filteredSections = sections.map((section) => {
    const filteredItems = section.items.filter((item) => {
      if (item.requiresModule && !isModuleEnabled(editor?.options, item.requiresModule)) return false;
      if (item.requiresSelection && !selectedText) return false;
      if (!item.allowedTriggers.includes(trigger)) return false;
      if (item.requiresClipboard && !clipboardContent) return false;
      if (item.requiresTableParent && !isInTable2 || item.id === "insert-table" && isInTable2) return false;
      if (item.requiresSectionParent && !isInSectionNode) return false;
      return true;
    });
    return {
      ...section,
      items: filteredItems
    };
  }).filter((section) => section.items.length > 0);
  return filteredSections;
}
const _hoisted_1$3 = { class: "slash-menu-items" };
const _hoisted_2$1 = {
  key: 0,
  class: "slash-menu-divider",
  tabindex: "0"
};
const _hoisted_3$1 = ["onClick"];
const _hoisted_4 = ["innerHTML"];
const _sfc_main$5 = {
  __name: "SlashMenu",
  props: {
    editor: {
      type: Object,
      required: true
    },
    openPopover: {
      type: Function,
      required: true
    },
    closePopover: {
      type: Function,
      required: true
    }
  },
  setup(__props) {
    const props = __props;
    const searchInput = ref(null);
    const searchQuery = ref("");
    const isOpen = ref(false);
    const menuPosition = ref({ left: "0px", top: "0px" });
    const menuRef = ref(null);
    const sections = ref([]);
    const selectedId = ref(null);
    const handleEditorUpdate = () => {
      if (!props.editor?.isEditable && isOpen.value) {
        closeMenu({ restoreCursor: false });
      }
    };
    const flattenedItems = computed(() => {
      const items = [];
      sections.value.forEach((section) => {
        section.items.forEach((item) => {
          items.push(item);
        });
      });
      return items;
    });
    const filteredItems = computed(() => {
      if (!searchQuery.value) {
        return flattenedItems.value;
      }
      return flattenedItems.value.filter((item) => item.label?.toLowerCase().includes(searchQuery.value.toLowerCase()));
    });
    const filteredSections = computed(() => {
      if (!searchQuery.value) {
        return sections.value;
      }
      return [
        {
          id: "search-results",
          items: filteredItems.value
        }
      ];
    });
    watch(isOpen, (open) => {
      if (open) {
        nextTick(() => {
          if (searchInput.value) {
            searchInput.value.focus();
          }
        });
      }
    });
    watch(flattenedItems, (newItems) => {
      if (newItems.length > 0) {
        selectedId.value = newItems[0].id;
      }
    });
    const handleGlobalKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        props.editor?.view?.focus();
        return;
      }
      if (isOpen.value && (event.target === searchInput.value || menuRef.value && menuRef.value.contains(event.target))) {
        const currentItems = filteredItems.value;
        const currentIndex = currentItems.findIndex((item) => item.id === selectedId.value);
        switch (event.key) {
          case "ArrowDown": {
            event.preventDefault();
            if (currentIndex < currentItems.length - 1) {
              selectedId.value = currentItems[currentIndex + 1].id;
            }
            break;
          }
          case "ArrowUp": {
            event.preventDefault();
            if (currentIndex > 0) {
              selectedId.value = currentItems[currentIndex - 1].id;
            }
            break;
          }
          case "Enter": {
            event.preventDefault();
            const selectedItem = currentItems.find((item) => item.id === selectedId.value);
            if (selectedItem) {
              executeCommand(selectedItem);
            }
            break;
          }
        }
      }
    };
    const handleGlobalOutsideClick = (event) => {
      if (isOpen.value && menuRef.value && !menuRef.value.contains(event.target)) {
        moveCursorToMouseEvent(event, props.editor);
        closeMenu({ restoreCursor: false });
      }
    };
    const handleRightClick = async (event) => {
      const readOnly = !props.editor?.isEditable;
      const isHoldingCtrl = event.ctrlKey;
      if (readOnly || isHoldingCtrl) {
        return;
      }
      event.preventDefault();
      props.editor.view.dispatch(
        props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
          type: "open",
          pos: props.editor.view.state.selection.from,
          clientX: event.clientX,
          clientY: event.clientY
        })
      );
      searchQuery.value = "";
      const context = await getEditorContext(props.editor, event);
      sections.value = getItems({ ...context, trigger: "click" });
      selectedId.value = flattenedItems.value[0]?.id || null;
    };
    const executeCommand = async (item) => {
      if (props.editor) {
        item.action ? await item.action(props.editor) : null;
        if (item.component) {
          menuRef.value;
          const componentProps = getPropsByItemId(item.id, props);
          props.openPopover(markRaw(item.component), componentProps, {
            left: menuPosition.value.left,
            top: menuPosition.value.top
          });
          closeMenu({ restoreCursor: false });
        } else {
          const shouldRestoreCursor = item.id !== "paste";
          closeMenu({ restoreCursor: shouldRestoreCursor });
        }
      }
    };
    const closeMenu = (options = { restoreCursor: true }) => {
      if (props.editor?.view) {
        const pluginState = SlashMenuPluginKey.getState(props.editor.view.state);
        const { anchorPos } = pluginState;
        props.editor.view.dispatch(
          props.editor.view.state.tr.setMeta(SlashMenuPluginKey, {
            type: "close"
          })
        );
        if (options.restoreCursor && anchorPos !== null) {
          const tr = props.editor.view.state.tr.setSelection(
            props.editor.view.state.selection.constructor.near(props.editor.view.state.doc.resolve(anchorPos))
          );
          props.editor.view.dispatch(tr);
          props.editor.view.focus();
        }
        isOpen.value = false;
        searchQuery.value = "";
        sections.value = [];
      }
    };
    onMounted(() => {
      if (!props.editor) return;
      document.addEventListener("keydown", handleGlobalKeyDown);
      document.addEventListener("mousedown", handleGlobalOutsideClick);
      props.editor.on("update", handleEditorUpdate);
      props.editor.on("slashMenu:open", async (event) => {
        const readOnly = !props.editor?.isEditable;
        if (readOnly) return;
        isOpen.value = true;
        menuPosition.value = event.menuPosition;
        searchQuery.value = "";
        const context = await getEditorContext(props.editor);
        sections.value = getItems({ ...context, trigger: "slash" });
        selectedId.value = flattenedItems.value[0]?.id || null;
      });
      props.editor.view.dom.addEventListener("contextmenu", handleRightClick);
      props.editor.on("slashMenu:close", () => {
        isOpen.value = false;
        searchQuery.value = "";
      });
    });
    onBeforeUnmount(() => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      document.removeEventListener("mousedown", handleGlobalOutsideClick);
      if (props.editor) {
        try {
          props.editor.off("slashMenu:open");
          props.editor.off("slashMenu:close");
          props.editor.off("update", handleEditorUpdate);
          props.editor.view.dom.removeEventListener("contextmenu", handleRightClick);
        } catch (error) {
        }
      }
    });
    return (_ctx, _cache) => {
      return isOpen.value ? (openBlock(), createElementBlock("div", {
        key: 0,
        ref_key: "menuRef",
        ref: menuRef,
        class: "slash-menu",
        style: normalizeStyle(menuPosition.value),
        onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {
        }, ["stop"]))
      }, [
        withDirectives(createElementVNode("input", {
          ref_key: "searchInput",
          ref: searchInput,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => searchQuery.value = $event),
          type: "text",
          class: "slash-menu-hidden-input",
          onKeydown: [
            handleGlobalKeyDown,
            _cache[1] || (_cache[1] = withModifiers(() => {
            }, ["stop"]))
          ]
        }, null, 544), [
          [vModelText, searchQuery.value]
        ]),
        createElementVNode("div", _hoisted_1$3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(filteredSections.value, (section, sectionIndex) => {
            return openBlock(), createElementBlock(Fragment, {
              key: section.id
            }, [
              sectionIndex > 0 && section.items.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_2$1)) : createCommentVNode("", true),
              (openBlock(true), createElementBlock(Fragment, null, renderList(section.items, (item) => {
                return openBlock(), createElementBlock("div", {
                  key: item.id,
                  class: normalizeClass(["slash-menu-item", { "is-selected": item.id === selectedId.value }]),
                  onClick: ($event) => executeCommand(item)
                }, [
                  item.icon ? (openBlock(), createElementBlock("span", {
                    key: 0,
                    class: "slash-menu-item-icon",
                    innerHTML: item.icon
                  }, null, 8, _hoisted_4)) : createCommentVNode("", true),
                  createElementVNode("span", null, toDisplayString(item.label), 1)
                ], 10, _hoisted_3$1);
              }), 128))
            ], 64);
          }), 128))
        ])
      ], 36)) : createCommentVNode("", true);
    };
  }
};
function adjustPaginationBreaks(editorElem, editor) {
  if (!editorElem.value || !editor?.value?.options?.scale) return;
  const zoom = editor.value.options.scale;
  const bounds = editorElem.value.getBoundingClientRect();
  const breakNodes = editorElem.value.querySelectorAll(".pagination-break-wrapper");
  let firstLeft;
  breakNodes.forEach((node) => {
    const nodeBounds = node.getBoundingClientRect();
    const left = (nodeBounds.left - bounds.left) / zoom * -1 + 1;
    if (!firstLeft) firstLeft = left;
    if (left !== firstLeft) {
      const diff = left - firstLeft;
      node.style.transform = `translateX(${diff}px)`;
    }
  });
}
const _hoisted_1$2 = { class: "numbering" };
const MIN_WIDTH = 200;
const alignment = "flex-end";
const _sfc_main$4 = {
  __name: "Ruler",
  props: {
    orientation: {
      type: String,
      default: "horizontal"
    },
    length: {
      type: Number,
      default: 0
    },
    editor: {
      type: Object,
      required: true
    }
  },
  emits: ["margin-change"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const ruler = ref(null);
    const rulerDefinition = ref([]);
    const rulerHandleOriginalColor = ref("#CCCCCC");
    const rulerHandleActiveColor = ref("#2563EB66");
    const pageSize = ref(null);
    const pageMargins = ref(null);
    const isDragging = ref(false);
    const currentHandle = ref(null);
    const leftHandle = reactive({ side: "left", x: 0 });
    const rightHandle = reactive({ side: "right", x: 0 });
    const showVerticalIndicator = ref(false);
    const initialX = ref(0);
    let offsetX = 0;
    const initRuler = () => {
      if (props.editor.options.mode !== "docx") return;
      const rulerItems = [];
      const { pageMargins: docMargins, pageSize: docSize } = props.editor.getPageStyles();
      pageSize.value = docSize;
      pageMargins.value = docMargins;
      rightHandle.x = docSize.width * 96 - docMargins.right * 96;
      leftHandle.x = docMargins.left * 96;
      for (let i2 = 0; i2 < docSize.width; i2++) {
        const marginNum = 0.0625 * 96 - 0.5;
        const margin = `${marginNum}px`;
        const diff = docSize.width - i2;
        rulerItems.push(...generateSection(1, "main", "20%", margin, i2));
        rulerItems.push(...generateSection(3, "eighth", "10%", margin));
        rulerItems.push(...generateSection(1, "half", "40%", margin));
        if (diff <= 0.5) break;
        rulerItems.push(...generateSection(3, "eighth", "10%", margin));
      }
      return rulerItems;
    };
    const generateSection = (qty, size, height, margin, index) => {
      return Array.from({ length: qty }, (_, i2) => {
        const item = {
          className: `${size}-unit ruler-section`,
          height,
          margin
        };
        if (index !== void 0) item.numbering = index;
        return item;
      });
    };
    const getStyle = computed(() => (unit) => {
      return {
        width: "1px",
        minWidth: "1px",
        maxWidth: "1px",
        height: unit.height,
        backgroundColor: unit.color || "#666",
        marginLeft: unit.numbering === 0 ? null : unit.margin,
        marginRight: unit.margin
      };
    });
    const getHandlePosition = computed(() => (side) => {
      const handle = side === "left" ? leftHandle : rightHandle;
      return {
        left: `${handle.x}px`
      };
    });
    const getVerticalIndicatorStyle = computed(() => {
      if (!ruler.value) return;
      const parentElement = ruler.value.parentElement;
      const editor = parentElement.querySelector(".super-editor");
      const editorBounds = editor.getBoundingClientRect();
      return {
        left: `${currentHandle.value.x}px`,
        minHeight: `${editorBounds.height}px`
      };
    });
    const handleMouseDown = (event) => {
      isDragging.value = true;
      setRulerHandleActive();
      const itemId = event.currentTarget.id;
      currentHandle.value = itemId === "left-margin-handle" ? leftHandle : rightHandle;
      initialX.value = currentHandle.value.x;
      offsetX = event.clientX - currentHandle.value.x;
      showVerticalIndicator.value = true;
    };
    const handleMouseMove = (event) => {
      if (!isDragging.value) return;
      const newLeft = event.clientX - offsetX;
      currentHandle.value.x = newLeft;
      if (currentHandle.value.side === "left") {
        if (newLeft <= 0) {
          currentHandle.value.x = 0;
        } else if (newLeft >= rightHandle.x - MIN_WIDTH) {
          currentHandle.value.x = rightHandle.x - MIN_WIDTH;
        }
      } else {
        if (newLeft >= pageSize.value.width * 96) {
          currentHandle.value.x = pageSize.value.width * 96;
        } else if (newLeft <= leftHandle.x + MIN_WIDTH) {
          currentHandle.value.x = leftHandle.x + MIN_WIDTH;
        }
      }
    };
    const handleMouseUp = () => {
      isDragging.value = false;
      showVerticalIndicator.value = false;
      setRulerHandleInactive();
      if (currentHandle.value && currentHandle.value.x !== initialX.value) {
        const marginValue = getNewMarginValue();
        emit("margin-change", {
          side: currentHandle.value.side,
          value: marginValue
        });
      }
    };
    const setRulerHandleActive = () => {
      rulerHandleOriginalColor.value = rulerHandleActiveColor.value;
    };
    const setRulerHandleInactive = () => {
      rulerHandleOriginalColor.value = "#CCC";
    };
    const getNewMarginValue = () => {
      if (currentHandle.value.side === "left") return currentHandle.value.x / 96;
      else return (pageSize.value.width * 96 - currentHandle.value.x) / 96;
    };
    const getStyleVars = computed(() => {
      return {
        "--alignment": alignment,
        "--ruler-handle-color": rulerHandleOriginalColor.value,
        "--ruler-handle-active-color": rulerHandleActiveColor.value
      };
    });
    onMounted(() => {
      rulerDefinition.value = initRuler();
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    });
    onUnmounted(() => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "ruler",
        ref_key: "ruler",
        ref: ruler,
        style: normalizeStyle(getStyleVars.value)
      }, [
        createElementVNode("div", {
          class: "margin-handle handle-left",
          id: "left-margin-handle",
          onMousedown: handleMouseDown,
          style: normalizeStyle(getHandlePosition.value("left"))
        }, null, 36),
        createElementVNode("div", {
          class: "margin-handle handle-right",
          id: "right-margin-handle",
          onMousedown: handleMouseDown,
          style: normalizeStyle(getHandlePosition.value("right"))
        }, null, 36),
        showVerticalIndicator.value ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "vertical-indicator",
          style: normalizeStyle(getVerticalIndicatorStyle.value)
        }, null, 4)) : createCommentVNode("", true),
        (openBlock(true), createElementBlock(Fragment, null, renderList(rulerDefinition.value, (unit) => {
          return openBlock(), createElementBlock("div", {
            class: normalizeClass(unit.className),
            style: normalizeStyle(getStyle.value(unit))
          }, [
            createElementVNode("div", _hoisted_1$2, toDisplayString(unit.numbering), 1),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unit.elements, (half) => {
              return openBlock(), createElementBlock("div", {
                class: normalizeClass(half.className),
                style: normalizeStyle(getStyle.value(half))
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(half.elements, (quarter) => {
                  return openBlock(), createElementBlock("div", {
                    class: normalizeClass(quarter.className),
                    style: normalizeStyle(getStyle.value(quarter))
                  }, null, 6);
                }), 256))
              ], 6);
            }), 256))
          ], 6);
        }), 256))
      ], 4);
    };
  }
};
const Ruler = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-79f9a944"]]);
const _sfc_main$3 = {
  __name: "GenericPopover",
  props: {
    editor: { type: Object, required: true },
    styles: { type: Object, default: () => ({}) },
    visible: { type: Boolean, default: false },
    position: { type: Object, default: () => ({ left: "0px", top: "0px" }) }
  },
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const popover = ref(null);
    function handleClickOutside(event) {
      if (popover.value && !popover.value.contains(event.target)) {
        emit("close");
      }
      moveCursorToMouseEvent(event, props.editor);
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        emit("close");
      }
    }
    watch(
      () => props.visible,
      (val) => {
        if (val) {
          document.addEventListener("mousedown", handleClickOutside);
          document.addEventListener("keydown", handleEscape);
        } else {
          document.removeEventListener("mousedown", handleClickOutside);
          document.removeEventListener("keydown", handleEscape);
        }
      }
    );
    onMounted(() => {
      if (props.visible) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
      }
    });
    onBeforeUnmount(() => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    });
    const derivedStyles = computed(() => ({
      left: props.position.left,
      top: props.position.top,
      ...props.styles
    }));
    return (_ctx, _cache) => {
      return __props.visible ? (openBlock(), createElementBlock("div", {
        key: 0,
        class: "generic-popover",
        style: normalizeStyle(derivedStyles.value),
        ref_key: "popover",
        ref: popover,
        onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {
        }, ["stop"])),
        onClick: _cache[1] || (_cache[1] = withModifiers(() => {
        }, ["stop"]))
      }, [
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ], 36)) : createCommentVNode("", true);
    };
  }
};
const GenericPopover = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-cbddcc0f"]]);
const _hoisted_1$1 = { class: "super-editor-container" };
const _hoisted_2 = {
  key: 1,
  class: "placeholder-editor"
};
const _hoisted_3 = { class: "placeholder-title" };
const _sfc_main$2 = {
  __name: "SuperEditor",
  props: {
    documentId: {
      type: String,
      required: false
    },
    fileSource: {
      type: File,
      required: false
    },
    state: {
      type: Object,
      required: false,
      default: () => null
    },
    options: {
      type: Object,
      required: false,
      default: () => ({})
    }
  },
  emits: ["editor-ready", "editor-click", "editor-keydown", "comments-loaded", "selection-update"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const editorReady = ref(false);
    const editor = shallowRef(null);
    const editorWrapper = ref(null);
    const editorElem = ref(null);
    const popoverControls = reactive({
      visible: false,
      position: { left: "0px", top: "0px" },
      component: null,
      props: {}
    });
    const closePopover = () => {
      popoverControls.visible = false;
      popoverControls.component = null;
      popoverControls.props = {};
      editor.value.view.focus();
    };
    const openPopover = (component, props2, position) => {
      popoverControls.component = component;
      popoverControls.props = props2;
      popoverControls.position = position;
      popoverControls.visible = true;
    };
    let dataPollTimeout;
    const stopPolling = () => {
      clearTimeout(dataPollTimeout);
    };
    const pollForMetaMapData = (ydoc, retries = 10, interval = 500) => {
      const metaMap = ydoc.getMap("meta");
      const checkData = () => {
        const docx = metaMap.get("docx");
        if (docx) {
          stopPolling();
          initEditor({ content: docx });
        } else if (retries > 0) {
          console.debug(`Waiting for 'docx' data... retries left: ${retries}`);
          dataPollTimeout = setTimeout(checkData, interval);
          retries--;
        } else {
          console.warn("Failed to load docx data from meta map.");
        }
      };
      checkData();
    };
    const loadNewFileData = async () => {
      try {
        const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(props.fileSource);
        return { content: docx, media, mediaFiles, fonts };
      } catch (err) {
        console.debug("Error loading new file data:", err);
      }
    };
    const initializeData = async () => {
      if (props.fileSource) {
        const fileData = await loadNewFileData();
        return initEditor(fileData);
      } else if (props.options.ydoc && props.options.collaborationProvider) {
        delete props.options.content;
        const ydoc = props.options.ydoc;
        const provider = props.options.collaborationProvider;
        const handleSynced = () => {
          pollForMetaMapData(ydoc);
          provider.off("synced", handleSynced);
        };
        provider.on("synced", handleSynced);
      }
    };
    const getExtensions = () => {
      const extensions = getStarterExtensions();
      if (!props.options.pagination) {
        return extensions.filter((ext) => ext.name !== "pagination");
      }
      return extensions;
    };
    const initEditor = async ({ content, media = {}, mediaFiles = {}, fonts = {} } = {}) => {
      editor.value = new Editor({
        mode: "docx",
        element: editorElem.value,
        fileSource: props.fileSource,
        extensions: getExtensions(),
        externalExtensions: props.options.externalExtensions,
        documentId: props.documentId,
        content,
        media,
        mediaFiles,
        fonts,
        ...props.options
      });
      editor.value.on("paginationUpdate", () => {
        adjustPaginationBreaks(editorElem, editor);
      });
      editor.value.on("collaborationReady", () => {
        setTimeout(() => {
          editorReady.value = true;
        }, 150);
      });
    };
    const handleSuperEditorKeydown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.altKey && event.shiftKey) {
        if (event.code === "KeyM") {
          const toolbar = document.querySelector(".superdoc-toolbar");
          if (toolbar) {
            toolbar.setAttribute("tabindex", "0");
            toolbar.focus();
          }
        }
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        if (!editor.value) return;
        const view = editor.value.view;
        const { state } = view;
        const container = editorWrapper.value;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const cursorCoords = view.coordsAtPos(state.selection.head);
        const left = `${cursorCoords.left - containerRect.left}px`;
        const top = `${cursorCoords.bottom - containerRect.top + 6}px`;
        openPopover(markRaw(LinkInput), {}, { left, top });
      }
      emit("editor-keydown", { editor: editor.value });
    };
    const handleSuperEditorClick = (event) => {
      emit("editor-click", { editor: editor.value });
      let pmElement = editorElem.value?.querySelector(".ProseMirror");
      if (!pmElement || !editor.value) {
        return;
      }
      let isInsideEditor = pmElement.contains(event.target);
      if (!isInsideEditor && editor.value.isEditable) {
        editor.value.view?.focus();
      }
      if (isInsideEditor && editor.value.isEditable) {
        checkNodeSpecificClicks(editor.value, event, popoverControls);
      }
    };
    onMounted(() => {
      initializeData();
      if (props.options?.suppressSkeletonLoader || !props.options?.collaborationProvider) editorReady.value = true;
    });
    const handleMarginClick = (event) => {
      if (event.target.classList.contains("ProseMirror")) return;
      onMarginClickCursorChange(event, editor.value);
    };
    const handleMarginChange = ({ side, value }) => {
      if (!editor.value) return;
      const pageStyles = editor.value.getPageStyles();
      const { pageMargins } = pageStyles;
      const update = { ...pageMargins, [side]: value };
      editor.value?.updatePageStyle({ pageMargins: update });
    };
    onBeforeUnmount(() => {
      stopPolling();
      editor.value?.destroy();
      editor.value = null;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        __props.options.rulers && !!editor.value ? (openBlock(), createBlock(Ruler, {
          key: 0,
          class: "ruler",
          editor: editor.value,
          onMarginChange: handleMarginChange
        }, null, 8, ["editor"])) : createCommentVNode("", true),
        createElementVNode("div", {
          class: "super-editor",
          ref_key: "editorWrapper",
          ref: editorWrapper,
          onKeydown: handleSuperEditorKeydown,
          onClick: handleSuperEditorClick,
          onMousedown: handleMarginClick
        }, [
          createElementVNode("div", {
            ref_key: "editorElem",
            ref: editorElem,
            class: "editor-element super-editor__element",
            role: "presentation"
          }, null, 512),
          !props.options.disableContextMenu && editorReady.value && editor.value ? (openBlock(), createBlock(_sfc_main$5, {
            key: 0,
            editor: editor.value,
            popoverControls,
            openPopover,
            closePopover
          }, null, 8, ["editor", "popoverControls"])) : createCommentVNode("", true)
        ], 544),
        !editorReady.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
          createElementVNode("div", _hoisted_3, [
            createVNode(unref(NSkeleton), {
              text: "",
              style: { "width": "60%" }
            })
          ]),
          createVNode(unref(NSkeleton), {
            text: "",
            repeat: 6
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            style: { "width": "60%" }
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            repeat: 6,
            style: { "width": "30%", "display": "block", "margin": "20px" }
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            style: { "width": "60%" }
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            repeat: 5
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            style: { "width": "30%" }
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            style: { "margin-top": "50px" }
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            repeat: 6
          }),
          createVNode(unref(NSkeleton), {
            text: "",
            style: { "width": "70%" }
          })
        ])) : createCommentVNode("", true),
        editor.value ? (openBlock(), createBlock(GenericPopover, {
          key: 2,
          editor: editor.value,
          visible: popoverControls.visible,
          position: popoverControls.position,
          onClose: closePopover
        }, {
          default: withCtx(() => [
            (openBlock(), createBlock(resolveDynamicComponent(popoverControls.component), normalizeProps(guardReactiveProps({ ...popoverControls.props, editor: editor.value, closePopover })), null, 16))
          ]),
          _: 1
        }, 8, ["editor", "visible", "position"])) : createCommentVNode("", true)
      ]);
    };
  }
};
const SuperEditor = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-2252f46b"]]);
const _sfc_main$1 = {
  __name: "BasicUpload",
  emits: ["file-change"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const onFileChange = (event) => {
      emit("file-change", event.target.files[0]);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", null, [
        createElementVNode("input", {
          type: "file",
          id: "fileInput",
          onChange: onFileChange,
          accept: ".docx"
        }, null, 32)
      ]);
    };
  }
};
const _hoisted_1 = ["innerHTML"];
const _sfc_main = {
  __name: "SuperInput",
  props: {
    modelValue: {
      type: String
    },
    placeholder: {
      type: String,
      required: false,
      default: "Type something..."
    },
    options: {
      type: Object,
      required: false,
      default: () => ({})
    },
    users: {
      type: Array,
      required: false,
      default: () => []
    }
  },
  emits: ["update:modelValue", "focus", "blur"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const editor = shallowRef();
    const editorElem = ref(null);
    const isFocused = ref(false);
    const onTransaction = ({ editor: editor2, transaction }) => {
      const contents = editor2.getHTML();
      emit("update:modelValue", contents);
    };
    const onFocus = ({ editor: editor2, transaction }) => {
      isFocused.value = true;
      updateUsersState();
      emit("focus", { editor: editor2, transaction });
    };
    const onBlur = ({ editor: editor2, transaction }) => {
      isFocused.value = false;
      emit("blur", { editor: editor2, transaction });
    };
    const initEditor = async () => {
      Placeholder.options.placeholder = props.placeholder || "Type something...";
      props.options.onTransaction = onTransaction;
      props.options.onFocus = onFocus;
      props.options.onBlur = onBlur;
      editor.value = new Editor({
        mode: "text",
        content: document.getElementById("currentContent"),
        element: editorElem.value,
        extensions: getRichTextExtensions(),
        users: props.users,
        ...props.options
      });
    };
    const handleFocus = () => {
      isFocused.value = true;
      editor.value?.view?.focus();
    };
    const updateUsersState = () => {
      editor.value?.setOptions({ users: props.users });
    };
    onMounted(() => {
      initEditor();
    });
    onBeforeUnmount(() => {
      editor.value?.destroy();
      editor.value = null;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["super-editor super-input", { "super-input-active": isFocused.value }]),
        onClick: withModifiers(handleFocus, ["stop", "prevent"])
      }, [
        createElementVNode("div", {
          id: "currentContent",
          style: { "display": "none" },
          innerHTML: __props.modelValue
        }, null, 8, _hoisted_1),
        createElementVNode("div", {
          ref_key: "editorElem",
          ref: editorElem,
          class: "editor-element super-editor__element"
        }, null, 512)
      ], 2);
    };
  }
};
const SuperInput = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4d5cff52"]]);
const Extensions = {
  Node,
  Attribute,
  Extension,
  Plugin,
  Mark
};
export {
  AIWriter,
  k as AnnotatorHelpers,
  _sfc_main$1 as BasicUpload,
  C as CommentsPluginKey,
  D as DocxZipper,
  Editor,
  Extensions,
  ar as SectionHelpers,
  _sfc_main$5 as SlashMenu,
  a4 as SuperConverter,
  SuperEditor,
  SuperInput,
  SuperToolbar,
  Toolbar,
  T as TrackChangesBasePluginKey,
  createZip,
  i as fieldAnnotationHelpers,
  getActiveFormatting,
  l as getAllowedImageDimensions,
  d as getMarksFromSelection,
  getRichTextExtensions,
  getStarterExtensions,
  a1 as helpers,
  j as trackChangesHelpers
};
