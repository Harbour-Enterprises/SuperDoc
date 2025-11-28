import { defineStore, storeToRefs } from 'pinia';
import { computed, reactive, markRaw, type Component } from 'vue';
import { useSuperdocStore } from './superdoc-store';
import TextField from '@superdoc/components/HrbrFieldsLayer/TextField.vue';
import ParagraphField from '@superdoc/components/HrbrFieldsLayer/ParagraphField.vue';
import ImageField from '@superdoc/components/HrbrFieldsLayer/ImageField.vue';
import CheckboxField from '@superdoc/components/HrbrFieldsLayer/CheckboxField.vue';
import SelectField from '@superdoc/components/HrbrFieldsLayer/SelectField.vue';
import { floor } from '../helpers/floor';
import type { RawField } from '../composables/use-field';

/**
 * Configuration for the HRBR fields module
 */
interface HrbrFieldsConfig {
  /** Name of the module */
  name: string;
}

/**
 * Raw coordinates from an annotation
 */
interface AnnotationCoordinates {
  /** Left position */
  x1: number;
  /** Top position */
  y1: number;
  /** Right position */
  x2: number;
  /** Bottom position */
  y2: number;
}

/**
 * Mapped coordinates with CSS values
 */
interface MappedCoordinates {
  /** Top position in CSS format */
  top: string;
  /** Left position in CSS format */
  left: string;
  /** Minimum width in CSS format */
  minWidth: string;
  /** Minimum height in CSS format */
  minHeight: string;
}

/**
 * Style properties for an annotation field
 */
interface AnnotationStyle {
  /** Font size in points */
  fontSize: string;
  /** Font family */
  fontFamily: string;
  /** Original font size value */
  originalFontSize: number;
  /** Mapped coordinates for positioning */
  coordinates: MappedCoordinates;
}

/**
 * Raw annotation data from a document
 */
interface DocumentAnnotation {
  /** ID of the field this annotation belongs to */
  itemid: string;
  /** Page number (0-indexed) */
  page: number;
  /** Whether to suppress default styling */
  nostyle?: boolean;
  /** Page annotation ID */
  pageannotation: string;
  /** Annotation ID (used for checkboxes) */
  annotationid: string;
  /** Field type */
  itemfieldtype: string;
  /** Left position */
  x1: number;
  /** Top position */
  y1: number;
  /** Right position */
  x2: number;
  /** Bottom position */
  y2: number;
  /** Original font size */
  original_font_size: number;
  /** Font family */
  fontfamily?: string;
  /** Original annotation ID */
  originalannotationid?: string;
}

/**
 * Mapped annotation field for rendering
 */
interface MappedAnnotationField {
  /** Document ID */
  documentId: string;
  /** Field ID */
  fieldId: string;
  /** Page number */
  page: number;
  /** Annotation ID */
  annotationId: string;
  /** Original annotation ID */
  originalAnnotationId?: string;
  /** Positioned coordinates */
  coordinates: MappedCoordinates;
  /** Style properties */
  style: AnnotationStyle;
  /** Whether to suppress default styling */
  nostyle: boolean;
}

/**
 * Page container information
 */
interface PageContainer {
  /** Page number */
  page: number;
  /** Container bounds */
  containerBounds: {
    /** Original height of the container */
    originalHeight: number;
  };
}

/**
 * Document with fields and annotations
 */
interface DocumentWithFields {
  /** Document ID */
  id: string;
  /** Array of fields */
  fields: RawField[];
  /** Array of annotations */
  annotations: DocumentAnnotation[];
  /** Container DOM element */
  container: HTMLElement | null;
  /** Page container information */
  pageContainers: PageContainer[];
}

/**
 * Component map for field types
 */
type FieldComponentsMap = {
  readonly TEXTINPUT: Component;
  readonly HTMLINPUT: Component;
  readonly SELECT: Component;
  readonly CHECKBOXINPUT: Component;
  readonly SIGNATUREINPUT: Component;
  readonly IMAGEINPUT: Component;
};

/**
 * Pinia store for managing HRBR fields
 *
 * This store handles the rendering and positioning of form fields
 * within document annotations. It manages field components, calculates
 * proper positioning based on scale and page bounds, and provides
 * getters for field data.
 */
