export function generateBlockUniqueId(type) {
  const prefix = (typeof type === 'string' && type.length ? type : 'b').toLowerCase();
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffffff).toString();
  return `${prefix}-${ts}-${rand}`;
}
