# Attack on Titan: PATHS

An interactive temporal knowledge graph of the _Attack on Titan_ manga — explore characters, events, locations, factions, Titans and memories, and how they connect across time.

## Status

**Phase 1 — data model and seed data (in progress).** The schemas, validator and graph algorithms are built, and the first dataset covers chapters 1–53. The design lives in [`docs/`](docs/README.md); how to write data is in [`data/`](data/README.md).

| Package                                    | What it does                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| [`@paths/shared`](packages/shared)         | Zod schemas and types for every kind of data; date and spoiler helpers |
| [`@paths/graph-core`](packages/graph-core) | Graph building, spoiler/time filtering, traversal, paths, centrality   |
| [`@paths/data`](packages/data)             | Loads and validates `data/`; generates editor schemas                  |

Common commands: `pnpm check` (everything CI runs) · `pnpm validate` (check the data) · `pnpm test` · `pnpm schemas` (regenerate editor schemas after changing a schema).

## Canon

Based on the _Attack on Titan_ manga by Hajime Isayama. The manga is the single canon source; every fact in the dataset cites the manga chapter(s) it comes from.

## License

- **Code** — [MIT](LICENSE).
- **Data and documentation** (`data/`, `docs/`) — [CC BY-NC 4.0](LICENSE-DATA): reuse with attribution, non-commercial only.
- _Attack on Titan_ and all related names and characters belong to Hajime Isayama and Kodansha. These licenses cover only the original work in this repository.

## Disclaimer

Non-commercial fan project. Not affiliated with or endorsed by Hajime Isayama, Kodansha, or any rights holder. No official artwork is hosted in this repository.
