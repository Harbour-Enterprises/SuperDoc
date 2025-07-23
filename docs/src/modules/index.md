---
{ 'home': False, 'prev': False, 'next': False }
---

# Modules

SuperDoc can be extended via modules. There are several modules available currently.

You can add a module by passing in a config for it in the main SuperDoc config:
```javascript
const config {
  ...mySuperDocConfig, // Your config

  // Modules - optional key
  modules: {
    // Add module config here
  }
}
```

# Search

SuperDoc 0.11 adds a new .docx search feature.

### Usage
Search works the same if you're using SuperDoc or the Editor instance directly.

```javascript
const superdoc = new SuperDoc({ ...myConfig });

// Text search
const results = superdoc.search('My text search'); // An array of results
// Or editor.commands.search('My text search');

// results = [
//      { from: 12, to: 24, text: 'My text search' },
//      …
//   ]

// Regex
const regexResults = superdoc.search(/\b\w+ng\b/gi);
// Or editor.commands.search('My text search');

// results = [
//      { from:  5, to: 13, text: 'painting' },
//      { from: 18, to: 28, text: 'preparing' },
//      …
//   ]
```

### Commands

```javascript
superdoc.search(...)
// Or editor.commands.search(...)

superdoc.goToSearchResult(match); // Pass in a match from the result of search()
// Or editor.commands.goToSearchResult(match);
```

### Customization
You can customize the color of the highlights from these styles:

```css
.ProseMirror-search-match
.ProseMirror-active-search-match
```



# Comments

The comments module can be added by adding the comments config to the modules.

```javascript
const comments = {
  // Defaults to false. Set to true if you only want to show comments
  readOnly: false, 
  // Defaults to true. Set to false if you do not want to allow comment resolution.
  allowResolve: true,
};
```

## Comments example

You can run the SuperDoc Dev environment to see a working example of comments. From the main SuperDoc folder:
```bash
npm install && npm run dev
```

This will start a simple SuperDoc dev playground. Try adding some comments by adding text / selecting it / adding comments!


## Comments hooks

### Hook: onCommentsUpdate

The onCommentsUpdate is fired whenever there is a change to the list of comments (new, update, edit, delete and so on). You can handle these events by passing in a handler into the main SuperDoc config

```javascript
const config = {
  ...mySuperDocConfig, // Your config

  // Handle comment updates
  onCommentsUpdate: myCommentsUpdateHandler,
};

// Your handler
const myCommentsUpdateHandler = ({ type, comment meta }) => {
  switch (type) {
    // When a user has highlighted text and clicked the add comment button,
    // but has not actually created the comment yet
    case 'pending':
      break;

    // On new comment created
    case 'add':
      break;

    // On comment deleted
    case 'delete':
      break;

    // On comment updated (ie: via edit)
    case 'update':
      break;

    // On comment deleted
    case 'deleted':
      break;

    // On comment resolved
    case 'resolved':
      break;
  };
};
```

## SuperDoc Toolbar {#superdoc-toolbar}

The **SuperDoc** will render into a DOM element of your choosing, allowing for full control of placement and styling over the toolbar.
By default, we render a toolbar with all available buttons. You can customize this further by adding a `toolbar` object to the `modules` config in the **SuperDoc configuration** object.

## Customization

You can customize the toolbar configuration via the **SuperDoc config** object.

```javascript
const config = {
  // ... your SuperDoc config
  modules: {
    toolbar: {
      selector: 'superdoc-toolbar', // The ID of the DOM element you want to render the toolbar into

      toolbarGroups: ['left', 'center', 'right'],

      // Optional: Specify what toolbar buttons to render. Overrides toolbarGroups.
      groups: {
        center: ['bold', 'italic'],
      },

      // Optional: Instead of specifying all the buttons you want, specify which ones to exclude
      excludeItems: ['bold', italic'], // Will exclude these from the standard toolbar
      
      // Optional: override icons for toolbar items.
      // `packages/super-editor/src/components/toolbar/toolbarIcons.js` - for reference.
      icons: {
        bold: '<svg></svg>',
      },

      // Optional: override text for toolbar items.
      // `packages/super-editor/src/components/toolbar/toolbarTexts.js` - for reference.
      texts: {
        color: 'Change text color',
      },

      // Optional: Customize the fonts list.
      fonts: [
        {
          label: 'Custom font',
          key: 'Custom font, serif',
          fontWeight: 400,
          props: {
            style: { fontFamily: 'Custom font, serif' },
          },
        },
      ],

      // Optional: disable hiding toolbar buttons on small screens (true by default).
      hideButtons: false,

      // Optional: make toolbar responsive to its container not to the entire window.
      responsiveToContainer: true,
    }
  }
};
```

