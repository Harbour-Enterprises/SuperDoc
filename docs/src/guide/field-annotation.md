---
{ 'home': True, 'prev': False, 'next': False }
---

# Field Annotation

SuperDoc editor by default has the **fieldAnnotation** node enabled.  You can learn more about the [**Field Annotation** node here](https://github.com/Harbour-Enterprises/SuperDoc/blob/main/packages/super-editor/src/extensions/field-annotation/field-annotation.js).

Field annotations can be used when placeholder / variable content is needed inside the document. They can contain various types of data:

- Plain text
- Images
- Links
- Checkboxes
- HTML rich text

## Inserting Fields

```javascript
// Use editor instance (not SuperDoc instance).
const position = 0;
editor.commands.addFieldAnnotation(position, {
  type: 'text', // Type of the field annotation
  displayLabel: 'Enter your info', // Placeholder text
  fieldId: '123', // The ID you'd like for this field
  fieldColor: '#980043', // Styling
  fieldType: 'NAME_INPUT', // Custom field type name (Optional)
});

// or
editor.commands.addFieldAnnotationAtSelection({
  type: 'text',
  displayLabel: 'Enter your info',
  fieldId: '123',
  fieldColor: '#980043',
  fieldType: 'NAME_INPUT',
});
```

## Updating Fields

```javascript
const fieldId = '123';
editor.commands.updateFieldAnnotations(fieldId, {
  displayLabel: 'Updated!',
});
```

For text fields, the `displayLabel` attribute is used for both the placeholder and the actual value. Some field types have special attribute for the actual value.

```javascript
// Example: fill the image field with an actual value.
editor.commands.updateFieldAnnotations(fieldId, {
  imageSrc: 'IMAGE_URL',
});
```

Also check the [Annotate](#annotate) section for a complete solution.

## Field Commands and Helpers

You can learn more about all available commands [here](https://github.com/Harbour-Enterprises/SuperDoc/blob/main/packages/super-editor/src/extensions/field-annotation/field-annotation.js) and helpers [here](https://github.com/Harbour-Enterprises/SuperDoc/tree/main/packages/super-editor/src/extensions/field-annotation/fieldAnnotationHelpers).


## Drag-and-drop
If you create a drag-and-drop system ([See this example](https://github.com/Harbour-Enterprises/SuperDoc/tree/main/examples/vue-fields-example)) for fields, you should listen for the Editor event `fieldAnnotationDropped`.

Example:
```javascript
superdoc.activeEditor.on('fieldAnnotationDropped', ({ sourceField }) => {
  superdoc.activeEditor.commands.addFieldAnnotationAtSelection(sourceField);
});
```

## Fields docx export
SuperDoc supports full export and re-import of fields. By default, SuperDoc will not re-import document fields and will convert them to mustache style templates only.

To enable fields import simply add the below to your config when instantiating `new SuperDoc`.

```javascript
const config = {
  annotations: true,
};
```

When exporting, the background color of the fields will be transparent by default. If you want to highlight fields in the exported document, use `fieldsHighlightColor` property.

```javascript
superdoc.export({ fieldsHighlightColor: '#7AA6FF' }); // Use hex color
```

## Annotate

__available in SuperDoc > 0.11.35__

SuperDoc's editor instance (`superdoc.activeEditor`) exposes the `annotate()` function, allowing you to insert values into the Field nodes, either for preview or final document export.

This command is fully undo/redo friendly.

### Usage

```ts
type FieldValue = {
input_id: string                // The ID of the input field being annotateda
  input_value: string             // The value to insert into that field
}

editor.annotate(
  fieldValues: FieldValue[],      // Array of field annotations to insert or update
  hiddenFieldIds?: string[],      // Optional array of field IDs to hide from the annotated view
): void
```

### Example use
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

### Exporting after `annotate()`

If using `annotate()` to do field value replacement, and then exporting the `.docx` document via `superdoc.export()` the `.docx` file will be exported with the fields still in the document (rather than replacing the fields with their expected values, ie: for final document export).

You can pass in the `isFinalDoc` flag to `export()` in order to actually replace fields with their values, creating a seamless final document that contains no field objects.

```javascript
superdoc.export({ isFinalDoc: true });
```
