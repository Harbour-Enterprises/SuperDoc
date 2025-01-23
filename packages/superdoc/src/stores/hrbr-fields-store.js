import { defineStore, storeToRefs } from 'pinia';
import { computed, reactive, markRaw } from 'vue';
import { useSuperdocStore } from './superdoc-store';
import TextField from '@/components/HrbrFieldsLayer/TextField.vue';
import ParagraphField from '@/components/HrbrFieldsLayer/ParagraphField.vue';
import ImageField from '@/components/HrbrFieldsLayer/ImageField.vue';
import CheckboxField from '@/components/HrbrFieldsLayer/CheckboxField.vue';
import SelectField from '@/components/HrbrFieldsLayer/SelectField.vue';

export const useHrbrFieldsStore = defineStore('hrbr-fields', () => {
  const superdocStore = useSuperdocStore();
  const { documents, pages } = storeToRefs(superdocStore);
  const hrbrFieldsConfig = reactive({
    name: 'hrbr-fields',
  });

  const fieldComponentsMap = Object.freeze({
    TEXTINPUT: markRaw(TextField),
    HTMLINPUT: markRaw(ParagraphField),
    SELECT: markRaw(SelectField),
    CHECKBOXINPUT: markRaw(CheckboxField),
    SIGNATUREINPUT: markRaw(ImageField),
    IMAGEINPUT: markRaw(ImageField),
  });

  const getField = (documentId, fieldId) => {
    const doc = documents.value.find((d) => d.id === documentId);
    if (!doc) return;

    const field = doc.fields.find((f) => f.id === fieldId);
    if (field) return field;
  };

  const getAnnotations = computed(() => {
    const mappedAnnotations = [];
    documents.value.forEach((doc) => {
      const { id, annotations } = doc;

      const docContainer = doc.container;
      if (!docContainer) return;

      const bounds = docContainer.getBoundingClientRect();
      const pageBoundsMap = doc.pageContainers;
      if (!bounds || !pageBoundsMap) return;

      annotations.forEach((annotation) => {
        const { itemid: fieldId, page, nostyle } = annotation;

        let annotationId = annotation.pageannotation;

        if (annotation.itemfieldtype === 'CHECKBOXINPUT') {
          annotationId = annotation.annotationid;
        }

        const { x1, y1, x2, y2 } = annotation;
        const coordinates = { x1, y1, x2, y2 };

        const pageContainer = document.getElementById(`${id}-page-${page + 1}`);
        if (!pageContainer) return;
        const pageBounds = pageContainer.getBoundingClientRect();

        const pageInfo = doc.pageContainers.find((p) => p.page === page + 1);
        const scale = pageBounds.height / pageInfo.containerBounds.originalHeight;
        const pageBottom = pageBounds.bottom - bounds.top;
        const pageLeft = pageBounds.left - bounds.left;

        const mappedCoordinates = _mapAnnotation(coordinates, scale, pageBottom, pageLeft);
        const annotationStyle = {
          fontSize: annotation.original_font_size + 'px',
          originalFontSize: annotation.original_font_size,
          coordinates: mappedCoordinates,
        };

        const field = {
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

  const _mapAnnotation = (coordinates, scale, pageBottom, boundsLeft) => {
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
