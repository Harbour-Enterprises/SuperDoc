export function makeColorOption(color: any, label?: any): {
    label: any;
    icon: any;
    value: any;
    style: {
        color: any;
        boxShadow: string;
        borderRadius: string;
    };
};
export function renderColorOptions(superToolbar: any, button: any, customIcons?: any[], hasNoneIcon?: boolean): import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>;
export function getAvailableColorOptions(): any[];
