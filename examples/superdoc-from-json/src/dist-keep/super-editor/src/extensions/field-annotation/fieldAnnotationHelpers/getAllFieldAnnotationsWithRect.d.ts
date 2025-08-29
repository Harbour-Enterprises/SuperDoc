/**
 * Get all field annotations with rects in the doc.
 * @param view The editor view.
 * @param state The editor state.
 * @returns The array of field annotations with rects.
 */
export function getAllFieldAnnotationsWithRect(view: any, state: any): {
    node: any;
    pos: any;
    rect: {
        toJSON: () => {
            top: number;
            bottom: number;
            left: number;
            right: number;
            width: number;
            height: number;
            x: number;
            y: number;
        };
        top: number;
        bottom: number;
        left: number;
        right: number;
        width: number;
        height: number;
        x: number;
        y: number;
    };
}[];
