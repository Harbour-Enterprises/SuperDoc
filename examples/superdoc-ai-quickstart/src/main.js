import { SuperDoc } from 'superdoc';
import { AIActions } from '@superdoc-dev/ai';
import 'superdoc/style.css';
import './style.css';

const statusText = document.getElementById('statusText');
const insertTrackedChangeButton = document.getElementById('insertTrackedChange');
const insertCommentButton = document.getElementById('insertComment');
const rewriteIntroButton = document.getElementById('rewriteIntro');
const highlightClauseButton = document.getElementById('highlightClause');
const addClauseButton = document.getElementById('addClause');
const findContractDatesButton = document.getElementById('findContractDates');
const configButtons = Array.from(document.querySelectorAll('[data-config-target]'));
const promptPanels = new Map();

function resetConfigButtonState() {
  configButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
}

function setConfigButtonExpanded(actionId, expanded) {
  configButtons.forEach((button) => {
    if (button.dataset.configTarget === actionId) {
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  });
}

resetConfigButtonState();

const allButtons = [
  insertTrackedChangeButton,
  insertCommentButton,
  rewriteIntroButton,
  highlightClauseButton,
  addClauseButton,
  findContractDatesButton,
].filter((button) => button instanceof HTMLButtonElement);

let aiInstance = null;
let superdocInstance = null;

const headerPrimary = document.querySelector('.page-header > div:first-child');
const uploadControls = document.createElement('div');
uploadControls.style.display = 'flex';
uploadControls.style.flexWrap = 'wrap';
uploadControls.style.alignItems = 'center';
uploadControls.style.gap = '0.75rem';
uploadControls.style.marginTop = '0.75rem';

const uploadButton = document.createElement('button');
uploadButton.type = 'button';
uploadButton.textContent = 'Upload document';
uploadButton.setAttribute('aria-label', 'Upload a DOCX, PDF, HTML, or text document');
uploadButton.style.padding = '0.65rem 1.25rem';
uploadButton.style.borderRadius = '999px';
uploadButton.style.border = 'none';
uploadButton.style.background = '#2563eb';
uploadButton.style.color = '#fff';
uploadButton.style.fontWeight = '600';
uploadButton.style.cursor = 'pointer';

const uploadLabel = document.createElement('span');
uploadLabel.textContent = 'No document uploaded yet.';
uploadLabel.style.fontSize = '0.9rem';
uploadLabel.style.color = '#475569';

const uploadInput = document.createElement('input');
uploadInput.type = 'file';
uploadInput.accept = '.docx,.doc,.pdf,.html,.htm,.txt,.md,.markdown,.rtf';
uploadInput.style.display = 'none';

uploadButton.addEventListener('click', () => uploadInput.click());

uploadInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  uploadLabel.textContent = `Loading "${file.name}"...`;
  createSuperdoc(file);
  uploadInput.value = '';
});

uploadControls.append(uploadButton, uploadLabel, uploadInput);
headerPrimary?.append(uploadControls);

function setButtonsEnabled(enabled) {
  allButtons.forEach((button) => {
    button.disabled = !enabled;
    const chipMain = button.closest('.action-chip__main');
    chipMain?.classList.toggle('is-disabled', !enabled);
  });
}

function handleAction(button, action) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.addEventListener('click', async () => {
    if (!aiInstance) {
      statusText.textContent = 'AI is not ready yet. Add your API key and reload.';
      return;
    }

    setButtonsEnabled(false);

    try {
      await aiInstance.waitUntilReady();
      await action(aiInstance);
    } catch (error) {
      console.error(error);
      statusText.textContent = `AI error: ${error.message}`;
    } finally {
      setButtonsEnabled(true);
    }
  });
}

let editingActionId = null;

function openPromptEditor(actionId) {
  closeAllPromptEditors();
  editingActionId = actionId;
  const entry = promptPanels.get(actionId);
  const panel = entry?.panel;
  const textarea = entry?.textarea;

  if (!panel) {
    editingActionId = null;
    return;
  }

  panel.hidden = false;
  setConfigButtonExpanded(actionId, true);

  panel.classList.add('is-visible');
  panel.setAttribute('aria-hidden', 'false');

  if (textarea) {
    textarea.value = actionPrompts[actionId] ?? '';
    requestAnimationFrame(() => {
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    });
  }
}

function closePromptEditor(actionId = editingActionId) {
  if (!actionId) {
    editingActionId = null;
    return;
  }

  const entry = promptPanels.get(actionId);
  if (!entry?.panel) {
    editingActionId = null;
    return;
  }

  setConfigButtonExpanded(actionId, false);
  entry.panel.hidden = true;
  entry.panel.classList.remove('is-visible');
  entry.panel.setAttribute('aria-hidden', 'true');
  editingActionId = null;
}

function closeAllPromptEditors() {
  promptPanels.forEach(({panel}) => {
    if (panel) {
      panel.hidden = true;
      panel.classList.remove('is-visible');
      panel.setAttribute('aria-hidden', 'true');
    }
  });
  editingActionId = null;
  resetConfigButtonState();
}

function initializeAI(superdoc) {
  if (aiInstance) {
    return aiInstance;
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    statusText.textContent =
      'Add VITE_OPENAI_API_KEY to .env then restart the dev server to enable AI actions.';
    return null;
  }

  statusText.textContent = 'Connecting to OpenAI...';
  setButtonsEnabled(false);

  aiInstance = new AIActions(superdoc, {
    user: {
      displayName: 'SuperDoc AI Assistant',
      userId: 'ai-demo',
      // profileUrl: 'your bot url',
    },
    streamResults: false,
    provider: {
      type: 'openai',
      apiKey,
      model
    },
    enableLogging: false,
    onReady: () => {
      statusText.textContent = 'AI is ready. Try one of the quick actions.';
      setButtonsEnabled(true);
    },
    onStreamingStart: () => {
      statusText.textContent = 'AI is thinking...';
    },
    onStreamingEnd: () => {
      statusText.textContent = 'AI finished. Ready for the next action.';
    },
    onError: (error) => {
      console.error(error);
      statusText.textContent = `AI error: ${error.message}`;
      setButtonsEnabled(false);
    }
  });

  aiInstance.waitUntilReady().catch((error) => {
    console.error(error);
    statusText.textContent = `AI failed to initialize: ${error.message}`;
  });

  return aiInstance;
}

