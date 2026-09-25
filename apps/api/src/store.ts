import { type Db, loadDisplayNames, loadGraphInput } from "@paths/db";
import { type Graph, createGraph } from "@paths/graph-core";
import { type Name, displayName } from "@paths/shared";

/**
 * The graph structure and display names, held in memory. The data only changes when the database
 * is reseeded, so the server loads it once at startup (restart the server after `pnpm db:seed`).
 */
export interface Store {
  graph: Graph;
  names: ReadonlyMap<string, Name[]>;
  /** The entity's name for a reader at `cutoff`. */
  nameAt(id: string, cutoff: number): string;
}

export async function loadStore(db: Db): Promise<Store> {
  const { nodes, edges } = await loadGraphInput(db);
  const names = await loadDisplayNames(db);
  return {
    graph: createGraph(nodes, edges),
    names,
    nameAt: (id, cutoff) => displayName(names.get(id) ?? [], cutoff) ?? id,
  };
}
