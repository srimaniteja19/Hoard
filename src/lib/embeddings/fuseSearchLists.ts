export function fuseSearchLists<T extends { id: number; useCount: number }>(
  fts: T[],
  vector: T[],
  k = 60
): Array<T & { rank: number }> {
  const scores = new Map<number, number>();
  const byId = new Map<number, T>();

  const addList = (list: T[]) => {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!byId.has(item.id)) byId.set(item.id, item);
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + i + 1));
    }
  };

  addList(fts);
  addList(vector);

  return [...byId.values()]
    .map((item) => ({
      ...item,
      rank: (scores.get(item.id) ?? 0) * (1 + Math.log(Number(item.useCount) + 1)),
    }))
    .sort((a, b) => b.rank - a.rank);
}