### Default toolbar buttons
See all buttons in defaultItems.js

## Customizing toolbar buttons
⚠️ **Requires SuperDoc > 0.11.40**

### Adding a custom button
You can create a custom toolbar buttons in SuperDoc to perform custom actions.

[Please see an example of creating buttons with different commands, as well as a custom dropdown here](https://github.com/Harbour-Enterprises/SuperDoc/tree/main/examples/vue-custom-mark)

To create a custom button, simply create a JSON config. This will be generated using the use-toolbar-button composable. [See the composable for all available options](https://github.com/Harbour-Enterprises/SuperDoc/blob/main/packages/super-editor/src/components/toolbar/use-toolbar-item.js). 
```javascript
const myBasicButtonConfig = {
  type: 'button',
  name: 'insertCustomMark',

  // Since this command is already in editor.commands (from the custom-mark extension), we can use the command name directly
  command: 'setMyCustomMark',

  tooltip: 'Insert Custom Mark',
  group: 'center',
  icon: headphonesSVG, // You can use a custom icon here
};
```

Alternatively, you can also pass in a function instead of an existing command name:
```javascript
const myBasicButtonConfig = {
  type: 'button',
  name: 'insertCustomMark',

  // We can also pass in a function as the command
  // All commands receive:
  //     item (the currently-clicked button)
  //     argument (some argument value, if any)
  //     option (the entire option from the options array, for dropdowns)
  command: ({ item, argument, option }) => {
    const id = Math.random().toString(36).substring(2, 7);
    return superdoc.value?.activeEditor?.commands.setMyCustomMark(id);
  },

  tooltip: 'Insert Custom Mark',
  group: 'center',
  icon: headphonesSVG, // You can use a custom icon here
};
```

Example of creating a custom dropdown:
```javascript
const customDropDown = {
  type: 'dropdown',
  name: 'customDropdown',
  command: ({ item, argument, option }) => {
    if (!item || !option) return; // Case where the dropdown is being expanded or collapsed but no option selected
    const { key, label } = option; // This is from the options array defined below

    // Do something with the selected option here
    // For example, we can call a command or a custom function based on the key
    if (key === 'custom-mark') {
      superdoc.value?.activeEditor?.commands.setMyCustomMark();
    } else if (key === 'export-docx') {
      exportDocx();
    }
  },

  tooltip: 'Custom Dropdown',
  group: 'center',
  icon: chevronDownSVG,
  hasCaret: true,
  suppressActiveHighlight: true,

  // Dropdown options
  options: [
    { label: 'Insert Custom Mark', key: 'custom-mark', },
    { label: 'Export to DOCX', key: 'export-docx', },
  ],
};
```

Finally, simply pass in a list of custom buttons to your toolbar config:
```javascript
const mySuperDocConfig = {
  ...config, // The rest of your SuperDoc config
  modules: {
    // Other module config
    toolbar: {
      // Other toolbar config
      customButtons: [
        customDropDown,
        myBasicButtonConfig,
      ]
    }
  }
};
```

# Fields

SuperDoc by default has the **fields** extension enabled.  You can learn more about the [**Field Annotation** node here](https://github.com/Harbour-Enterprises/SuperDoc/blob/main/packages/super-editor/src/extensions/field-annotation/field-annotation.js)

Fields can be used when placeholder / variable content is needed inside the document. They can contain various types of data:
- Plain text
- HTML rich text
- Images
- Links
- Checkboxes

## Commands
```javascript
// Add a field annotation at the specified position
// editorFocus = true will re-focus the editor after the command, in cases where it is not in focus (ie: drag and drop)
editor.commands.addFieldAnnotation(pos, attrs = {}, editorFocus = false)

// Add a field annotation at the current selection
// editorFocus = true will re-focus the editor after the command, in cases where it is not in focus (ie: drag and drop)
editor.commands.addFieldAnnotationAtSelection(attrs = {}, editorFocus = false)
```

## Field schema
To create a field, we just pass in a JSON config to the addFieldAnnotationAtSelection command
```javascript
const fieldTypes = ['text', 'image', 'signature', 'checkbox', 'html', 'link']
const myField = {
  displayLabel: 'My placeholder field',     // Placeholder text
  fieldId: MY_FIELD_ID,                     // The ID you'd like for this field
  type: 'html',                             // from fieldTypes
  fieldColor: '#000099',                    // Styling
}

// Add the field to the editor
editor.commands.addFieldAnnotationAtSelection(myField)
```

## Drag-and-drop
If you create a drag-and-drop system ([See this example](https://github.com/Harbour-Enterprises/SuperDoc/tree/main/examples/vue-fields-example)) for fields, you should listen for the Editor event 'fieldAnnotationDropped'.

Example:
```javascript
superdoc.activeEditor.on('fieldAnnotationDropped', ({ sourceField }) => {
  superdoc.activeEditor.commands.addFieldAnnotationAtSelection(sourceField);
});
```

## Fields docx export
SuperDoc supports full export and re-import of fields. By default, SuperDoc will not re-import document fields and will convert them to mustache style templates only.

To enable fields import simply add the below to your config when instantiating `new SuperDoc`
```javascript
const config = {
  annotations: true,
};
```




# Annotate
__available in SuperDoc > 0.11.35__

SuperDoc's editor instance (`superdoc.activeEditor`) exposes the `annotate()` function, allowing you to insert values into the Field nodes, either for preview or final document export.

This command is fully undo/redo friendly.

### Usage

```ts
type FieldValue = {
  input_id: string                // The ID of the input field being annotated
  input_value: string             // The value to insert into that field
}

editor.annotate(
  fieldValues: FieldValue[],      // Array of field annotations to insert or update
  hiddenFieldIds?: string[],      // Optional array of field IDs to hide from the annotated view
): void
```

## Example use
```javascript
editor.annotate(
  [
    {
      input_id: "name-123",
      input_value: "Alice Smith"
    },
    {
      input_id: "image-field-456",
      input_value: "http://some-image-url.jpg" // Images should be Object URLs (URL.createObjectURL) or base64
    }
  ],
  ["obsolete-field-id"]
)

// If you want to undo the annotation
editor.commands.undo()

// You can also redo it
editor.commands.redo()

```

## Exporting after annotate()
If using annotate() to do field value replacement, and then exporting the `.docx` document via `superdoc.export()` the `.docx` file will be exported with the fields still in the document (rather than replacing the fields with their expected values, ie: for final document export).

You can pass in the `isFinalDoc` flag to export() in order to actually replace fields with their values, creating a seamless final document that contains no field objects.
```javascript
// Example:
superdoc.export({ isFinalDoc: true })
```


# PDF conversion

You can convert .docx files to PDF with our conversion endpoint. This must be done from the backend, so if you need conversion in the frontend, make sure to set up an endpoint in your own backend that you call from the frontend (which then in turn calls our conversion endpoint)

## Authentication

To authenticate you need to add an `x-api-key` header with your API key:

```bash
x-api-key: YOUR_API_KEY
```

::: warning Security Note

Your API keys carry many privileges, so be sure to keep them secure:

- You need to contact superdoc team for an API key: q@superdoc.dev
- Never use API keys in client-side code, JavaScript, mobile apps, or public repositories
- Store keys securely as environment variables or in secure configuration files
- Limit API key access to only essential team members
- Don't embed credentials directly in your code base, even if it's private
:::

**Endpoint**

```http
POST https://api.myharbourshare.com/v2/documents/convert
```


**Request Body**
| Field | Type | Description | Required |
|:------|:-----|:------------|:--------:|
| file_base64 | `string` | Base64 of original docx document | ✓ |
| filename | `string` | Original name of the document | ✓ |
| final_format | `string` | Format to convert to (default: `pdf`) | |

**Response Body**

| Field | Type | Description |
|:------|:-----|:------------|
| file_base64 | `string` | Base64 of converted document |
| filename | `string` | Updated filename with proper format |

:::warning Important
- The document must be in a format that can be converted to the requested output format
- The Base64 string should be valid
:::

:::details Example Request

```json
POST /documents/convert

{
  "file_base64": "UEsDBBQABgAIAAAAIQDTutUjug...",
  "filename": "example_document.docx",
  "final_format": "pdf"
}
```


:::

:::details Success Response

```json
{
  "file_base64": "JVBERi0xLjcKJcOkw7zDtsOfCjIgMCBvYmoK...",
  "filename": "example_document.pdf"
}
```

:::

:::details Error Response

```json
{
    "code": 3001,
    "message": "Invalid request",
    "detail": "The request payload failed validation. Please check the errors array for details.",
    "docs": "https://docs.harbourshare.com/errors/3001",
    "errors": [
        {
            "path": "file_base64",
            "code": "custom",
            "message": "file_base64 must be a valid Base64-encoded string",
            "internal_message": "Validation error: value_error",
            "resolution": "Provide a valid value that meets all requirements",
            "docs": "https://docs.harbourshare.com/errors/#custom"
        }
    ]
}
```

:::

**Supported Formats**

The API currently supports the following conversion formats:

1. **PDF**
   > - Convert documents to PDF format
   > - Maintains formatting and layout of the original document
   > - Default format if none specified

**Notes**

- Conversion operations are asynchronous and may take a few seconds to complete
- If the base64 is invalid, the conversion won't be possible
- This approach is secure as data is not persisted on our servers and uploading a document is not required


## DocumentSection Node API

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


