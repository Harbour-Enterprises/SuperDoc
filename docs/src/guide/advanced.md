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


## Editor Commands

You can get a a full list of currently available commands from ```editor.commands```

### insertContent

Insert content at the selection position or start of the document
```js
editor.commands.insertContent(content); // Content can be JSON schema, HTML or plain text
```

## Editor Nodes

This list highlights a few nodes and their commands. Please see the node definition file in the codebase for more details on a given node.

### Table node [View code](https://github.com/Harbour-Enterprises/SuperDoc/blob/develop/packages/super-editor/src/extensions/table/table.js)

| Command                     | Parameters    | Description                                           |
| ------------------------ | ------------- | ----------------------------------------------------- |
| insertTable           | `{ rows = 3, cols = 3, withHeaderRow = false }` | Inserts a table at the current selection. All parameters are optional. |
| deleteTable           | -               | Deletes the table at the current selection.           |
| addColumnBefore       | -               | Adds a column before the current column.              |
| addColumnAfter        | -               | Adds a column after the current column.               |

## DocumentSection Node

The document sections API is available in SuperDoc > 0.14.20-next.3 (beta) and will be generally available after SuperDoc > 0.15.1 soon.

::: warning Beta

This node is in beta and the API might change.

:::

The `DocumentSection` node allows you to encapsulate, update, and manage discrete sections of your document. You can access these commands via `editor.commands`.

### Command Overview

| Command                   | Parameters                                                      | Description                                 |
|---------------------------|----------------------------------------------------------------|---------------------------------------------|
| `createDocumentSection`   | `{ id, title, description, html, json }` (all optional)  | Creates a new section at the current selection. |
| `removeSectionAtSelection`| _none_                                                         | Removes the section at the current selection. |
| `removeSectionById`       | `id: string`                                                   | Removes the section with the given ID.      |
| `updateSectionById`       | `{ id, html, json, attrs }`                                    | Updates the section's content or attributes. |

---

### Command Details & Usage

#### `createDocumentSection`
Creates a new section at the current selection.

```js
editor.commands.createDocumentSection({
  id: 'section-123',           // Optional: Unique section ID. Will be auto-generated if not provided.
  title: 'My Section',         // Optional: Section title
  description: 'Details...',   // Optional: Section description
  html: '<p>Section content</p>', // Optional: HTML content for the section
  json: {/* ProseMirror JSON */}, // Optional: ProseMirror JSON content. Takes presedence over HTML.
});
```

#### `removeSectionAtSelection`
Removes the section at the current selection.

```js
editor.commands.removeSectionAtSelection();
```

#### `removeSectionById`
Removes the section with the specified ID.

```js
editor.commands.removeSectionById('section-123');
```

#### `updateSectionById`
Updates the content and/or attributes of a section by ID.

```js
editor.commands.updateSectionById({
  id: 'section-123',           // Required: Section ID
  html: '<p>New content</p>',  // Optional: New HTML content
  json: {/* ProseMirror JSON */}, // Optional: New JSON content
  attrs: { title: 'Updated Title', description: 'Updated desc' }, // Optional: New attributes
});
```

---

### Parameter Reference

| Name         | Type     | Description                                      |
|--------------|----------|--------------------------------------------------|
| `id`         | string   | Unique identifier for the section                |
| `title`      | string   | Section title                                    |
| `description`| string   | Section description                              |
| `html`       | string   | HTML content for the section                     |
| `json`       | object   | ProseMirror JSON content for the section         |

:::info :bulb: If both `html` and `json` are provided, `json` takes precedence.
:::


## DocumentSection helpers

The `DocumentSection` node provides utility functions for working with document sections programmatically. These helpers allow you to query, export, and link section editors in your document.

Importing helpers
```
import { SectionHelpers } from '@harbour-enterprises/superdoc';
```

### Available Helpers

| Helper                        | Parameters                                 | Description                                                      |
|-------------------------------|--------------------------------------------|------------------------------------------------------------------|
| `getAllSections(editor)`      | `editor: Editor`                           | Returns an array of all section nodes with their positions.      |
| `exportSectionsToHTML(editor)`| `editor: Editor`                           | Exports all sections as an array of HTML strings.                |
| `exportSectionsToJSON(editor)`| `editor: Editor`                           | Exports all sections as an array of ProseMirror JSON objects.    |
| `getLinkedSectionEditor(id, options, editor)` | `id: string, options: EditorOptions, editor: Editor` | Returns a child editor instance linked to the section with the given ID. If you want to render this editor, make sure you set an element key in options. |

---

### Usage Examples

### Get all sections
```js
const sections = SectionHelpers.getAllSections(editor);
// sections = [ { node, pos }, ... ]
```

### Export all sections to HTML
```js
const htmlSections = SectionHelpers.exportSectionsToHTML(editor);
// htmlSections = [ '<p>Section 1</p>', '<p>Section 2</p>', ... ]
```

### Export all sections to JSON
```js
const jsonSections = SectionHelpers.exportSectionsToJSON(editor);
// jsonSections = [ { type: 'doc', content: [...] }, ... ]
```

### Get a linked section editor
```js
const childEditor = SectionHelpers.getLinkedSectionEditor('section-123', { /* options */ }, editor);
// childEditor is a new editor instance linked to the section with id 'section-123'
```

---

**Tip:** These helpers are especially useful for integrations, plugins, or advanced document manipulation where you need to inspect, export, or edit sections directly.
