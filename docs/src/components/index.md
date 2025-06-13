---
{ 'home': False, 'prev': False, 'next': False }
---

# Components

Detailed reference documentation for SuperDoc's components and their APIs.

<p style="margin-bottom: 2rem;
    padding: 0.5rem 0.85rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 4px;
    text-decoration: none;
    color: var(--vp-c-text-2);
    transition: color .4s ease-in-out;
    font-size: .8rem;">
SuperDoc provides a set of components that can be used individually or together to create a complete document editing experience. This reference documents the API for each component.
</p>

## SuperDoc Component {#superdoc}

The main component that orchestrates document editing, viewing, collaboration, and UI.

### Initialization

```javascript
import '@harbour-enterprises/superdoc/style.css';
import { SuperDoc } from '@harbour-enterprises/superdoc';

const superdoc = new SuperDoc({
  selector: '#root',
  toolbar: '#toolbar',
  document: '/sample.docx',
  pagination: true,
  licenseKey: 'community-and-eval-agplv3',
  telemetry: { 
    enabled: true,
  } //basic usage metrics and exceptions
})
```

### Configuration Options

| Property       | Type              | Description                                                 | Required | Default          |
| :------------- | :---------------- | :---------------------------------------------------------- | :------: | :--------------- |
| `selector`     | `string\|Element` | CSS selector or DOM element where SuperDoc will be rendered |    ✓     | -                |
| `document`     | `string\|File\|object` | URL, File or document config                           |    ✓     | -                |
| `superdocId`   | `string`          | Unique identifier for this SuperDoc instance                |          | Random UUID      |
| `documentMode` | `string`          | Document mode: 'viewing', 'suggesting', or 'editing'         |          | 'editing'        |
| `role`         | `string`          | User role: 'editor', 'suggester', or 'viewer'               |          | 'editor'         |
| `user`         | `object`          | Current user information                                    |          | {}               |
| `toolbar`      | `string\|Element` | DOM element to render toolbar                               |          | Internal toolbar |
| `modules`      | `object`          | Additional modules configuration                            |          | {}               |

#### Document Object Properties

| Property | Type         | Description                             | Required |
| :------- | :----------- | :-------------------------------------- | :------: |
| `id`     | `string`     | Unique identifier for the document      |    ✓     |
| `type`   | `string`     | Document type: 'docx', 'pdf', or 'html' |    ✓     |
| `data`   | `File\|Blob` | Document data as a File or Blob object  |          |
| `url`    | `string`     | URL to fetch the document               |          |
| `state`  | `object`     | Initial document state                  |          |

#### User Object Properties

| Property | Type     | Description                    | Required |
| :------- | :------- | :----------------------------- | :------: |
| `name`   | `string` | User's display name            |    ✓     |
| `email`  | `string` | User's email address           |    ✓     |
| `image`  | `string` | URL for user's avatar          |          |
| `id`     | `string` | Unique identifier for the user |          |

#### Modules Configuration

```javascript
modules: {
  // Collaboration module configuration
  collaboration: {
    url: 'wss://collaboration-server.example.com',
    token: 'auth-token',
    params: { /* Additional connection parameters */ }
  },
}
```

### Methods

| Method                                | Parameters                        | Return          | Description                                                 |
| :------------------------------------ | :-------------------------------- | :-------------- | :---------------------------------------------------------- |
| `export()`                            | -                                 | `Promise<Void>` | Exports the SuperDocs and triggers download                 |
| `setDocumentMode(mode)`               | mode: 'viewing', 'suggesting', or 'editing'      | -               | Switches between view, suggest, and edit modes                        |
| `on(event, callback)`                 | event: string, callback: function | -               | Registers an event listener                                 |
| `off(event, callback)`                | event: string, callback: function | -               | Removes an event listener                                   |
| `getHTML()`                           | -                                 | -               | Get a list of HTML strings (one per DOCX document)          |

### Hooks

| Hook                 | Parameters                | Description                                             |
| -------------------- | ------------------------- | ------------------------------------------------------- |
| onEditorBeforeCreate | -                         | Called **before** the document editor is created.       |
| onEditorCreate       | `{ editor }`              | Called when the document editor is created.             |
| onEditorDestroy      | -                         | Called when the document editor is destroyed.           |
| onContentError       | `{ error, editor }`       | Called when there's an error with document content.     |
| onReady              | -                         | Called when the document is fully initialized and ready.|
| onAwarenessUpdate    | `{ users }`               | Called when user presence information changes.          |
| onPdfDocumentReady   | -                         | Called when the PDF version of the document is ready.   |
| onCollaborationReady | `{ editor }`              | Called when collaboration is ready.                     |
| onException          | `{ error, editor }`       | Called when an exception occurs.                        |

## Next Steps

- See [Integration](/integration/) for framework-specific integration guides
- Check out [Resources](/resources/) for examples, FAQ, and community resources
- Learn more about [Getting Started](/) for basic concepts and setup