export const useHrbrFieldsStore = defineStore('hrbr-fields', () => {
  const superdocStore = useSuperdocStore();
  const { documents } = storeToRefs(superdocStore);

  const hrbrFieldsConfig = reactive<HrbrFieldsConfig>({
    name: 'hrbr-fields',
  });

  const fieldComponentsMap: FieldComponentsMap = Object.freeze({
    TEXTINPUT: markRaw(TextField),
    HTMLINPUT: markRaw(ParagraphField),
    SELECT: markRaw(SelectField),
    CHECKBOXINPUT: markRaw(CheckboxField),
    SIGNATUREINPUT: markRaw(ImageField),
    IMAGEINPUT: markRaw(ImageField),
  });

  /**
   * Get a field by document ID and field ID
   *
   * @param documentId - The ID of the document
   * @param fieldId - The ID of the field
   * @returns The field object or undefined if not found
   */
  const getField = (documentId: string, fieldId: string): RawField | undefined => {
    const doc = documents.value.find((d) => d.id === documentId) as unknown as DocumentWithFields | undefined;
    if (!doc) return;

    const field = doc.fields.find((f: RawField) => f.itemid === fieldId);
    if (field) return field;
  };

  /**
   * Computed getter for all mapped annotations with proper positioning
   *
   * This getter processes all document annotations, calculates their positions
   * based on page scale and bounds, and returns fully mapped annotation objects
   * ready for rendering.
   *
   * @returns Array of mapped annotation fields
   */
  const getAnnotations = computed<MappedAnnotationField[]>(() => {
    const mappedAnnotations: MappedAnnotationField[] = [];
    documents.value.forEach((doc) => {
      const typedDoc = doc as unknown as DocumentWithFields;
      const { id, annotations } = typedDoc;

      const docContainer = typedDoc.container;
      if (!docContainer) return;

      const bounds = docContainer.getBoundingClientRect();
      const pageBoundsMap = typedDoc.pageContainers;
      if (!bounds || !pageBoundsMap) return;

      annotations.forEach((annotation) => {
        const { itemid: fieldId, page, nostyle } = annotation;

        let annotationId = annotation.pageannotation;

        if (annotation.itemfieldtype === 'CHECKBOXINPUT') {
          annotationId = annotation.annotationid;
        }

        const { x1, y1, x2, y2 } = annotation;
        const coordinates: AnnotationCoordinates = { x1, y1, x2, y2 };

        const pageContainer = document.getElementById(`${id}-page-${page + 1}`);
        if (!pageContainer) return;
        const pageBounds = pageContainer.getBoundingClientRect();

        const pageInfo = typedDoc.pageContainers.find((p) => p.page === page);
        if (!pageInfo) return;
        const scale = pageBounds.height / pageInfo.containerBounds.originalHeight;
        const pageBottom = pageBounds.bottom - bounds.top;
        const pageLeft = pageBounds.left - bounds.left;

        const mappedCoordinates = _mapAnnotation(coordinates, scale, pageBottom, pageLeft);
        // scale ~1.333 - for 100% scale in pdf.js (it doesn't change).
        const annotationStyle: AnnotationStyle = {
          fontSize: floor(annotation.original_font_size * scale, 2) + 'pt',
          fontFamily: annotation.fontfamily || 'Arial',
          originalFontSize: floor(annotation.original_font_size * scale, 2),
          coordinates: mappedCoordinates,
        };

        const field: MappedAnnotationField = {
          documentId: id,
          fieldId,
          page,
          annotationId,
          originalAnnotationId: annotation.originalannotationid,
          coordinates: mappedCoordinates,
          style: annotationStyle,
          nostyle: nostyle ?? false,
        };

        mappedAnnotations.push(field);
      });
    });

    return mappedAnnotations;
  });

  /**
   * Map annotation coordinates to CSS positioning
   *
   * @param coordinates - Raw annotation coordinates
   * @param scale - Scale factor for the page
   * @param pageBottom - Bottom position of the page
   * @param boundsLeft - Left offset of the page bounds
   * @returns Mapped coordinates with CSS values
   */
  const _mapAnnotation = (
    coordinates: AnnotationCoordinates,
    scale: number,
    pageBottom: number,
    boundsLeft: number,
  ): MappedCoordinates => {
    const { x1, y1, x2, y2 } = coordinates;
    const mappedX1 = x1 * scale;
    const mappedY1 = y1 * scale;
    const mappedX2 = x2 * scale;
    const mappedY2 = y2 * scale;

    return {
      top: `${pageBottom - mappedY2}px`,
      left: `${mappedX1 + boundsLeft}px`,
      minWidth: `${mappedX2 - mappedX1}px`,
      minHeight: `${mappedY2 - mappedY1}px`,
    };
  };

  return {
    hrbrFieldsConfig,
    fieldComponentsMap,

    // Getters
    getAnnotations,
    getField,
  };
});
