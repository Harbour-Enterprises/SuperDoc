export function generateDocxListAttributes(listType: any): {
    attributes: {
        parentAttributes: {
            'w14:paraId': any;
            'w14:textId': any;
            'w:rsidR': any;
            'w:rsidRDefault': any;
            'w:rsidP': any;
            paragraphProperties: {
                type: string;
                name: string;
                elements: ({
                    type: string;
                    name: string;
                    attributes: {
                        'w:val': string;
                    };
                    elements?: undefined;
                } | {
                    type: string;
                    name: string;
                    elements: {
                        type: string;
                        name: string;
                        attributes: {
                            'w:val': any;
                        };
                    }[];
                    attributes?: undefined;
                })[];
            };
        };
    };
};
//# sourceMappingURL=generateDocxListAttributes.d.ts.map