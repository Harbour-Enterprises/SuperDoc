export const insertTabNode = () => ({ tr, state }) => {
    let newPos = tr.mapping.map(tr.selection.from);
    const node = state.schema.nodes.tab.create();
    tr.insert(newPos, node);
    
    return true;
};