function createSuperdoc(documentFile = null) {
  const documentName = documentFile?.name ?? '';
  if (documentName) {
    statusText.textContent = `Loading "${documentName}"...`;
  } else if (!superdocInstance) {
    statusText.textContent = 'Preparing SuperDoc editor...';
  } else {
    statusText.textContent = 'Resetting editor...';
  }

  aiInstance = null;
  setButtonsEnabled(false);

  if (superdocInstance) {
    superdocInstance.destroy();
  }

  const baseConfig = {
    selector: '#superdoc',
    documentMode: 'editing',
    pagination: true,
    rulers: true,
    toolbar: '#superdoc-toolbar',
    ...(documentFile ? { document: documentFile } : {})
  };

  let nextSuperdoc = null;
  nextSuperdoc = new SuperDoc({
    ...baseConfig,
    onEditorCreate: () => {
      if (documentName) {
        uploadLabel.textContent = `Loaded "${documentName}"`;
        statusText.textContent = `Loaded "${documentName}". Initializing AI...`;
      } else {
        uploadLabel.textContent = 'Using a blank canvas. Upload a document to replace it.';
        statusText.textContent = 'SuperDoc is ready. Initializing AI...';
      }

      initializeAI(nextSuperdoc);
    }
  });
  superdocInstance = nextSuperdoc;
  return nextSuperdoc;
}

const actionConfigs = [
  {
    id: 'insertTrackedChange',
    label: 'Insert AI tracked change',
    button: insertTrackedChangeButton,
    prompt:
      'Propose a tracked change that clarifies the rollout responsibilities in the opening section.',
    runner: (ai, prompt) => ai.action.insertTrackedChanges(prompt),
  },
  {
    id: 'insertComment',
    label: 'Insert AI comment',
    button: insertCommentButton,
    prompt: 'Ask reviewers to confirm the next milestones and flag any blockers.',
    runner: (ai, prompt) => ai.action.insertComment(prompt),
  },
  {
    id: 'rewriteIntro',
    label: 'Rewrite intro paragraph',
    button: rewriteIntroButton,
    prompt: 'Rewrite the first paragraph so it reads like the introduction of a formal partnership agreement.',
    runner: (ai, prompt) => ai.action.replace(prompt),
  },
  {
    id: 'highlightClause',
    label: 'Find and highlight clause',
    button: highlightClauseButton,
    prompt: 'Find the clause that discusses customer rights after launch.',
    runner: (ai, prompt) => ai.action.highlight(prompt),
  },
  {
    id: 'addClause',
    label: 'Add new clause',
    button: addClauseButton,
    prompt: 'Add a new clause that defines who owns post-launch support and success tracking.',
    runner: (ai, prompt) => ai.action.insertContent(prompt),
  },
  {
    id: 'findContractDates',
    label: 'Find key contract dates',
    button: findContractDatesButton,
    prompt: 'Locate the sentences that mention key dates or milestones in this agreement.',
    runner: (ai, prompt) => ai.action.find(prompt),
  },
];

const actionLabels = {};
let actionPrompts = {};

actionConfigs.forEach(({id, label, prompt}) => {
  actionPrompts[id] = prompt;
  actionLabels[id] = label;
});

function syncPromptFields() {
  promptPanels.forEach(({textarea}, actionId) => {
    if (textarea) {
      textarea.value = actionPrompts[actionId] ?? '';
    }
  });
}

actionConfigs.forEach(({button, id, runner}) => {
  handleAction(button, (ai) => runner(ai, actionPrompts[id]));
});

document.querySelectorAll('[data-inline-panel]').forEach((panel) => {
  const actionId = panel.dataset.inlinePanel;
  if (!actionId) {
    return;
  }

  const textarea = panel.querySelector('textarea');
  const sendButton = panel.querySelector(`[data-send-prompt="${actionId}"]`);

  promptPanels.set(actionId, {panel, textarea, sendButton});

  if (textarea) {
    const label = actionLabels[actionId] ?? actionId;
    textarea.setAttribute('aria-label', `${label} prompt`);
  }

  textarea?.addEventListener('input', () => {
    actionPrompts[actionId] = textarea.value;
  });

  sendButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    const latestValue = textarea?.value ?? actionPrompts[actionId];
    actionPrompts[actionId] = latestValue;
    closePromptEditor(actionId);
    document.getElementById(actionId)?.click();
  });
});

syncPromptFields();

configButtons.forEach((configButton) => {
  configButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const actionId = configButton.dataset.configTarget;
    if (!actionId) {
      return;
    }

    if (editingActionId === actionId) {
      closePromptEditor(actionId);
    } else {
      openPromptEditor(actionId);
    }
  });
});

document.addEventListener('click', (event) => {
  if (!editingActionId) {
    return;
  }

  const entry = promptPanels.get(editingActionId);
  const clickedInsidePanel = entry?.panel?.contains(event.target);
  const clickedConfigButton = configButtons.some((button) => button.contains(event.target));

  if (!clickedInsidePanel && !clickedConfigButton) {
    closePromptEditor();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && editingActionId) {
    closePromptEditor();
  }
});

createSuperdoc();
setButtonsEnabled(false);
