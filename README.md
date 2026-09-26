# Attack on Titan: PATHS

An interactive temporal knowledge graph of the _Attack on Titan_ manga — explore characters, events, locations, factions, Titans and memories, and how they connect across time.

## Status

**Phase 10 — design pass (complete).** Next: the full-manga data expansion, then the web deploy. The web app's deployment is scheduled for the end. API live at [paths-api-m9vw.onrender.com](https://paths-api-m9vw.onrender.com/docs). The dataset covers chapters 1–53 so far. The design lives in [`docs/`](docs/README.md); how to write data is in [`data/`](data/README.md).

| Package                                    | What it does                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| [`@paths/shared`](packages/shared)         | Zod schemas and types for every kind of data; date and spoiler helpers |
| [`@paths/graph-core`](packages/graph-core) | Graph building, spoiler/time filtering, traversal, paths, centrality   |
| [`@paths/data`](packages/data)             | Loads and validates `data/`; generates editor schemas                  |
| [`@paths/db`](packages/db)                 | PostgreSQL schema, migrations, seeding and spoiler-aware SQL queries   |
| [`@paths/api`](apps/api)                   | Spoiler-aware REST API (Fastify); OpenAPI docs at `/docs`              |
| [`@paths/web`](apps/web)                   | The web app (React, Vite, Tailwind)                                    |

## Development

Requires Node 24, pnpm and Docker.

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm api:dev    # http://localhost:3000/docs
pnpm web:dev    # http://localhost:5173
```

| Command            | What it does                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| `pnpm check`       | Everything CI runs without a database: types, lint, format, tests, data |
| `pnpm validate`    | Check `data/` against every rule in the design docs                     |
| `pnpm db:seed`     | Rebuild the database from `data/`                                       |
| `pnpm db:reset`    | Wipe the database, then migrate and seed from scratch                   |
| `pnpm api:dev`     | Run the API with auto-reload (restart it after `pnpm db:seed`)          |
| `pnpm web:dev`     | Run the web app (uses `VITE_API_URL`, default `http://localhost:3000`)  |
| `pnpm api:types`   | Regenerate the web app's API types after changing the API               |
| `pnpm test:db`     | Database and API tests (needs `pnpm db:up`)                             |
| `pnpm db:generate` | Create a migration after changing `packages/db/src/schema.ts`           |
| `pnpm schemas`     | Regenerate the editor's YAML schemas after changing a Zod schema        |

## Canon

Based on the _Attack on Titan_ manga by Hajime Isayama. The manga is the single canon source; every fact in the dataset cites the manga chapter(s) it comes from.

## License

- **Code** — [MIT](LICENSE).
- **Data and documentation** (`data/`, `docs/`) — [CC BY-NC 4.0](LICENSE-DATA): reuse with attribution, non-commercial only.
- _Attack on Titan_ and all related names, characters and artwork belong to Hajime Isayama and Kodansha. These licenses cover only the original work in this repository. Artwork in `apps/web/public/art/` is **not** licensed by this project; it's credited on the site's Credits page and listed in `apps/web/src/art/manifest.ts`.

## Disclaimer

Non-commercial fan project. Not affiliated with or endorsed by Hajime Isayama, Kodansha, or any rights holder. A few official illustrations are shown for non-commercial, fan purposes with credit; rights holders can ask for any of them to be removed, and they will be.
