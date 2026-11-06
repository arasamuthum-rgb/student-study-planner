export function cn(...v: Array<string | false | null | undefined>): string {
  return v.filter(Boolean).join(' ');
}
let n = 0;
export function uid(prefix = 'id'): string {
  n += 1;
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${r}${n}`;
}
