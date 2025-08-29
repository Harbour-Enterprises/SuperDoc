export function generateDocxListAttributes(listType: any): {
    attributes: {
        parentAttributes: {
            'w14:paraId': string;
            'w14:textId': string;
            'w:rsidR': string;
            'w:rsidRDefault': string;
            'w:rsidP': string;
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
