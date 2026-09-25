/**
 * Converts any arbitrary string (such as legacy local project IDs) into
 * a valid, deterministic UUID v4 string compatible with PostgreSQL UUID columns.
 * If the string is already a valid UUID, it is returned unchanged.
 */
export function toUuid(id: string): string {
  if (!id) return id;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }

  // Fast, deterministic 128-bit hash formatted as standard UUID v4 string
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  let h3 = 0x9e3779b9;
  let h4 = 0x7b7d159c;

  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2718281829);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
