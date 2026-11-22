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

  | Prefix | Use for | Example |
  |---|---|---|
  | `feat/` | new functionality | `feat/web-shell` |
  | `fix/` | bug fixes | `fix/sync-cursor` |
  | `chore/` | tooling, config, dependencies | `chore/monorepo` |
  | `docs/` | documentation only | `docs/self-hosting` |
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
  server/     API, sync, background jobs, serves the web build in production
  web/        React web app
  mobile/     Expo (React Native) companion app
packages/
  core/       pure domain logic (nutrition math, units, 1RM, scheduling)
  schema/     shared Zod schemas and API types
  ui/         design tokens shared by web and mobile
docker/       Dockerfile and compose files
docs/         documentation
```

## Development

Requirements: Node.js 22 or newer, npm 10 or newer, Docker (for PostgreSQL).

Setup instructions will be added as the apps are created.
