# Contributing to VigorTally

Thanks for your interest! VigorTally is early in development. This document describes how the repository is organised and how changes land.

## Branching model

```
main ──●────────────●─────────────●──────────▶   always runnable, only receives merges
        \          / \           /
         ●──●──●──●   ●──●──●───●                feature branches, small focused commits
     chore/monorepo    feat/server-skeleton
```

- **`main`** is always in a working state. Nobody commits to it directly; it only receives merges.
- **Short-lived branches** are created from `main`, one per coherent piece of work:

  | Prefix      | Use for                                | Example                    |
  | ----------- | -------------------------------------- | -------------------------- |
  | `feat/`     | new functionality                      | `feat/web-shell`           |
  | `fix/`      | bug fixes                              | `fix/sync-cursor`          |
  | `chore/`    | tooling, config, dependencies          | `chore/monorepo`           |
  | `docs/`     | documentation only                     | `docs/self-hosting`        |
  | `refactor/` | restructuring without behaviour change | `refactor/metric-registry` |

- Branches are merged with `git merge --no-ff`, so the history keeps every feature branch visible, and then deleted.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary in imperative mood>
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`

**Scopes:** `server`, `web`, `mobile`, `core`, `schema`, `sync`, `ui`, `docker`, `repo`

Examples:

```
feat(server): add /api/info endpoint
chore(repo): set up npm workspaces
docs(readme): document Tailscale setup
```

Keep commits small and focused. Each commit should build.

## Repository layout

```
apps/
  server/     API, migrations, serves the web build in production
  web/        React web app
  mobile/     Expo (React Native) companion app
packages/
  client/     typed API client and the offline outbox
  core/       pure domain logic (nutrition math, units, 1RM, shopping list, presets)
  schema/     shared Zod schemas and API types
  ui/         design tokens shared by web and mobile
Dockerfile    server image (amd64 + arm64)
docker/       compose files (built-in database, or with PostgreSQL)
docs/         documentation
```

## Development

Requirements: Node.js 22 or newer and npm 10 or newer. Docker is only needed to build the image or try the PostgreSQL setup; development and tests use an embedded database.

```bash
npm install           # installs every workspace

npm run dev:server    # API on http://localhost:8080
npm run dev:web       # web app on http://localhost:5173 (proxies /api to the server)
npm run start -w @vigortally/mobile   # companion app (Expo)
npm run db:generate -w @vigortally/server   # SQL migration after changing db/schema.ts

npm test              # all tests (Vitest, every workspace)
npm run typecheck     # TypeScript in every workspace
npm run lint          # ESLint
npm run format        # Prettier
```

Before committing, `npm test`, `npm run typecheck`, `npm run lint` and `npm run format:check` should all pass.
