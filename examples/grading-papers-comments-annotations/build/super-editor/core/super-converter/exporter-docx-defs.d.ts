/**
 * @typedef {Object} CommentsXmlDefinitions
 * @property {Object} COMMENTS_XML_DEF - XML definition for the basic comments structure.
 * @property {Object} COMMENTS_EXTENDED_XML_DEF - XML definition for extended comments.
 * @property {Object} COMMENTS_EXTENSIBLE_XML_DEF - XML definition for extensible comments.
 * @property {Object} COMMENTS_IDS_XML_DEF - XML definition for comment identifiers.
 * @property {Object} DOCUMENT_RELS_XML_DEF - XML definition for document relationships.
 * @property {Object} PEOPLE_XML_DEF - XML definition for people-related information.
 * @property {Object} CONTENT_TYPES - XML definition for custom settings.
 */
export const DEFAULT_DOCX_DEFS: {
    'xmlns:wpc': string;
    'xmlns:cx': string;
    'xmlns:cx1': string;
    'xmlns:cx2': string;
    'xmlns:cx3': string;
    'xmlns:cx4': string;
    'xmlns:cx5': string;
    'xmlns:cx6': string;
    'xmlns:cx7': string;
    'xmlns:cx8': string;
    'xmlns:mc': string;
    'xmlns:aink': string;
    'xmlns:am3d': string;
    'xmlns:o': string;
    'xmlns:oel': string;
    'xmlns:r': string;
    'xmlns:m': string;
    'xmlns:v': string;
    'xmlns:wp14': string;
    'xmlns:wp': string;
    'xmlns:w10': string;
    'xmlns:w': string;
    'xmlns:w14': string;
    'xmlns:w15': string;
    'xmlns:w16cex': string;
    'xmlns:w16cid': string;
    'xmlns:w16': string;
    'xmlns:w16du': string;
    'xmlns:w16sdtdh': string;
    'xmlns:w16sdtfl': string;
    'xmlns:w16se': string;
    'xmlns:wpg': string;
    'xmlns:wpi': string;
    'xmlns:wne': string;
    'xmlns:wps': string;
    'mc:Ignorable': string;
};
export namespace DEFAULT_CUSTOM_XML {
    let elements: {
        type: string;
        name: string;
        attributes: {
            xmlns: string;
            'xmlns:vt': string;
        };
        elements: any[];
    }[];
}
export namespace SETTINGS_CUSTOM_XML {
    let elements_1: {
        type: string;
        name: string;
        attributes: {
            'xmlns:w': string;
        };
        elements: any[];
    }[];
    export { elements_1 as elements };
}
export namespace COMMENT_REF {
    export let type: string;
    export let name: string;
    let elements_2: ({
        type: string;
        name: string;
        elements: {
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
        }[];
    } | {
        type: string;
        name: string;
        elements?: undefined;
    })[];
    export { elements_2 as elements };
}
export namespace DEFAULT_LINKED_STYLES {
    namespace Normal {
        let type_1: string;
        export { type_1 as type };
        let name_1: string;
        export { name_1 as name };
        export let attributes: {
            'w:type': string;
            'w:default': string;
            'w:styleId': string;
        };
        let elements_3: ({
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
        } | {
            type: string;
            name: string;
            attributes?: undefined;
        })[];
        export { elements_3 as elements };
    }
    namespace Title {
        let type_2: string;
        export { type_2 as type };
        let name_2: string;
        export { name_2 as name };
        let attributes_1: {
            'w:type': string;
            'w:styleId': string;
        };
        export { attributes_1 as attributes };
        let elements_4: ({
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
            elements?: undefined;
        } | {
            type: string;
            name: string;
            attributes?: undefined;
            elements?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes: {
                    'w:after': string;
                };
            } | {
                type: string;
                name: string;
                attributes?: undefined;
            })[];
            attributes?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes: {
                    'w:asciiTheme': string;
                    'w:eastAsiaTheme': string;
                    'w:hAnsiTheme': string;
                    'w:cstheme': string;
                    'w:val'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                };
            })[];
            attributes?: undefined;
        })[];
        export { elements_4 as elements };
    }
    namespace Subtitle {
        let type_3: string;
        export { type_3 as type };
        let name_3: string;
        export { name_3 as name };
        let attributes_2: {
            'w:type': string;
            'w:styleId': string;
        };
        export { attributes_2 as attributes };
        let elements_5: ({
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
            elements?: undefined;
        } | {
            type: string;
            name: string;
            attributes?: undefined;
            elements?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                elements: {
                    type: string;
                    name: string;
                    attributes: {
                        'w:val': string;
                    };
                }[];
                attributes?: undefined;
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:after': string;
                };
                elements?: undefined;
            })[];
            attributes?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes: {
                    'w:asciiTheme': string;
                    'w:eastAsiaTheme': string;
                    'w:hAnsiTheme': string;
                    'w:cstheme': string;
                    'w:val'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeTint'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:themeColor': string;
                    'w:themeTint': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeTint'?: undefined;
                };
            })[];
            attributes?: undefined;
        })[];
        export { elements_5 as elements };
    }
    namespace Heading1 {
        let type_4: string;
        export { type_4 as type };
        let name_4: string;
        export { name_4 as name };
        let attributes_3: {
            'w:type': string;
            'w:styleId': string;
        };
        export { attributes_3 as attributes };
        let elements_6: ({
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
            elements?: undefined;
        } | {
            type: string;
            name: string;
            attributes?: undefined;
            elements?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes?: undefined;
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:before': string;
                    'w:after': string;
                    'w:val'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:before'?: undefined;
                    'w:after'?: undefined;
                };
            })[];
            attributes?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes: {
                    'w:asciiTheme': string;
                    'w:eastAsiaTheme': string;
                    'w:hAnsiTheme': string;
                    'w:cstheme': string;
                    'w:val'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeShade'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:themeColor': string;
                    'w:themeShade': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeShade'?: undefined;
                };
            })[];
            attributes?: undefined;
        })[];
        export { elements_6 as elements };
    }
    namespace Heading2 {
        let type_5: string;
        export { type_5 as type };
        let name_5: string;
        export { name_5 as name };
        let attributes_4: {
            'w:type': string;
            'w:styleId': string;
        };
        export { attributes_4 as attributes };
        let elements_7: ({
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
            elements?: undefined;
        } | {
            type: string;
            name: string;
            attributes?: undefined;
            elements?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes?: undefined;
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:before': string;
                    'w:after': string;
                    'w:val'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:before'?: undefined;
                    'w:after'?: undefined;
                };
            })[];
            attributes?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes: {
                    'w:asciiTheme': string;
                    'w:eastAsiaTheme': string;
                    'w:hAnsiTheme': string;
                    'w:cstheme': string;
                    'w:val'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeShade'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:themeColor': string;
                    'w:themeShade': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:asciiTheme'?: undefined;
                    'w:eastAsiaTheme'?: undefined;
                    'w:hAnsiTheme'?: undefined;
                    'w:cstheme'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeShade'?: undefined;
                };
            })[];
            attributes?: undefined;
        })[];
        export { elements_7 as elements };
    }
    namespace Heading3 {
        let type_6: string;
        export { type_6 as type };
        let name_6: string;
        export { name_6 as name };
        let attributes_5: {
            'w:type': string;
            'w:styleId': string;
        };
        export { attributes_5 as attributes };
        let elements_8: ({
            type: string;
            name: string;
            attributes: {
                'w:val': string;
            };
            elements?: undefined;
        } | {
            type: string;
            name: string;
            attributes?: undefined;
            elements?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes?: undefined;
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:before': string;
                    'w:after': string;
                    'w:val'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:before'?: undefined;
                    'w:after'?: undefined;
                };
            })[];
            attributes?: undefined;
        } | {
            type: string;
            name: string;
            elements: ({
                type: string;
                name: string;
                attributes: {
                    'w:eastAsiaTheme': string;
                    'w:cstheme': string;
                    'w:val'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeShade'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:themeColor': string;
                    'w:themeShade': string;
                    'w:eastAsiaTheme'?: undefined;
                    'w:cstheme'?: undefined;
                };
            } | {
                type: string;
                name: string;
                attributes: {
                    'w:val': string;
                    'w:eastAsiaTheme'?: undefined;
                    'w:cstheme'?: undefined;
                    'w:themeColor'?: undefined;
                    'w:themeShade'?: undefined;
                };
            })[];
            attributes?: undefined;
        })[];
        export { elements_8 as elements };
    }
}
export namespace COMMENTS_XML_DEF {
    export namespace declaration {
        export namespace attributes_6 {
            let version: string;
            let encoding: string;
            let standalone: string;
        }
        export { attributes_6 as attributes };
    }
    let elements_9: {
        type: string;
        name: string;
        attributes: {
            'xmlns:wpc': string;
            'xmlns:cx': string;
            'xmlns:cx1': string;
            'xmlns:cx2': string;
            'xmlns:cx3': string;
            'xmlns:cx4': string;
            'xmlns:cx5': string;
            'xmlns:cx6': string;
            'xmlns:cx7': string;
            'xmlns:cx8': string;
            'xmlns:mc': string;
            'xmlns:aink': string;
            'xmlns:am3d': string;
            'xmlns:o': string;
            'xmlns:oel': string;
            'xmlns:r': string;
            'xmlns:m': string;
            'xmlns:v': string;
            'xmlns:wp14': string;
            'xmlns:wp': string;
            'xmlns:w10': string;
            'xmlns:w': string;
            'xmlns:w14': string;
            'xmlns:w15': string;
            'xmlns:w16cex': string;
            'xmlns:w16cid': string;
            'xmlns:w16': string;
            'xmlns:w16du': string;
            'xmlns:w16sdtdh': string;
            'xmlns:w16sdtfl': string;
            'xmlns:w16se': string;
            'xmlns:wpg': string;
            'xmlns:wpi': string;
            'xmlns:wne': string;
            'xmlns:wps': string;
            'mc:Ignorable': string;
        };
        elements: any[];
    }[];
    export { elements_9 as elements };
}
export namespace COMMENTS_EXTENDED_XML_DEF {
    export namespace declaration_1 {
        export namespace attributes_7 {
            let version_1: string;
            export { version_1 as version };
            let encoding_1: string;
            export { encoding_1 as encoding };
            let standalone_1: string;
            export { standalone_1 as standalone };
        }
        export { attributes_7 as attributes };
    }
    export { declaration_1 as declaration };
    let elements_10: {
        type: string;
        name: string;
        attributes: {
            'xmlns:wpc': string;
            'xmlns:cx': string;
            'xmlns:cx1': string;
            'xmlns:cx2': string;
            'xmlns:cx3': string;
            'xmlns:cx4': string;
            'xmlns:cx5': string;
            'xmlns:cx6': string;
            'xmlns:cx7': string;
            'xmlns:cx8': string;
            'xmlns:mc': string;
            'xmlns:aink': string;
            'xmlns:am3d': string;
            'xmlns:o': string;
            'xmlns:oel': string;
            'xmlns:r': string;
            'xmlns:m': string;
            'xmlns:v': string;
            'xmlns:wp14': string;
            'xmlns:wp': string;
            'xmlns:w10': string;
            'xmlns:w': string;
            'xmlns:w14': string;
            'xmlns:w15': string;
            'xmlns:w16cex': string;
            'xmlns:w16cid': string;
            'xmlns:w16': string;
            'xmlns:w16du': string;
            'xmlns:w16sdtdh': string;
            'xmlns:w16sdtfl': string;
            'xmlns:w16se': string;
            'xmlns:wpg': string;
            'xmlns:wpi': string;
            'xmlns:wne': string;
            'xmlns:wps': string;
            'mc:Ignorable': string;
        };
        elements: any[];
    }[];
    export { elements_10 as elements };
}
export namespace COMMENTS_EXTENSIBLE_XML_DEF {
    export namespace declaration_2 {
        export namespace attributes_8 {
            let version_2: string;
            export { version_2 as version };
            let encoding_2: string;
            export { encoding_2 as encoding };
            let standalone_2: string;
            export { standalone_2 as standalone };
        }
        export { attributes_8 as attributes };
    }
    export { declaration_2 as declaration };
    let elements_11: {
        type: string;
        name: string;
        attributes: {
            'xmlns:wpc': string;
            'xmlns:cx': string;
            'xmlns:cx1': string;
            'xmlns:cx2': string;
            'xmlns:cx3': string;
            'xmlns:cx4': string;
            'xmlns:cx5': string;
            'xmlns:cx6': string;
            'xmlns:cx7': string;
            'xmlns:cx8': string;
            'xmlns:cr': string;
            'xmlns:mc': string;
            'xmlns:aink': string;
            'xmlns:am3d': string;
            'xmlns:o': string;
            'xmlns:oel': string;
            'xmlns:r': string;
            'xmlns:m': string;
            'xmlns:v': string;
            'xmlns:wp14': string;
            'xmlns:wp': string;
            'xmlns:w10': string;
            'xmlns:w': string;
            'xmlns:w14': string;
            'xmlns:w15': string;
            'xmlns:w16cex': string;
            'xmlns:w16cid': string;
            'xmlns:w16': string;
            'xmlns:w16du': string;
            'xmlns:w16sdtdh': string;
            'xmlns:w16sdtfl': string;
            'xmlns:w16se': string;
            'xmlns:wpg': string;
            'xmlns:wpi': string;
            'xmlns:wne': string;
            'xmlns:wps': string;
            'mc:Ignorable': string;
        };
        elements: any[];
    }[];
    export { elements_11 as elements };
}
export namespace COMMENTS_IDS_XML_DEF {
    export namespace declaration_3 {
        export namespace attributes_9 {
            let version_3: string;
            export { version_3 as version };
            let encoding_3: string;
            export { encoding_3 as encoding };
            let standalone_3: string;
            export { standalone_3 as standalone };
        }
        export { attributes_9 as attributes };
    }
    export { declaration_3 as declaration };
    let elements_12: {
        type: string;
        name: string;
        attributes: {
            'xmlns:wpc': string;
            'xmlns:cx': string;
            'xmlns:cx1': string;
            'xmlns:cx2': string;
            'xmlns:cx3': string;
            'xmlns:cx4': string;
            'xmlns:cx5': string;
            'xmlns:cx6': string;
            'xmlns:cx7': string;
            'xmlns:cx8': string;
            'xmlns:mc': string;
            'xmlns:aink': string;
            'xmlns:am3d': string;
            'xmlns:o': string;
            'xmlns:oel': string;
            'xmlns:r': string;
            'xmlns:m': string;
            'xmlns:v': string;
            'xmlns:wp14': string;
            'xmlns:wp': string;
            'xmlns:w10': string;
            'xmlns:w': string;
            'xmlns:w14': string;
            'xmlns:w15': string;
            'xmlns:w16cex': string;
            'xmlns:w16cid': string;
            'xmlns:w16': string;
            'xmlns:w16du': string;
            'xmlns:w16sdtdh': string;
            'xmlns:w16sdtfl': string;
            'xmlns:w16se': string;
            'xmlns:wpg': string;
            'xmlns:wpi': string;
            'xmlns:wne': string;
            'xmlns:wps': string;
            'mc:Ignorable': string;
        };
        elements: any[];
    }[];
    export { elements_12 as elements };
}
export namespace DOCUMENT_RELS_XML_DEF {
    export namespace declaration_4 {
        export namespace attributes_10 {
            let version_4: string;
            export { version_4 as version };
            let encoding_4: string;
            export { encoding_4 as encoding };
            let standalone_4: string;
            export { standalone_4 as standalone };
        }
        export { attributes_10 as attributes };
    }
    export { declaration_4 as declaration };
    let elements_13: {
        type: string;
        name: string;
        attributes: {
            xmlns: string;
        };
        elements: {
            type: string;
            name: string;
            attributes: {
                Id: string;
                Type: string;
                Target: string;
            };
        }[];
    }[];
    export { elements_13 as elements };
}
export namespace PEOPLE_XML_DEF {
    export namespace declaration_5 {
        export namespace attributes_11 {
            let version_5: string;
            export { version_5 as version };
            let encoding_5: string;
            export { encoding_5 as encoding };
            let standalone_5: string;
            export { standalone_5 as standalone };
        }
        export { attributes_11 as attributes };
    }
    export { declaration_5 as declaration };
    let elements_14: {
        type: string;
        name: string;
        attributes: {
            'xmlns:wpc': string;
            'xmlns:cx': string;
            'xmlns:cx1': string;
            'xmlns:cx2': string;
            'xmlns:cx3': string;
            'xmlns:cx4': string;
            'xmlns:cx5': string;
            'xmlns:cx6': string;
            'xmlns:cx7': string;
            'xmlns:cx8': string;
            'xmlns:mc': string;
            'xmlns:aink': string;
            'xmlns:am3d': string;
            'xmlns:o': string;
            'xmlns:oel': string;
            'xmlns:r': string;
            'xmlns:m': string;
            'xmlns:v': string;
            'xmlns:wp14': string;
            'xmlns:wp': string;
            'xmlns:w10': string;
            'xmlns:w': string;
            'xmlns:w14': string;
            'xmlns:w15': string;
            'xmlns:w16cex': string;
            'xmlns:w16cid': string;
            'xmlns:w16': string;
            'xmlns:w16du': string;
            'xmlns:w16sdtdh': string;
            'xmlns:w16sdtfl': string;
            'xmlns:w16se': string;
            'xmlns:wpg': string;
            'xmlns:wpi': string;
            'xmlns:wne': string;
            'xmlns:wps': string;
            'mc:Ignorable': string;
        };
        elements: {
            type: string;
            name: string;
            attributes: {
                'w15:author': string;
            };
            elements: any[];
        }[];
    }[];
    export { elements_14 as elements };
}
export namespace CONTENT_TYPES {
    export namespace declaration_6 {
        export namespace attributes_12 {
            let version_6: string;
            export { version_6 as version };
            let encoding_6: string;
            export { encoding_6 as encoding };
            let standalone_6: string;
            export { standalone_6 as standalone };
        }
        export { attributes_12 as attributes };
    }
    export { declaration_6 as declaration };
    let elements_15: {
        type: string;
        name: string;
        attributes: {
            xmlns: string;
        };
        elements: ({
            type: string;
            name: string;
            attributes: {
                Extension: string;
                ContentType: string;
                PartName?: undefined;
            };
        } | {
            type: string;
            name: string;
            attributes: {
                PartName: string;
                ContentType: string;
                Extension?: undefined;
            };
        })[];
    }[];
    export { elements_15 as elements };
}
/**
 * @type {CommentsXmlDefinitions}
 */
export const COMMENTS_XML_DEFINITIONS: CommentsXmlDefinitions;
export type CommentsXmlDefinitions = {
    /**
     * - XML definition for the basic comments structure.
     */
    COMMENTS_XML_DEF: any;
    /**
     * - XML definition for extended comments.
     */
    COMMENTS_EXTENDED_XML_DEF: any;
    /**
     * - XML definition for extensible comments.
     */
    COMMENTS_EXTENSIBLE_XML_DEF: any;
    /**
     * - XML definition for comment identifiers.
     */
    COMMENTS_IDS_XML_DEF: any;
    /**
     * - XML definition for document relationships.
     */
    DOCUMENT_RELS_XML_DEF: any;
    /**
     * - XML definition for people-related information.
     */
    PEOPLE_XML_DEF: any;
    /**
     * - XML definition for custom settings.
     */
    CONTENT_TYPES: any;
};
//# sourceMappingURL=exporter-docx-defs.d.ts.map