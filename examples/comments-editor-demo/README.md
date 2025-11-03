# SuperDoc Comments Export Demo

This demo visualizes the JSON structure of comments that SuperDoc uses when exporting documents.

## Overview

The Comments Export Demo allows you to:
- Add comments to documents
- View the real-time JSON structure that will be used during document export
- Export documents with all comments included

## Features

### Document Tab
- Create new blank documents
- Import existing DOCX files
- Add, edit, and resolve comments
- Export documents with comments

### Comments Tab
- View the live JSON structure of all comments
- See comment metadata including:
  - Unique identifiers and timestamps
  - Author information (name, email)
  - Comment text and resolved status
  - Position data for accurate placement
  - Parent-child relationships for threaded discussions

### About Tab
- Learn how the demo works
- Understand how the demo works
- View comment structure details

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the provided URL

## Usage

1. Start by adding comments to the document in the Document tab
2. Switch to the Comments tab to see the JSON structure
3. Use the export button to download the document with all comments

## Technical Details

This demo uses:
- Vue 3 for the UI framework
- SuperDoc v0.26.0 for document editing and comment management
- Vite for development and building

The JSON structure shown in the Comments tab represents the exact format that SuperDoc uses internally when exporting documents with comments.