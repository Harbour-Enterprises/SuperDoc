# SuperDoc Blob Support Example

This example demonstrates how to use Blob objects directly with SuperDoc for document initialization.

## Features Demonstrated

### 1. Native Blob Support
- Pass Blob objects directly to SuperDoc's `document` configuration
- Automatic Blob-to-File conversion when filename is required
- Support for both named and unnamed Blobs

### 2. Use Cases
- **File to Blob conversion**: Load a file and convert it to a Blob
- **Fetch to Blob**: Fetch a document from a URL and create a Blob  
- **Generated Blobs**: Create Blobs with programmatically generated content
- **Direct SuperDoc initialization**: Use Blobs directly with SuperDoc

## Usage Examples

### Basic Blob Usage

```javascript
// Create a Blob from file data
const blob = new Blob([fileData], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
});

// Use directly with SuperDoc
const superdoc = new SuperDoc({
    selector: '#superdoc',
    document: blob, // Blob is automatically handled!
    documentMode: 'editing'
});
```

### Blob with Custom Name

```javascript
// SuperDoc configuration with Blob and custom name
const superdoc = new SuperDoc({
    selector: '#superdoc',
    documents: [{
        data: blob,
        name: 'my-document.docx', // Custom filename
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }]
});
```

### Fetch and Convert to Blob

```javascript
// Fetch document and use as Blob
const response = await fetch('/api/documents/123');
const blob = await response.blob();

const superdoc = new SuperDoc({
    selector: '#superdoc',
    document: blob
});
```

## Implementation Details

### Automatic Blob Handling

SuperDoc now automatically handles Blob objects in the following ways:

1. **Type Detection**: Blobs are detected using `instanceof Blob` checks
2. **File Conversion**: Blobs are converted to File objects when a filename is needed
3. **Name Generation**: If no name is provided, a default name is generated based on the document type
4. **Type Preservation**: The original Blob's MIME type is preserved during conversion

### Supported Blob Types

- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `application/pdf` (PDF)
- `text/html` (HTML)
- Other document types supported by SuperDoc

### Configuration Options

```javascript
// Document configuration with Blob
{
    data: blob,           // Required: The Blob object
    name: 'doc.docx',    // Optional: Custom filename
    type: 'docx',        // Optional: Document type override
    isNewFile: true      // Optional: Mark as new file
}
```

## Browser Compatibility

This feature works in all modern browsers that support:
- Blob API
- File API  
- SuperDoc's existing browser requirements

## Running the Example

1. Open `index.html` in a web browser
2. Try the different buttons to test various Blob scenarios:
   - **Load from File → Blob**: Select a local file and convert to Blob
   - **Fetch from URL → Blob**: Fetch a document and use as Blob
   - **Generate Content → Blob**: Create a Blob with generated content

## Notes

- Blobs don't have a `.name` property like Files do, so SuperDoc automatically generates appropriate filenames
- The conversion from Blob to File is handled internally and transparently
- All existing SuperDoc features work seamlessly with Blob-initialized documents