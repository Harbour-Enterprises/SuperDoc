import jsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    files: ['packages/super-editor/src/extensions/**/*.js'],
    plugins: {
      jsdoc
    },
    rules: {
      // Start with just requiring JSDoc on public APIs
      'jsdoc/require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: false,      // function myFunc() {}
          MethodDefinition: false,         // class methods
          ClassDeclaration: false,         // class MyClass {}
          ArrowFunctionExpression: false,  // const func = () => {}
          FunctionExpression: false        // const func = function() {}
        },
        contexts: [
          // Extension exports (Extension.create(...))
          'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > CallExpression[callee.property.name="create"]',

          // Commands - both arrow functions and method definitions
          'Property[key.name="addCommands"] > ArrowFunctionExpression',
          'MethodDefinition[key.name="addCommands"]',

          // Helpers - both arrow functions and method definitions
          'Property[key.name="addHelpers"] > ArrowFunctionExpression',
          'MethodDefinition[key.name="addHelpers"]'
        ]
      }],

      // Validate existing JSDoc comments
      'jsdoc/require-param-type': 'error',     // @param must have {Type}
      'jsdoc/require-returns': 'error',        // Functions must document return
      'jsdoc/require-returns-type': 'error',   // @returns must have {Type}
      'jsdoc/check-param-names': 'error',      // @param names must match function params
      'jsdoc/check-types': 'error',            // Validate type syntax (string not String)
      'jsdoc/require-hyphen-before-param-description': ['error', 'always'], // @param {Type} name - Description

      // Essential rules from standards
      'jsdoc/require-example': ['error', {      // Commands need examples
        contexts: [
          'Property[key.name=/^(add|update|delete|set|toggle|reset)/]'
        ]
      }],
      'jsdoc/no-undefined-types': ['error', {
        definedTypes: [
          // ProseMirror types
          'EditorState', 'Transaction', 'Node', 'Mark', 'Schema',
          'Selection', 'Editor', 'EditorView',
          // DOM types
          'DOMRect', 'HTMLElement'
        ]
      }]
    },
    settings: {
      jsdoc: {
        mode: 'typescript'
      }
    }
  }
];