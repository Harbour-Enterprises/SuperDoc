---
{ 'home': False, 'prev': False, 'next': False }
---

# Advanced

## SuperEditor Component {#supereditor}

The core editor component that powers DOCX editing in SuperDoc. For advanced use cases, you can use SuperEditor directly.

### Initialization

```javascript
import '@harbour-enterprises/superdoc/super-editor/style.css';
import { SuperEditor } from '@harbour-enterprises/superdoc/super-editor';

const editor = new SuperEditor({
  selector: '#editor-container',
  fileSource: docxFile,
  state: initialState,
  documentId: 'doc-123',
  options: {
    user: {
      name: 'Editor User',
      email: 'editor@example.com',
    },
    // Additional options...
  },
});
```

### Configuration Options

| Property     | Type                 | Description                | Required | Default |
| :----------- | :------------------- | :------------------------- | :------: | :------ |
| `selector`   | `string\|Element`    | Where to render the editor |    ✓     | -       |
| `fileSource` | `File\|Blob\|string` | Document file or URL       |    ✓     | -       |
| `state`      | `object`             | Initial document state     |          | null    |
| `documentId` | `string`             | Unique document ID         |    ✓     | -       |
| `options`    | `object`             | Editor options             |    ✓     | -       |

#### Editor Options

| Property                | Type       | Description                            | Default        |
| :---------------------- | :--------- | :------------------------------------- | :------------- |
| `user`                  | `object`   | Current user information               | {}             |
| `colors`                | `object`   | Theme color configuration              | Default colors |
| `role`                  | `string`   | User role: 'editor', 'suggester', 'viewer' | 'editor'       |
| `documentMode`          | `string`   | 'editing', 'viewing', or 'suggesting'  | 'viewing'      |
| `pagination`            | `boolean`  | Enable pagination                      | true           |
| `rulers`                | `array`    | Document ruler configuration           | []             |
| `ydoc`                  | `Y.Doc`    | Yjs document for collaboration         | null           |
| `collaborationProvider` | `object`   | Collaboration provider instance        | null           |
| `isNewFile`             | `boolean`  | Whether this is a new document         | false          |
| `handleImageUpload`     | `function` | Custom image upload handler            | null           |
| `telemetry`             | `object`   | Telemetry configuration                | null           |

### Methods

| Method                | Parameters             | Return          | Description                                             |
| :-------------------- | :--------------------- | :-------------- | :------------------------------------------------------ |
| `destroy()`           | -                      | -               | Destroys the editor instance                            |
| `getHTML()`           | -                      | `string`        | Gets document content as HTML                           |
| `getJSON()`           | -                      | `object`        | Gets document content as JSON                           |
| `getPageStyles()`     | -                      | `object`        | Gets page style information                             |
| `focus()`             | -                      | -               | Focuses the editor                                      |
| `blur()`              | -                      | -               | Removes focus from the editor                           |
| `exportDocx()`        | -                      | `Promise<Blob>` | Exports as DOCX                                         |

### Hooks

SuperEditor has a variety of hooks

| Hook                     | Parameters    | Description                                           |
| ------------------------ | ------------- | ----------------------------------------------------- |
| onBeforeCreate           | -             | Called **before** the creation process starts.        |
| onCreate                 | -             | Called when the document is created.                  |
| onUpdate                 | -             | Called when the document is updated.                  |
| onSelectionUpdate        | -             | Called when the document selection is updated.        |
| onTransaction            | -             | Called during document transactions.                  |
| onFocus                  | -             | Called when the document gains focus.                 |
| onBlur                   | -             | Called when the document loses focus.                 |
| onDestroy                | -             | Called when the document is destroyed.                |
| onContentError           | `{ error }`   | Called when there's a content error.                  |
| onTrackedChangesUpdate   | -             | Called when tracked changes are updated.              |
| onCommentsUpdate         | -             | Called when comments are updated.                     |
| onCommentsLoaded         | -             | Called when comments have finished loading.           |
| onCommentClicked         | -             | Called when a comment is clicked.                     |
| onCommentLocationsUpdate | -             | Called when the locations of comments are updated.    |
| onDocumentLocked         | -             | Called when the document lock state changes.          |
| onFirstRender            | -             | Called on the first render of the document.           |
| onCollaborationReady     | -             | Called when collaboration features are ready.         |
| onPaginationUpdate       | -             | Called when pagination is updated.                    |
| onException              | -             | Called when an exception occurs.                      |

### Example: Basic Editor Commands

You can get a list of currently available commands from ```editor.commands```
