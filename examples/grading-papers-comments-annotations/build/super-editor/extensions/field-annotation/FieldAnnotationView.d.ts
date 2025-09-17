export class FieldAnnotationView {
    constructor(options: any);
    editor: any;
    node: any;
    decorations: any;
    getPos: any;
    htmlAttributes: any;
    dom: any;
    annotationClass: any;
    annotationContentClass: any;
    borderColor: any;
    handleAnnotationClick(event: any): void;
    handleAnnotationDoubleClick(event: any): void;
    handleSelectionUpdate({ editor, transaction }: {
        editor: any;
        transaction: any;
    }): void;
    buildView(): void;
    buildTextView(): void;
    buildImageView(): void;
    buildSignatureView(): void;
    buildCheckboxView(): void;
    buildHTMLView(): void;
    buildLinkView(): void;
    attachEventListeners(): void;
    removeEventListeners(): void;
    stopEvent(event: any): boolean;
    update(updatedNode: any): boolean;
    ignoreMutation(mutation: any): boolean;
    destroy(): void;
    updateAttributes(attributes: any): void;
    #private;
}
//# sourceMappingURL=FieldAnnotationView.d.ts.map