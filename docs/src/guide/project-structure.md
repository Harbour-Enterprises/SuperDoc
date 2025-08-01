---
{ 'home': True, 'prev': False, 'next': False }
---

# Project Structure

SuperDoc consists of two main packages:

```
/packages/super-editor  // Core editor package
/packages/superdoc      // Main SuperDoc package
```

### SuperDoc Package

This is the main package (published to npm). It includes SuperEditor and provides the complete document editing experience.

```bash
cd packages/superdoc
npm install && npm run dev
```

This will run **SuperdocDev.vue**, with a Vue 3 based example of how to instantiate SuperDoc.

### SuperEditor Package

This is the core DOCX editor and renderer (including the toolbar). It is included inside SuperDoc but can be used independently for advanced use cases.

```bash
cd packages/super-editor
npm install && npm run dev
```

## Next

- See [Integration](/guide/integration) for framework-specific integration guides
- Explore [Components](/guide/components) for detailed component reference
- Check out [Resources](/guide/resources) for examples, FAQ, and community resources
