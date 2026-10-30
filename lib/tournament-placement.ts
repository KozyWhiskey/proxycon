/** Reorder only existing unresolved tie groups. Points and other ranks stay fixed. */
export function orderTiedPlaces<T extends { id: string }>(ranked: T[], groups: string[][], order: string[] = []): T[] | null {
  const result = [...ranked];
  for (const group of groups) {
    const chosen = order.filter(id => group.includes(id));
    if (chosen.length !== group.length || new Set(chosen).size !== group.length) return null;
    const indices = result.flatMap((player, index) => group.includes(player.id) ? [index] : []);
    if (indices.length !== group.length) return null;
    indices.forEach((index, i) => { result[index] = ranked.find(player => player.id === chosen[i])!; });
  }
  return result;
}

/** The optional top-two final determines the first two confirmed places, never Swiss points. */
export function finalPlaces<T extends {id:string}>(ranked:T[],winnerId:string,loserId:string):T[]{
  const winner=ranked.find(p=>p.id===winnerId),loser=ranked.find(p=>p.id===loserId);
  if(!winner||!loser||winnerId===loserId)return ranked;
  return [winner,loser,...ranked.filter(p=>p.id!==winnerId&&p.id!==loserId)];
}
