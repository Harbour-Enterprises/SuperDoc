import { allowedChildren, hasElement, getSchema } from './index.js';

export const getChildren = (element) => {
  console.debug(`Getting children for element: ${element}`);
  if (!element) {
    console.error('Error: Element name required');
    console.log('Usage: node bin/ooxml children <element>');
    process.exit(1);
  }

  try {
    const children = allowedChildren(element);
    if (children.length === 0) {
      if (hasElement(element)) {
        console.log(`${element} has no children (leaf element or simple content)`);
      } else {
        console.log(`Element ${element} not found in schema`);

        // Try to suggest similar elements
        const { elements } = getSchema();
        const allElements = Object.keys(elements);
        const prefix = element.split(':')[0];
        const similar = allElements.filter((el) => el.startsWith(prefix + ':')).slice(0, 5);
        if (similar.length > 0) {
          console.log('\nDid you mean one of these?');
          similar.forEach((el) => console.log(`  - ${el}`));
        }
      }
    } else {
      console.log(`Allowed children for ${element}:`);
      children.forEach((child) => console.log(`  - ${child}`));
      console.log(`\nTotal: ${children.length} allowed children`);
    }
  } catch (err) {
    if (err.message.includes('No schema JSON found')) {
      console.error('Error: Schema not found. Run generator first:');
      console.log('  node bin/ooxml');
    } else {
      throw err;
    }
  }
};
