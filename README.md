<div align="center">

# VigorTally

### Eat, cook, train and see it all, in one app you host yourself.

VigorTally brings together nutrition and weight tracking, a kitchen with recipes, a meal planner and a shopping list that keeps itself up to date, a set-and-rep workout logger alongside all your other sports, and a dashboard you build yourself. It runs as one Docker container on your homelab, and the companion app connects to it with a QR code.

<br />

![Version](https://img.shields.io/badge/Version-1.0.0-3a95e9?style=for-the-badge)
&nbsp;
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge)
&nbsp;
[![License](https://img.shields.io/badge/License-MIT-6B7280?style=for-the-badge)](LICENSE)

</div>

---

## Why

Today, keeping track of your fitness usually means a calorie tracker, a recipe manager, a workout logger, a running app and a climbing logbook. None of them share data, and each one keeps your data on someone else's server.

VigorTally brings them together on a server you control:

- **Plan your meals and get your shopping list for free.** VigorTally knows which recipes are scheduled, compares them with what you've bought and eaten, and keeps the list of basics up to date.
- **Log your lifting the way you're used to.** Templates, a SET / PREVIOUS / KG / REPS table, warm-up, drop and failure sets, and a rest timer.
- **Keep every sport in one place.** Use presets for running, cycling, swimming, hiking, skiing and bouldering, or define your own activity with its own fields.
- **Build your own dashboard.** Chart any metric: weight trend, calories, training volume, estimated 1RM, distance and more.

## The app

The web app and the companion app share the same layout. There are three tabs, with **Activities** in the middle, and your profile picture in the top-right corner opens the side menu.

```
┌───────────────────────────────────────┐
│                                 (TT)  │  ← side menu
│  Activities                           │
│                                       │
├───────────────────────────────────────┤
│   🥗 Nutrition  🏃 Activities  📊 Stats │
└───────────────────────────────────────┘
```

On desktop, the bottom bar becomes a sidebar. The side menu covers the whole screen on an upright phone and keeps that width when the phone is sideways.

### 🥗 Nutrition

- **Macro ring**: a donut of where today's calories came from, with calories eaten and left in the middle and a labelled bar per macro. The colours were checked to be distinguishable with colour blindness.
- **Food diary** by meal. You can search your household's foods or pick a recent one. Barcodes are looked up on [Open Food Facts](https://world.openfoodfacts.org/) through your server and cached there. You can also quick-add calories and macros, or create a food. Each entry stores a snapshot of its nutrients, so editing a food later never changes your history.
- **Water** with one-tap buttons, and **weigh-ins** (one per day) next to your intake.
- Daily targets for calories, protein, carbs, fat and water, set under Profile & goals.

### 🍳 Kitchen (pull-down panel in Nutrition)

- **Today**: what's planned for today, logged to your diary in one tap.
- **Recipes**: ingredients are linked to foods, nutrition per serving is worked out automatically, and recipes can be imported from a URL (schema.org recipe data, which most recipe sites publish).
- **Plan**: a 7-day planner. A meal can repeat weekly for meal-prep rotations.
- **Shopping**: the list worked out from your plan, plus a forecast of when you need to shop next.

#### How the shopping list works

You never count your cupboards. VigorTally works it out from what you already enter:

1. **Plan.** The planner knows which ingredients the meals up to your next shopping day need.
2. **Buy.** Ticking an item off the list records it as bought.
3. **Eat.** Foods and recipes logged in the diary by anyone in the household count as used.
4. **Gap.** What's planned minus what's assumed to be at home becomes the list. The forecast shows how long the planned meals are covered.

The assumed stock is a running balance that never goes below zero, so food eaten before you bought it, or extra food eaten off the plan, can't cancel out a purchase. Anything else you need can be added to the list by hand.

### 🏃 Activities

- **Strength training** with a set-and-rep logger in the style of a paper log:
  - Templates (with supersets and notes) and quick start
  - A PREVIOUS column with your last numbers. Ticking an empty set copies them.
  - Warm-up, drop and failure sets, and a rest timer after every set
  - Estimated 1RM, and the volume of each workout
- **Every other sport**:
  - Presets for running, cycling, swimming, hiking, skiing/snowboarding, bouldering and yoga
  - Custom activities with your own fields (numbers with units, distances, durations, text)
  - Sessions logged with date, duration and notes

### 📊 Statistics

You build the dashboard from widgets. Each widget charts a metric as a **line**, **bars** or a **big number**, over a range from 7 days to a year, grouped by day, week or month. The metrics are:

- Body weight, calories, protein, carbs, fat and water
- Workouts, training volume, and the estimated 1RM of a chosen exercise
- Sessions, active time and distance, across all activities or for one

Every chart shows the value under your cursor or finger and has a "Show data" table. New accounts start with a useful default dashboard.

### 📱 Companion app (Android and iOS)

- **Pairing:** scan the QR code from **Profile → Connected devices → Connect app**, or type in the server address and code.
- **Offline first:**
  - Workouts, diary entries, water and weigh-ins are queued on the phone and sent once the server is reachable.
  - The badge on your profile picture shows changes that are still waiting.
  - Every write uses a client-generated ID, so retries never create duplicates.
- **Screens:**
  - The workout logger, with haptic feedback when a rest ends
  - Nutrition, with a camera barcode scanner
  - Today's planned meals
  - The same dashboard as the web app

Recipes, templates, settings and the dashboard layout are edited in the web app.

## Self-hosting

You need Docker with the Compose plugin (`docker compose version` should print a version). VigorTally is one container that serves both the API and the web app. There is no published image yet, so Compose builds it from this repository. The first build takes a few minutes.

### Run it with Docker Compose

1. **Get the code.**

   ```bash
   git clone https://github.com/MaximScribe/vigortally.git
   cd vigortally/docker
   ```

2. **Optional: configure it.** Copy the example settings and set `PUBLIC_URL` to the address your phone will use:

   ```bash
   cp .env.example .env
   ```

   Without a `.env`, VigorTally runs on port 8080 in UTC, and you can still pair the app by typing in the server address.

3. **Start it.**

   ```bash
   docker compose up -d --build
   ```

4. **Check that it's running.** `docker compose ps` shows `healthy` after a few seconds, and `docker compose logs -f` follows the logs.

5. **Open `http://<your-server>:8080`** and create the admin account. The first account becomes the admin.

This is the whole compose file ([`docker/compose.yml`](docker/compose.yml)):

```yaml
name: vigortally

services:
  vigortally:
    image: vigortally/vigortally:latest
    build:
      context: ..
    pull_policy: build
    container_name: vigortally
    restart: unless-stopped
    ports:
      - '${VIGORTALLY_PORT:-8080}:8080'
    environment:
      PUBLIC_URL: ${PUBLIC_URL:-}
      TZ: ${TZ:-UTC}
    volumes:
      - vigortally-data:/data

volumes:
  vigortally-data:
```

With no `DATABASE_URL` set, VigorTally uses an embedded PostgreSQL (PGlite) stored in the `vigortally-data` volume.

| Task       | Command (in `vigortally/docker`)                   |
| ---------- | -------------------------------------------------- |
| Update     | `git pull && docker compose up -d --build`         |
| Stop       | `docker compose down` (your data stays)            |
| Logs       | `docker compose logs -f vigortally`                |
| Delete all | `docker compose down -v` (also deletes your data!) |

### With PostgreSQL

For several users, or if you already run Postgres, use the second compose file. It starts a `postgres:17` container next to VigorTally. Set `POSTGRES_PASSWORD` in `.env` first:

```bash
docker compose -f compose.postgres.yml up -d --build
```

To use a Postgres server you already run instead, keep `compose.yml` and add `DATABASE_URL: postgres://user:password@host:5432/vigortally` under `environment`.

### Configuration

These go in `docker/.env`:

| Variable            | Default | Meaning                                                                                                     |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | –       | The address your devices use, e.g. `https://vigortally.your-tailnet.ts.net`. Goes into the pairing QR code. |
| `VIGORTALLY_PORT`   | `8080`  | The port on the host.                                                                                       |
| `TZ`                | `UTC`   | The server's time zone, e.g. `Europe/Berlin`.                                                               |
| `POSTGRES_PASSWORD` | –       | Only for `compose.postgres.yml`: the database password.                                                     |

The container also reads these, set under `environment` in the compose file:

| Variable       | Default | Meaning                                                                                           |
| -------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | –       | `postgres://…` for an external database. Without it, the embedded database in `DATA_DIR` is used. |
| `DATA_DIR`     | `/data` | Where the embedded database lives.                                                                |
| `PORT`         | `8080`  | HTTP port inside the container.                                                                   |
| `LOG_LEVEL`    | `info`  | `debug`, `info`, `warn` or `error`. Logs are one JSON object per line.                            |

Database migrations run automatically on start, and the container has a healthcheck on `/api/health`. The image is tested on `amd64`; `docker buildx build --platform linux/arm64 .` builds it for a Raspberry Pi or ARM NAS (not yet tested on ARM).

### Reaching your server

The recommended setup is [Tailscale](https://tailscale.com/). Put the server on your tailnet, use `tailscale serve` for automatic HTTPS, install Tailscale on your phone, and set `PUBLIC_URL` to the tailnet address. Your server never has to be exposed to the internet.

Any other route works too: a reverse proxy with HTTPS (Caddy, Traefik, Nginx Proxy Manager), WireGuard, or a tunnel. The companion app warns you if you use plain HTTP outside a private network.

### Backups

- **Built-in database:** stop the container and archive the volume:

  ```bash
  docker compose stop
  docker run --rm -v vigortally_vigortally-data:/data -v "$PWD":/backup alpine tar czf /backup/vigortally-data.tgz -C /data .
  docker compose start
  ```

  `docker volume ls` lists the volume.

- **PostgreSQL:** `docker compose -f compose.postgres.yml exec db pg_dump -U vigortally vigortally > vigortally.sql`.
- **Any user:** **Profile → Export & server → Download my data** gives a JSON file with everything they logged.

### Building the companion app

The app is in `apps/mobile` (Expo SDK 58). For development, run `npm install` at the repository root, then `npm run start -w @vigortally/mobile`. Open it in a development build, or build an APK or IPA with [EAS Build](https://docs.expo.dev/build/introduction/). Store releases are planned.

## Privacy and security

- Your data stays on your server, with no telemetry. The only outside requests are barcode lookups to Open Food Facts (only the barcode is sent) and pages you import recipes from.
- Passwords are hashed with scrypt, and session and device tokens are stored only as hashes.
- Web sessions use an HttpOnly cookie. Phones get their own device token, which you can revoke from **Connected devices**.
- Failed logins and pairing attempts are rate-limited. Pairing codes work once and expire after 10 minutes.
- Every API route requires a session except an explicit list of public endpoints. Users can only read or change their own records and their household's shared ones.

## Architecture

```
┌───────────────┐        ┌──────────────────────────────────┐
│ Web app       │───────▶│ VigorTally server (Node, Hono)   │──▶ PostgreSQL or embedded PGlite
│ (React)       │ cookie │  REST API · web app · migrations │──▶ Open Food Facts (cached)
└───────────────┘        │                                  │
┌───────────────┐ Bearer │                                  │
│ Companion app │───────▶│                                  │
│ (Expo) +      │ token  └──────────────────────────────────┘
│ offline queue │
└───────────────┘
```

### Tech stack

The whole project is TypeScript, in one npm-workspaces monorepo:

| Part            | Technology                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Server          | Node.js, [Hono](https://hono.dev/), [Drizzle ORM](https://orm.drizzle.team/), PostgreSQL or PGlite                       |
| Web app         | React 19, Vite, TanStack Router and Query, hand-drawn SVG charts                                                         |
| Companion app   | [Expo](https://expo.dev/) (React Native), expo-router, expo-camera, SQLite key-value storage                             |
| Shared packages | `schema` (Zod API contract), `core` (domain logic), `client` (typed API client and offline outbox), `ui` (design tokens) |
| Tests           | Vitest, with an in-memory database and an in-memory fake API for the web app                                             |

## Roadmap

**1.0 (this release):** everything described above.

**Next:**

- [ ] Integrations: Health Connect / Apple Health (weight, workouts, Slopes ski days), Strava, GPX/FIT/CSV import, theCrag. Kilter is still being researched.
- [ ] Logging sport sessions and editing recipes on the phone
- [ ] Profile pictures, per-user dashboards shared with the household
- [ ] App store releases of the companion app
- [ ] Bloodwork and other body markers, next to weight in Nutrition

## Contributing

Ideas and feedback are welcome through issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model, commit conventions, repository layout and development commands. The [CHANGELOG](CHANGELOG.md) lists what changed in each release.

## Inspiration and credits

VigorTally takes ideas from apps it admires: set-based workout loggers, calorie trackers, and [Mealie](https://github.com/mealie-recipes/mealie) for recipes and meal planning. VigorTally is an independent project and is not affiliated with any of them, or with any service named above.

Data sources:

- [Open Food Facts](https://world.openfoodfacts.org/): food and barcode data (ODbL)
- The built-in exercise library and activity presets are VigorTally's own.

## License

[MIT](LICENSE) © 2026 Thomas Lammerich
