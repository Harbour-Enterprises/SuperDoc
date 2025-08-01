---
{ 'home': True, 'prev': False, 'next': False }
---

# Configuration

Configuration options for SuperDoc:

```javascript
const config = {
  // Optional: Give the superdoc an id
  superdocId: 'my-superdoc-id',

  // Optional: SuperDoc title
  title: 'My SuperDoc',

  // Required: A DOM element ID to render superdoc into
  selector: '#superdoc',

  // Optional: Initial document mode: viewing, suggesting,editing. Defaults to editing
  documentMode: 'editing',

  // Optional: User role: editor, suggester, viewer. Defaults to editor
  role: 'editor',

  // Required: URL, File or document config
  document: '/sample.docx',

  // Optional: For enterprise users, set the license key
  licenseKey: 'community-and-eval-agplv3',

  // Optional: Enable telemetry to help us improve SuperDoc
  telemetry: {
    enabled: true,
  },

  // Optional: The current user
  user: {
    name: 'Superdoc User',
    email: 'superdoc@example.com',
    image: 'image-url.jpg',
  },

  // Optional: A DOM element selector to render superdoc into
  toolbar: '#superdoc-toolbar',

  // Optional: modules
  modules: {
    // The collaboration module
    collaboration: {
      url: 'wss://your-collaboration-server.com', // Required: Path to your collaboration backend
      token: 'your-auth-token', // Required: Your auth token
    },
    
    // Toolbar config, overrides the 'toolbar' key, if provided, above
    toolbar: {
      selector: '#superdoc-toolbar',
    },

    // More coming soon
  },

  // Optional: pagination
  pagination: true,

  // Optional: rulers
  rulers: true,

  // Optional: events - pass in your own functions for each
  onEditorBeforeCreate: () => null,
  onEditorCreate: () => null,
  onEditorDestroy: () => null,
  onContentError: () => null,
  onReady: () => null,
  onPdfDocumentReady: () => null,
  onException: () => null,
};
```
## Next

- See [Modes and Roles](/guide/modes-roles)
