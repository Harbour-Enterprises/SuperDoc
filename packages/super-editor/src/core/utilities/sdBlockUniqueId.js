let counter = 0;

export function generateBlockUniqueId(type) {
  counter++;
  const prefix = (typeof type === 'string' && type.length ? type : 'b').toLowerCase();
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}-${ts}-${rand}-${counter}`;
}
