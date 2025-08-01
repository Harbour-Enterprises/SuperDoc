---
{ 'home': True, 'prev': False, 'next': False }
---

[![npm version](https://img.shields.io/npm/v/@harbour-enterprises/superdoc.svg?color=1355ff)](https://www.npmjs.com/package/@harbour-enterprises/superdoc)

# Quick Start

Learn how to install and set up SuperDoc, the modern collaborative document editor for the web.

## Installation

First, you'll need to install the following package. You can use your preferred package manager:

```bash
npm install @harbour-enterprises/superdoc
```

You can also use SuperDoc directly from a CDN:

```html
<link href="https://cdn.jsdelivr.net/npm/@harbour-enterprises/superdoc/dist/style.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/@harbour-enterprises/superdoc/dist/superdoc.es.js" type="module"></script>
```

## Add markup

Add the following HTML where you'd like to mount the editor and the toolbar:

```html
<div id="superdoc-toolbar"></div>
<div id="superdoc"></div>
```

## Basic Usage

```javascript
import '@harbour-enterprises/superdoc/style.css';
import { SuperDoc } from '@harbour-enterprises/superdoc';

const superdoc = new SuperDoc({
  selector: '#superdoc',
  toolbar: '#superdoc-toolbar',
  document: '/sample.docx', // URL, File or document config
  documentMode: 'editing',
  pagination: true,
  rulers: true,
  onReady: (event) => {
    console.log('SuperDoc is ready', event);
  },
  onEditorCreate: (event) => {
    console.log('Editor is created', event);
  },
})
```

Congratulations! You've successfully created your first SuperDoc editor.

## Next

- See [Configuration](/guide/configuration) for full Superdoc configuration
