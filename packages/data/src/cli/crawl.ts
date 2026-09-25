// Usage: node packages/data/src/cli/crawl.ts <api base url> [data folder]
// Spoiler-checks a running API (for example, production): at the chapter just before every reveal,
// requests every endpoint for every visible entity and reports any unrevealed string it receives.
import { resolve } from "node:path";
import { readDataDir } from "../files.ts";
import { loadDataset } from "../load.ts";

const base = process.argv[2]?.replace(/\/$/, "");
if (!base) {
  console.error("usage: crawl.ts <api base url> [data folder]");
  process.exit(2);
}
const { dataset } = loadDataset(await readDataDir(resolve(process.argv[3] ?? "data")));

function hiddenAt(cutoff: number): string[] {
  const hidden: string[] = [];
  for (const { entity } of dataset.entities.values()) {
    if (entity.revealedIn > cutoff) hidden.push(entity.id);
    for (const name of entity.names) {
      if (name.revealedIn > cutoff) hidden.push(name.name, ...(name.variants ?? []));
    }
    for (const segment of entity.description) {
      if (segment.revealedIn > cutoff) hidden.push(segment.text);
    }
  }
  return hidden.map((s) => s.toLowerCase());
}

const reveals = new Set<number>();
for (const { entity } of dataset.entities.values()) {
  reveals.add(entity.revealedIn);
  for (const n of entity.names) reveals.add(n.revealedIn);
  for (const s of entity.description) reveals.add(s.revealedIn);
}
for (const { edge } of dataset.edges) reveals.add(edge.revealedIn);
const cutoffs = [...reveals]
  .map((r) => r - 1)
  .filter((c) => c >= 1)
  .sort((a, b) => a - b);

let requests = 0;
const leaks: string[] = [];
for (const cutoff of cutoffs) {
  const hidden = hiddenAt(cutoff);
  const fetchJson = async (path: string) => {
    const response = await fetch(`${base}${path}`);
    requests++;
    const body = await response.text();
    const lower = body.toLowerCase();
    for (const s of hidden) if (lower.includes(s)) leaks.push(`${path} → ${s}`);
    return JSON.parse(body) as { items?: { id: string }[] };
  };
  const { items = [] } = await fetchJson(`/entities?cutoff=${String(cutoff)}`);
  await Promise.all(
    items.flatMap(({ id }) => [
      fetchJson(`/entities/${id}?cutoff=${String(cutoff)}`),
      fetchJson(`/graph/neighborhood/${id}?cutoff=${String(cutoff)}&depth=3`),
    ]),
  );
  await fetchJson(`/timeline?cutoff=${String(cutoff)}&order=world`);
  await fetchJson(`/timeline?cutoff=${String(cutoff)}&order=story`);
}

console.log(`${String(requests)} requests across ${String(cutoffs.length)} chapters`);
for (const leak of leaks) console.log(`LEAK ${leak}`);
console.log(leaks.length === 0 ? "no leaks" : `${String(leaks.length)} leak(s)`);
process.exitCode = leaks.length === 0 ? 0 : 1;
