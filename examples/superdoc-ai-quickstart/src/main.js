import { SuperDoc } from 'superdoc';
import { SuperDocAI } from '@superdoc-dev/superdoc-ai';
import 'superdoc/style.css';
import './style.css';

const statusText = document.getElementById('statusText');
const insertIntroButton = document.getElementById('insertIntro');
const summarizeDocButton = document.getElementById('summarizeDoc');
const highlightTasksButton = document.getElementById('highlightTasks');
const rewriteGoalsButton = document.getElementById('rewriteGoals');
const findLaunchDateButton = document.getElementById('findLaunchDate');
const refineLaunchTasksButton = document.getElementById('refineLaunchTasks');
const addSingleCommentButton = document.getElementById('addSingleComment');

const allButtons = [
  insertIntroButton,
  summarizeDocButton,
  highlightTasksButton,
  rewriteGoalsButton,
  findLaunchDateButton,
  refineLaunchTasksButton,
  addSingleCommentButton,
].filter((button) => button instanceof HTMLButtonElement);

let aiInstance = null;

const initialDocument = `
  <h1>SuperDoc AI Overview</h1>
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

  aiInstance = new SuperDocAI(superdoc, {
    user: {
      displayName: 'SuperDoc AI Assistant',
      userId: 'superdoc-ai-demo',
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


const actionBindings = [
  {
    button: insertIntroButton,
    run: (ai) =>
      ai.action.insertContent(
        'Add a concise paragraph that lists two immediate next steps for preparing the SuperDoc AI public preview.'
      ),
  },
  {
    button: summarizeDocButton,
    run: (ai) =>
      ai.action.insertTrackedChange(
        'Suggest an improved language for the first paragraph of the document.'
      ),
  },
  {
    button: highlightTasksButton,
    run: (ai) =>
      ai.action.highlight('Highlight the next milestone.'),
  },
  {
    button: rewriteGoalsButton,
    run: (ai) =>
      ai.action.replace(
        'Rename the document title to a descriptive title.'
      ),
  },
  {
    button: findLaunchDateButton,
    run: (ai) =>
      ai.action.find('Find the sentence that includes the release date.'),
  },
  {
    button: addSingleCommentButton,
    run: (ai) =>
      ai.action.insertComment('Add a comment asking stakeholders to add any missing details.'),
  },
];

actionBindings.forEach(({button, run}) => handleAction(button, run));

setButtonsEnabled(false);
