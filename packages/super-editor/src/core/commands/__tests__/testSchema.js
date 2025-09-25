import { Schema } from 'prosemirror-model';
import { schema as baseSchema } from 'prosemirror-test-builder';

const nodes = baseSchema.spec.nodes.addToEnd('tab', {
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  parseDOM: [{ tag: 'span[data-tab]' }],
  toDOM() {
    return ['span', { 'data-tab': 'true' }, '\t'];
  },
});

export const testSchema = new Schema({ nodes, marks: baseSchema.spec.marks });
