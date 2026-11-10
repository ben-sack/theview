// Long ID lists can't go in one database lookup: the IDs ride in the request
// URL, and past ~400 of them the database server rejects it ("Bad Request").
export const ID_CHUNK_SIZE = 150;

export function chunk<T>(items: T[], size = ID_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
