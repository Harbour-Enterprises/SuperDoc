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

# PDF Conversion <Badge text="new" type="tip" />

Convert DOCX files to PDF using the SuperDoc API.

## Quick Start

```bash
curl -X POST https://api.superdoc.dev/v1/convert?from=docx \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@document.docx" \
  -o output.pdf
```

## Getting Started

1. **Get an API key**: Register at [api.superdoc.dev/v1/auth/register?email=you@email.com](https://api.superdoc.dev/v1/auth/register?email=you@email.com)
2. **View full documentation**: [api.superdoc.dev/docs](https://api.superdoc.dev/docs)

::: warning Backend Only
Never expose API keys in frontend code. Call the conversion API from your backend, then serve the PDF to your frontend.
:::

## Key Improvements

- **Direct file upload** instead of base64 encoding (more efficient)
- **Direct PDF response** instead of base64 response (simpler)
- **Standard Bearer auth** instead of custom header
- **RESTful design** with query parameters for format specification

## Example

```javascript
// Backend endpoint example
app.post('/convert-pdf', async (req, res) => {
  const formData = new FormData();
  formData.append('file', req.file.buffer, req.file.originalname);
  
  const response = await fetch('https://api.superdoc.dev/v1/convert?from=docx', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.SUPERDOC_API_KEY}` },
    body: formData
  });
  
  const pdf = await response.blob();
  res.type('application/pdf').send(pdf);
});
```