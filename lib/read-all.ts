/** Avoid PostgREST's row cap without changing full-event statistics or standings. */
export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < size) return { data: rows, error: null };
  }
}
