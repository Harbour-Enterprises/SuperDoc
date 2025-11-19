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

const initialDocument = `
  <h1>SuperDoc AI Actions Overview</h1>
  <p>
    SuperDoc AI is the LLM bridge for SuperDoc editors, packaging provider management and document-context enrichment into one consistent API. It sits directly in the collaborative canvas so teams can call AI assistance the moment content is drafted.
  </p>
  <p>
  Launched on November 1st, 2025, this package seamlessly integrates search, rewriting, highlighting, tracked changes, comment insertion, and streaming completions to maintain editorial momentum. It transforms every SuperDoc workspace into an AI-powered collaborator, enabling teams to uncover insights, implement structured edits, and document feedback—all within a single environment. 
  </p>
  <p>
  The next milestone is to create a comprehensive demos and documentation, and proactively communicating changes to customers to ensure adoption feels effortless.
  </p>

`;

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

const superdoc = new SuperDoc({
  selector: '#superdoc',
  documentMode: 'editing',
  pagination: true,
  rulers: true,
  toolbar: '#superdoc-toolbar',
  onEditorCreate: ({ editor }) => {
    editor?.commands?.insertContent?.(initialDocument);
    statusText.textContent = 'SuperDoc is ready. Initializing AI...';
    initializeAI(superdoc);
  }
});

const actionConfigs = [
  {
    id: 'insertTrackedChange',
    label: 'Insert AI tracked change',
    button: insertTrackedChangeButton,
    prompt:
      'Propose a tracked change that clarifies the rollout responsibilities in the opening section.',
    runner: (ai, prompt) => ai.action.insertTrackedChange(prompt),
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

setButtonsEnabled(false);
