# TypeScript Migration Guide

This document outlines the guidelines and conventions for gradually migrating the SuperDoc monorepo from JavaScript to TypeScript.

## Overview

The migration is being done in phases to minimize disruption to ongoing development. This approach allows us to:

- Maintain full backward compatibility during the migration
- Test incrementally as we convert files
- Learn and adjust our patterns as we go
- Avoid blocking other development work

## Infrastructure Setup (Phase 0 - Complete)

### Root Configuration

The monorepo uses a shared TypeScript configuration at the root:

- **`tsconfig.base.json`**: Base configuration that all packages extend
- Key settings:
  - `allowJs: true` - Allows mixing `.js` and `.ts` files
  - `checkJs: false` - Does not type-check JavaScript files (gradual migration)
  - `strict: false` - Relaxed type checking initially
  - `skipLibCheck: true` - Faster builds, skip checking node_modules types
  - `module: "ESNext"` with `moduleResolution: "node"` - Compatible with existing codebase

### Package Configuration

Each package extends the root config and adds package-specific settings:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    // Package-specific overrides
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      // Path aliases
    }
  },
  "include": ["./src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.js"]
}
```

### Type Checking

Run type checking across the entire codebase:

```bash
npm run type-check
```

This command runs TypeScript in "no emit" mode, checking types without generating files.

**Note**: During Phase 0, this command may show errors in JavaScript files since path aliases are configured per-package. These errors don't affect builds or tests. As files are migrated to TypeScript, this command will become more useful for catching actual type errors in `.ts` files.

For package-specific type checking:

```bash
# Check types in super-editor
npm run types:check --workspace=packages/super-editor

# Build type declarations
npm run types:build --workspace=packages/super-editor
```

## Migration Guidelines

### When to Migrate a File

Consider migrating a file to TypeScript when:

1. **Making significant changes** - If you're refactoring or adding major features
2. **Creating new files** - All new files should be `.ts` (or `.vue` with `<script lang="ts">`)
3. **Working on core logic** - Prioritize type safety in critical paths
4. **Fixing type-related bugs** - Convert the file to prevent similar issues

### File Naming Conventions

- **TypeScript files**: Use `.ts` extension
- **Vue components**: Use `.vue` with `<script lang="ts">` in the script tag
- **Type declaration files**: Use `.d.ts` for ambient declarations
- **Keep tests adjacent**: If `foo.js` becomes `foo.ts`, `foo.test.js` can stay `.js` initially

### Common Migration Patterns

#### 1. Basic File Migration

**Before** (`helper.js`):

```javascript
export function formatDate(date) {
  return date.toISOString();
}
```

**After** (`helper.ts`):

```typescript
export function formatDate(date: Date): string {
  return date.toISOString();
}
```

#### 2. Importing from Mixed Sources

```typescript
// Importing from .js files (they still work)
import { oldFunction } from './legacy-file.js';

// Importing from .ts files
import { newFunction } from './new-file';

// Both work together
export function combined() {
  return oldFunction() + newFunction();
}
```

#### 3. Vue Components

**Before**:

```vue
<script>
export default {
  props: {
    title: String,
  },
};
</script>
```

**After**:

```vue
<script lang="ts">
export default {
  props: {
    title: {
      type: String,
      required: true,
    },
  },
};
</script>
```

Or with `<script setup>`:

```vue
<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
```

#### 4. ProseMirror Node/Mark Types

```typescript
import { Node as PMNode, Mark } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';

export function updateNodeAttrs(node: PMNode, attrs: Record<string, any>): PMNode {
  return node.type.create({ ...node.attrs, ...attrs }, node.content);
}
```

#### 5. Extension Pattern

```typescript
import { Extension } from '@/core/Extension';
import { Node as PMNode } from 'prosemirror-model';

export interface MyExtensionOptions {
  enabled?: boolean;
  customValue?: string;
}

export class MyExtension extends Extension<MyExtensionOptions> {
  name = 'myExtension';

  defaultOptions: MyExtensionOptions = {
    enabled: true,
    customValue: 'default',
  };

  // Your extension implementation
}
```

### Type Safety Levels

Start with minimal types and gradually increase strictness:

1. **Level 1 - Basic types**: Add parameter and return types

   ```typescript
   function add(a: number, b: number): number {
     return a + b;
   }
   ```

2. **Level 2 - Interfaces**: Define clear contracts

   ```typescript
   interface User {
     id: string;
     name: string;
     email: string;
   }

   function getUser(id: string): User {
     // ...
   }
   ```

3. **Level 3 - Generics**: Reusable, type-safe utilities

   ```typescript
   function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
     return items.find((item) => item.id === id);
   }
   ```

4. **Level 4 - Advanced types**: Discriminated unions, mapped types, etc.
   ```typescript
   type CommandResult = { success: true; data: any } | { success: false; error: string };
   ```

### Handling `any` Types

When you encounter types that are hard to define:

1. **Prefer `unknown` over `any`** when possible

   ```typescript
   // Bad
   function process(data: any) {}

   // Better
   function process(data: unknown) {
     if (typeof data === 'string') {
       // TypeScript now knows data is string
     }
   }
   ```

2. **Use `TODO` comments** for complex types to revisit later

   ```typescript
   // TODO: Define proper type for ProseMirror node attrs
   function setAttrs(node: any, attrs: any) {}
   ```

3. **Create type stubs** for third-party libraries without types
   ```typescript
   // types/legacy-lib.d.ts
   declare module 'legacy-lib' {
     export function doSomething(input: any): any;
   }
   ```

## Testing TypeScript Files

- Tests can remain `.js` files initially
- Import TypeScript modules normally in test files
- Gradually migrate tests to `.ts` for better type safety
- Run tests as usual: `npm test`

## Build Process

The build process handles both `.js` and `.ts` files:

1. **Vite** handles bundling both file types
2. **TypeScript compiler** generates `.d.ts` declaration files
3. No changes needed to existing build scripts

## Common Issues and Solutions

### Issue: Import path needs `.js` extension with NodeNext

**Problem**: When using `module: "NodeNext"`, TypeScript requires explicit file extensions.

**Solution**: We use `module: "ESNext"` with `moduleResolution: "node"` to avoid this issue during migration.

### Issue: Path aliases not resolving

**Problem**: `@core/*` or other aliases not found.

**Solution**: Ensure the package's `tsconfig.json` has the correct `paths` configuration:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["./src/core/*"],
      "@extensions/*": ["./src/extensions/*"]
    }
  }
}
```

### Issue: Type errors in JavaScript files

**Problem**: TypeScript reporting errors in `.js` files.

**Solution**: Ensure `checkJs: false` in tsconfig. We only want to check `.ts` files during migration.

## Migration Priority

Suggested order for migrating files:

1. **Utilities and helpers** - Pure functions, easy to type
2. **Core types** - Schema definitions, common interfaces
3. **Extensions** - Self-contained, well-defined APIs
4. **Commands** - Clear input/output contracts
5. **Components** - Vue components last (can use JSDoc types interim)

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vue 3 + TypeScript Guide](https://vuejs.org/guide/typescript/overview.html)
- [ProseMirror TypeScript Examples](https://github.com/ProseMirror/prosemirror-view/blob/master/src/index.ts)

## Questions or Issues?

If you encounter migration challenges:

1. Check this guide first
2. Look at recently migrated files for patterns
3. Ask in the team chat or create a discussion issue
4. Update this guide with new patterns as we learn

---

**Last Updated**: Phase 0 Complete (Infrastructure Setup)
