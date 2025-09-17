import { ref, onMounted, onUnmounted, computed, createElementBlock, openBlock, withModifiers, createElementVNode, withDirectives, unref, vModelText, createCommentVNode, nextTick } from "vue";
import { T as TextSelection } from "./chunks/converter-DP1ZH-FY.js";
import { _ as _export_sfc } from "./chunks/editor-mlXVnPsL.js";
const DEFAULT_API_ENDPOINT = "https://sd-dev-express-gateway-i6xtm.ondigitalocean.app/insights";
const SYSTEM_PROMPT = "You are an expert copywriter and you are immersed in a document editor. You are to provide document related text responses based on the user prompts. Only write what is asked for. Do not provide explanations. Try to keep placeholders as short as possible. Do not output your prompt. Your instructions are: ";
async function baseInsightsFetch(payload, options = {}) {
  const apiKey = options.apiKey;
  const apiEndpoint = options.endpoint || DEFAULT_API_ENDPOINT;
  try {
    const headers = {
      "Content-Type": "application/json"
    };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Harbour API error: ${response.status} - ${errorText}`);
    }
    return response;
  } catch (error) {
    console.error("Error calling Harbour API:", error);
    throw error;
  }
}
async function processStream(stream, onChunk, onDone) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (typeof onDone === "function") {
          onDone();
        }
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      if (typeof onChunk === "function") {
        onChunk(chunk);
      }
    }
    let extractedValue = getJsonBetweenFencesFromResponse(buffer);
    if (extractedValue !== null) {
      result = extractedValue;
    }
    return result || "";
  } catch (error) {
    console.error("Error reading stream:", error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
function getJsonBetweenFencesFromResponse(buffer) {
  try {
    const jsonRegex = /```json\s*\n([\s\S]*?)\n\s*```/;
    const match = buffer.match(jsonRegex);
    if (match && match[1]) {
      const jsonObj = JSON.parse(match[1]);
      if (jsonObj.custom_prompt && jsonObj.custom_prompt.value !== void 0) {
        return jsonObj.custom_prompt.value || "";
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}
async function writeStreaming(prompt, options = {}, onChunk, onDone) {
  if (!prompt) {
    throw new Error("Prompt is required for text generation");
  }
  const payload = {
    stream: true,
    context: SYSTEM_PROMPT,
    doc_text: "",
    insights: [
      {
        type: "custom_prompt",
        name: "text_generation",
        message: `Generate text based on the following prompt: ${prompt}`
      }
    ]
  };
  if (options.documentXml) {
    payload.document_content = options.documentXml;
  }
  const response = await baseInsightsFetch(payload, options.config || {});
  if (!response.body) return "";
  return await processStream(response.body, onChunk, onDone);
}
async function rewriteStreaming(text, prompt = "", options = {}, onChunk, onDone) {
  if (!text) {
    throw new Error("Text is required for rewriting");
  }
  const payload = {
    stream: true,
    context: SYSTEM_PROMPT,
    insights: [
      {
        type: "custom_prompt",
        name: "text_rewrite",
        message: `Rewrite the following text: "${text}" using these instructions: ${prompt}`
      }
    ]
  };
  const response = await baseInsightsFetch(payload, options.config || {});
  if (!response.body) return "";
  return await processStream(response.body, onChunk, onDone);
}
const formatRegistry = {
  rules: [
    {
      name: "bold",
      pattern: /\*\*(.*?)\*\*/g,
      transform: (_match, content, _editor) => ({
        type: "text",
        marks: [{ type: "bold" }],
        text: content
      })
    },
    {
      name: "italic",
      pattern: /\*(.*?)\*/g,
      transform: (_match, content, _editor) => ({
        type: "text",
        marks: [{ type: "italic" }],
        text: content
      })
    },
    {
      name: "underline",
      pattern: /<(?:u|ins)>(.*?)<\/(?:u|ins)>/g,
      transform: (_match, content, _editor) => ({
        type: "text",
        marks: [{ type: "underline" }],
        text: content
      })
    }
  ]
};
function formatDocument(editor) {
  try {
    let doc = editor.state.doc;
    const docText = doc.textContent || "";
    if (!docText) return;
    formatRegistry.rules.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      const matches = [];
      let match;
      while ((match = rule.pattern.exec(docText)) !== null) {
        matches.push({
          rule,
          startPos: match.index,
          endPos: match.index + match[0].length,
          originalText: match[0],
          contentText: match[1]
        });
      }
      matches.sort((a, b) => b.startPos - a.startPos);
      for (const match2 of matches) {
        const { startPos, endPos, originalText, contentText } = match2;
        try {
          let tr = editor.state.tr;
          const replacement = rule.transform(originalText, contentText, editor);
          const nodesInRange = [];
          doc.nodesBetween(startPos, Math.min(endPos, doc.content.size), (node, pos) => {
            if (node.isText) {
              nodesInRange.push({ node, pos });
            }
            return true;
          });
          if (nodesInRange.length > 0) {
            let foundExactMatch = false;
            let actualStartPos = -1;
            let actualEndPos = -1;
            for (let i = 0; i < nodesInRange.length; i++) {
              const nodeInfo = nodesInRange[i];
              const nodeText = nodeInfo.node.text || "";
              const nodePos = nodeInfo.pos;
              if (nodeText.includes(originalText)) {
                const nodeMatchIndex = nodeText.indexOf(originalText);
                actualStartPos = nodePos + nodeMatchIndex;
                actualEndPos = actualStartPos + originalText.length;
                foundExactMatch = true;
                break;
              }
            }
            if (!foundExactMatch) {
              let combinedText = "";
              let offsets = [];
              let basePos = nodesInRange[0].pos;
              for (const nodeInfo of nodesInRange) {
                const nodeText = nodeInfo.node.text || "";
                const relativePos = nodeInfo.pos - basePos;
                for (let i = 0; i < nodeText.length; i++) {
                  offsets.push(relativePos + i);
                }
                combinedText += nodeText;
              }
              const matchIndex = combinedText.indexOf(originalText);
              if (matchIndex >= 0) {
                actualStartPos = basePos + offsets[matchIndex];
                const endIndex = matchIndex + originalText.length - 1;
                actualEndPos = basePos + (offsets[endIndex] || 0) + 1;
                foundExactMatch = true;
              }
            }
            if (foundExactMatch) {
              const marks = replacement.marks ? replacement.marks.map((mark) => editor.schema.marks[mark.type].create(mark.attrs)) : [];
              tr = tr.delete(actualStartPos, actualEndPos);
              tr = tr.insert(actualStartPos, editor.schema.text(replacement.text, marks));
              if (tr.docChanged) {
                editor.view.dispatch(tr);
                doc = editor.state.doc;
              }
            }
          }
        } catch (error) {
          console.error("Error processing match:", error);
        }
      }
    });
  } catch (error) {
    console.error("Error formatting document:", error);
  }
}
const edit = '<!-- @note: includes color gradient for inline svg AI Writer -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->\n    <linearGradient id="gradient" x1="125%" y1="50%" x2="-25%" y2="50%">\n        <stop offset="-20%" stop-color="rgba(218, 215, 118, 0.5)" />\n        <stop offset="30%" stop-color="rgb(191, 100, 100)" />\n        <stop offset="60%" stop-color="rgb(77, 82, 217)" />\n        <stop offset="150%" stop-color="rgb(255, 219, 102)" />\n    </linearGradient>\n    <path fill="url(#gradient)" d="M402.3 344.9l32-32c5-5 13.7-1.5 13.7 5.7V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V112c0-26.5 21.5-48 48-48h273.5c7.1 0 10.7 8.6 5.7 13.7l-32 32c-1.5 1.5-3.5 2.3-5.7 2.3H48v352h352V350.5c0-2.1 .8-4.1 2.3-5.6zm156.6-201.8L296.3 405.7l-90.4 10c-26.2 2.9-48.5-19.2-45.6-45.6l10-90.4L432.9 17.1c22.9-22.9 59.9-22.9 82.7 0l43.2 43.2c22.9 22.9 22.9 60 .1 82.8zM460.1 174L402 115.9 216.2 301.8l-7.3 65.3 65.3-7.3L460.1 174zm64.8-79.7l-43.2-43.2c-4.1-4.1-10.8-4.1-14.8 0L436 82l58.1 58.1 30.9-30.9c4-4.2 4-10.8-.1-14.9z"/>\n</svg>';
const paperPlane = '<!-- @note: includes color gradient for inline svg AI Writer -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->\n  <defs>\n    <linearGradient id="gradient" x1="125%" y1="50%" x2="-25%" y2="50%">\n      <stop offset="-20%" stop-color="rgba(218, 215, 118, 0.5)" />\n      <stop offset="30%" stop-color="rgb(191, 100, 100)" />\n      <stop offset="60%" stop-color="rgb(77, 82, 217)" />\n      <stop offset="150%" stop-color="rgb(255, 219, 102)" />\n    </linearGradient>\n  </defs>\n  <path fill="url(#gradient)" d="M440 6.5L24 246.4c-34.4 19.9-31.1 70.8 5.7 85.9L144 379.6V464c0 46.4 59.2 65.5 86.6 28.6l43.8-59.1 111.9 46.2c5.9 2.4 12.1 3.6 18.3 3.6 8.2 0 16.3-2.1 23.6-6.2 12.8-7.2 21.6-20 23.9-34.5l59.4-387.2c6.1-40.1-36.9-68.8-71.5-48.9zM192 464v-64.6l36.6 15.1L192 464zm212.6-28.7l-153.8-63.5L391 169.5c10.7-15.5-9.5-33.5-23.7-21.2L155.8 332.6 48 288 464 48l-59.4 387.3z"/>\n</svg>';
const _hoisted_1 = { class: "ai-user-input-field" };
const _hoisted_2 = ["innerHTML"];
const _hoisted_3 = ["placeholder"];
const _hoisted_4 = { class: "ai-loader" };
const _hoisted_5 = ["innerHTML"];
const _sfc_main = {
  __name: "AIWriter",
  props: {
    selectedText: {
      type: String,
      required: true
    },
    handleClose: {
      type: Function,
      required: true
    },
    editor: {
      type: Object,
      required: true
    },
    apiKey: {
      type: String
    },
    endpoint: {
      type: String,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const selectionState = ref(null);
    const aiWriterRef = ref(null);
    const handleClickOutside = (event) => {
      if (aiWriterRef.value && !aiWriterRef.value.contains(event.target)) {
        if (!isLoading.value) {
          props.editor.commands.removeAiMark();
        }
        props.handleClose();
      }
    };
    const editableRef = ref(null);
    const saveSelection = () => {
      if (props.selectedText) {
        selectionState.value = {
          ...props.editor.state.selection,
          from: props.editor.state.selection.from,
          to: props.editor.state.selection.to
        };
        props.editor.commands.setMeta("storedSelection", selectionState.value);
        props.editor.commands.insertAiMark();
      }
    };
    const focusTextarea = () => {
      setTimeout(() => {
        nextTick(() => {
          if (editableRef.value) {
            editableRef.value.focus();
          }
        });
      }, 0);
    };
    const addEventListeners = () => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleCaptureKeyDown, true);
    };
    const removeEventListeners = () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleCaptureKeyDown, true);
    };
    onMounted(() => {
      saveSelection();
      focusTextarea();
      addEventListeners();
    });
    onUnmounted(() => {
      if (!isLoading.value) {
        props.editor.commands.removeAiMark();
      }
      removeEventListeners();
    });
    const handleCaptureKeyDown = (event) => {
      if (editableRef.value && event.target === editableRef.value && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.stopPropagation();
      }
    };
    const placeholderText = computed(
      () => props.selectedText ? "Insert prompt to update text" : "Insert prompt to generate text"
    );
    const isLoading = ref(false);
    const isError = ref("");
    const promptText = ref("");
    const textProcessingStarted = ref(false);
    const previousText = ref("");
    const isFormatting = ref(false);
    const pendingFormatting = ref(false);
    const isInSuggestingMode = computed(() => {
      return props.editor.isInSuggestingMode?.() || false;
    });
    const getDocumentXml = () => {
      try {
        return props.editor.state.doc.textContent || "";
      } catch (error) {
        console.error("Error getting document XML:", error);
        return "";
      }
    };
    const handleTextChunk = async (text) => {
      try {
        props.editor.commands.removeAiNode("aiLoaderNode");
        if (props.selectedText && !textProcessingStarted.value) {
          props.editor.commands.removeAiMark();
          props.editor.commands.clearAiHighlightStyle();
          if (selectionState.value) {
            const { state } = props.editor;
            const { from, to } = selectionState.value;
            const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
            props.editor.view.dispatch(tr);
          } else {
            console.warn("[AIWriter] No stored selection to restore");
          }
          props.editor.commands.deleteSelection();
          textProcessingStarted.value = true;
        }
        if (text === null || text === void 0 || text === "") {
          return;
        }
        const textStr = String(text);
        const wrappedContent = {
          type: "text",
          marks: [
            {
              type: "aiAnimationMark",
              attrs: {
                class: "sd-ai-text-appear",
                dataMarkId: `ai-animation-${Date.now()}`
              }
            }
          ],
          text: textStr
        };
        props.editor.commands.insertContent(wrappedContent);
        pendingFormatting.value = true;
        if (!isFormatting.value) {
          await runSafeFormat();
        }
        props.handleClose();
      } catch (error) {
        console.error("Error handling text chunk:", error);
      }
    };
    const runSafeFormat = async () => {
      if (isFormatting.value) return;
      try {
        isFormatting.value = true;
        pendingFormatting.value = false;
        await nextTick();
        formatDocument(props.editor);
        if (pendingFormatting.value) {
          pendingFormatting.value = false;
          await runSafeFormat();
        }
      } finally {
        isFormatting.value = false;
      }
    };
    const handleDone = async () => {
      if (pendingFormatting.value || isFormatting.value) {
        pendingFormatting.value = true;
        await new Promise((resolve) => {
          const checkFormatting = () => {
            if (!isFormatting.value && !pendingFormatting.value) {
              resolve();
            } else {
              setTimeout(checkFormatting, 100);
            }
          };
          checkFormatting();
        });
      }
      await runSafeFormat();
      setTimeout(() => {
        props.editor.commands.removeAiMark("aiAnimationMark");
        props.editor.commands.removeAiMark();
      }, 1e3);
    };
    const handleSubmit = async () => {
      isError.value = "";
      textProcessingStarted.value = false;
      previousText.value = "";
      isLoading.value = true;
      try {
        props.handleClose();
        if (props.selectedText) {
          props.editor.commands.updateAiHighlightStyle("sd-ai-highlight-pulse");
          props.editor.commands.removeSelectionAfterAiPulse();
        } else {
          props.editor.commands.insertContent({
            type: "aiLoaderNode"
          });
        }
        if (isInSuggestingMode.value) {
          props.editor.commands.enableTrackChanges();
        }
        const documentXml = getDocumentXml();
        const options = {
          // @todo: implement grabbing document text
          docText: "",
          documentXml,
          config: {
            // Pass the aiApiKey to the AI helper functions
            apiKey: props.apiKey,
            endpoint: props.endpoint
          }
        };
        if (props.selectedText) {
          await rewriteStreaming(props.selectedText, promptText.value, options, handleTextChunk, handleDone);
        } else {
          await writeStreaming(promptText.value, options, handleTextChunk, handleDone);
        }
      } catch (error) {
        console.error("AI generation error:", error);
        isError.value = error.message || "An error occurred";
      } finally {
        promptText.value = "";
        if (isInSuggestingMode.value) {
          props.editor.commands.disableTrackChanges();
        }
        isLoading.value = false;
        textProcessingStarted.value = false;
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    };
    const handleInput = (event) => {
      if (isError.value) {
        isError.value = "";
      }
      promptText.value = event.target.value;
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "ai-writer prosemirror-isolated",
        ref_key: "aiWriterRef",
        ref: aiWriterRef,
        onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {
        }, ["stop"]))
      }, [
        createElementVNode("div", _hoisted_1, [
          createElementVNode("span", {
            class: "ai-textarea-icon",
            innerHTML: unref(edit)
          }, null, 8, _hoisted_2),
          withDirectives(createElementVNode("textarea", {
            ref_key: "editableRef",
            ref: editableRef,
            class: "ai-textarea",
            placeholder: placeholderText.value,
            onKeydown: handleKeyDown,
            onInput: handleInput,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => promptText.value = $event),
            rows: "4"
          }, null, 40, _hoisted_3), [
            [vModelText, promptText.value]
          ])
        ]),
        createElementVNode("div", _hoisted_4, [
          promptText.value ? (openBlock(), createElementBlock("span", {
            key: 0,
            class: "ai-textarea-icon ai-submit-button",
            onClick: withModifiers(handleSubmit, ["stop"]),
            innerHTML: unref(paperPlane)
          }, null, 8, _hoisted_5)) : createCommentVNode("", true)
        ])
      ], 544);
    };
  }
};
const AIWriter = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e8e0f607"]]);
export {
  AIWriter as default
};
