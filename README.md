<div align="center">

# VigorTally

### Eat, cook, train and see it all, in one app you host yourself.

VigorTally brings together nutrition and weight tracking, a kitchen with recipes, meal schedules and a smart shopping list, tracking for all your sports with imports from the apps you already use, and a dashboard you build yourself. It runs in Docker on your homelab, and the companion app connects to it with a QR code.

<br />

![Status](https://img.shields.io/badge/Status-planning-F59E0B?style=for-the-badge)
&nbsp;
![Docker](https://img.shields.io/badge/Docker-planned-2496ED?style=for-the-badge)
&nbsp;
[![License](https://img.shields.io/badge/License-MIT-6B7280?style=for-the-badge)](LICENSE)

</div>

> [!NOTE]
> VigorTally is in the **planning stage**. Nothing is ready to install yet. This README describes what the project aims to be.

---

## Why

Today, keeping track of your fitness usually means a calorie tracker, a recipe manager, a workout logger, a running app, a ski tracker and a climbing logbook. None of them share data, and each one keeps your data on someone else's server.

VigorTally brings all of it together on a server you control:

- **Plan your meals and get your shopping list for free.** VigorTally knows which recipes are scheduled, compares them with what you've already eaten, and keeps the list of basics you need up to date.
- **Keep every sport in one place.** Lifting, running, skiing and bouldering are logged by hand or imported from the apps you already use.
- **Build your own dashboard.** Chart any metric against any other, such as your weight trend against your weekly running distance and protein intake.

## The app

The companion app and the web app share the same layout. There are three tabs, with **Activities** in the middle. Your profile picture in the top-right corner opens the menu.

```
┌───────────────────────────────────────┐
│  VigorTally                     (👤)  │  ← opens the side menu
│                                       │
│                                       │
│                                       │
├───────────────────────────────────────┤
│   🥗 Nutrition  🏃 Activities  📊 Stats │
└───────────────────────────────────────┘
```

On desktop, the bottom bar turns into a sidebar.

### 👤 Side menu

Tapping your profile picture slides out a menu from the right. It covers the whole screen when the phone is upright, and roughly the same width on the right side when it's sideways or on a larger screen. It holds:

- Profile and goals (targets, units, preferred day types)
- Settings (theme, notifications, privacy)
- Household and shared members
- Connected devices (pair the companion app, revoke devices)
- Integrations (Strava, Health Connect / Apple Health, imports)
- Export, server info and about

### 🥗 Nutrition

**Today**
- Macro ring: a pie/donut chart of protein, carbs and fat compared with your targets
- Calories eaten, left and burned, plus fiber, sugar, sodium and micronutrients on demand
- Targets that can change by day type (training or rest day)

**Log**
- Scan a barcode with the camera (backed by [Open Food Facts](https://world.openfoodfacts.org/)), search the food database, or add a food by hand
- Quick-add calories and macros, and copy a meal or a whole day
- Track water with one tap
- **Weigh-ins**: body weight with a smoothed trend line, right next to your intake

**🍳 Kitchen** (a pull-down panel inside Nutrition)
- **Today's meal**: what's scheduled to cook today, with the recipe a tap away
- **Recipe book**: your recipes, imported from a URL (schema.org) or written by hand, with scaling, tags and nutrition per serving worked out automatically
- **Recipe scheduler**: put recipes on days, or set up a repeating rotation or meal-prep cycle (for example "cook 4 portions of chili every Sunday")
- **Shopping list**: the basics needed for what's coming up on the schedule, updated as you eat (see below)
- **Shopping forecast**: an estimate of how many days until you need to shop again

#### How the shopping list works

VigorTally doesn't make you count what's in your cupboards. It works the list out from data you already enter:

1. **Plan.** The scheduler knows which recipes are coming up, so it knows which ingredients they need and how much.
2. **Buy.** Ticking items off the shopping list records them as bought.
3. **Eat.** When you log foods and recipes in the nutrition tracker, those ingredients count as used up.
4. **Work out the gap.** The difference between what's planned and what's been bought and eaten becomes the list of what's missing. The forecast shows when the planned meals will no longer be covered.

The list covers the **basics for your scheduled recipes and meal prep**. Anything extra you buy or eat outside the plan doesn't break it, and you can always add items to the list by hand.

### 🏃 Activities

An overview of every sport you do. Pick from **presets** (strength training, running, cycling, swimming, skiing/snowboarding, bouldering, hiking, …) or create your own **custom activity** with the fields you care about.

- **Strength training**: a set-and-rep workout logger with routines and templates, rest timer, RPE/RIR, warm-up, drop and failure sets, personal records, estimated 1RM and a plate calculator
- **Endurance and outdoor sports**: distance, duration, pace, elevation and heart rate, imported automatically or entered by hand
- **Bouldering and climbing**: sends, grades, attempts and boards
- **Custom activities**: you define the metrics, for example "rounds" and "intensity" for boxing

**Integrations (planned)**

| Source | Activities | How |
|---|---|---|
| Strava | Running, cycling, swimming, … | OAuth API |
| Health Connect / Apple Health | Anything that other apps write there, such as Slopes ski days, watch workouts, steps and weight | Read by the companion app |
| Slopes | Skiing / snowboarding | Through Apple Health / Health Connect, or by importing an export file |
| theCrag | Climbing logbook | API (needs an API key) |
| Kilter Board | Board climbing | To be researched (there is no official public API) |
| GPX / FIT / CSV files | Anything | Upload |

### 📊 Statistics

A **dashboard you put together yourself** from widgets. Any metric VigorTally tracks can be charted:

- Number of sessions and time spent per sport, and a list of all your activities
- Stats for a single sport: volume and 1RM progress per lift, running pace and distance, ski days and vertical metres, the grade pyramid for climbing
- Nutrition: calories and macros over time, how often you hit your targets
- Weight trend, and weight against calorie intake

You can choose line, bar, number, heatmap or ring widgets, set the time range and filters, and arrange them by dragging. Layouts sync between the web and the companion app.

## Design

The look is **sleek, modern and minimal**. The app is dark first with a light theme available, uses one accent color, and puts content first with big readable numbers. It needs to work fast with one hand between sets or in the kitchen.

## Self-hosting

VigorTally runs in Docker on your homelab. It needs one VigorTally container and PostgreSQL. Images will be built for both `amd64` and `arm64`, so a Raspberry Pi works too.

*Coming soon.* The goal is a setup like this:

```yaml
services:
  vigortally:
    image: vigortally/vigortally:latest
    ports: ["8080:8080"]
    environment:
      DATABASE_URL: postgres://vigortally:vigortally@db:5432/vigortally
      PUBLIC_URL: https://vigortally.your-tailnet.ts.net
    volumes: ["./data:/data"]
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: vigortally
      POSTGRES_PASSWORD: vigortally
    volumes: ["./pg:/var/lib/postgresql/data"]
```

### Reaching your server

The **recommended** setup is [Tailscale](https://tailscale.com/). Put your server on your tailnet, use `tailscale serve` for automatic HTTPS, and install Tailscale on your phone. Your server then never has to be exposed to the internet.

Any other route works too: a reverse proxy with HTTPS (Caddy, Traefik, Nginx Proxy Manager), WireGuard, or a tunnel. VigorTally only needs a URL your devices can reach. Plain HTTP is allowed only on LAN addresses, and shows a warning.

### Connecting the companion app

1. Open the web app, tap your profile picture and go to **Connected devices → Connect app**.
2. Scan the QR code with the companion app. It contains your server URL and a pairing code that can be used once and expires after a short time.
3. That's it. The app gets its own device token, which you can revoke at any time.

You can also type in the server URL and log in by hand.

The companion app is **offline first**. You can log a workout in a basement gym or a meal on a mountain, and it syncs once it can reach your server again.

### Privacy
- Your data stays on your server, with no telemetry
- Multiple users and households (recipes, schedules and shopping lists can be shared)
- Optional single sign-on with OIDC (Authentik, Authelia, Keycloak and others)
- Export everything as JSON/CSV

## Architecture (draft)

```
┌───────────────┐        ┌───────────────────────────────┐
│ Web app       │───────▶│ VigorTally server             │──▶ PostgreSQL
└───────────────┘ HTTPS  │  API · sync · background jobs │──▶ File storage (disk / S3)
┌───────────────┐        │  integrations · web app       │──▶ Open Food Facts (cached)
│ Companion app │───────▶│                               │──▶ Strava · theCrag · …
│ local DB      │  sync  └───────────────────────────────┘
│ Health bridge │
└───────────────┘
```

### Tech stack

TypeScript everywhere, in a single npm-workspaces monorepo:

| Part | Technology |
|---|---|
| Server | Node.js, [Hono](https://hono.dev/), [Drizzle ORM](https://orm.drizzle.team/), PostgreSQL |
| Web app | React, Vite, TanStack Router and Query |
| Companion app | [Expo](https://expo.dev/) (React Native), SQLite for offline storage |
| Shared | Zod schemas, domain logic and design tokens used by all three |
| Tests | Vitest |

## Roadmap

- [ ] **Phase 0: Foundations.** Monorepo, auth, households, Docker images, pairing the app by QR code, sync protocol, app layout with the side menu
- [ ] **Phase 1: Activities.** Presets and custom activities, the strength workout logger, manual sessions
- [ ] **Phase 2: Nutrition.** Food database, barcode scanning, diary, macro ring, water, weigh-ins
- [ ] **Phase 3: Kitchen.** Recipe book, URL import, recipe scheduler with rotations and meal-prep cycles
- [ ] **Phase 4: Shopping.** The shopping list worked out from schedule, purchases and diary, plus the shopping forecast
- [ ] **Phase 5: Statistics.** Metric registry, widgets, customizable dashboard
- [ ] **Phase 6: Integrations.** Health Connect / HealthKit, Strava, file imports, theCrag, more connectors

## Contributing

The project is in early development. Ideas and feedback are welcome through issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching model, commit conventions and repository layout.

## Inspiration and credits

VigorTally takes ideas from apps it admires: set-based workout loggers, calorie trackers, and [Mealie](https://github.com/mealie-recipes/mealie) for recipes, meal planning and shopping lists. VigorTally is an independent project and is not affiliated with any of them, or with any of the integration services named above.

Planned data sources:
- [Open Food Facts](https://world.openfoodfacts.org/): food and barcode data (ODbL)
- [USDA FoodData Central](https://fdc.nal.usda.gov/): generic food nutrient data (public domain)
- [wger](https://wger.de/): exercise data (CC-BY-SA)

## License

[MIT](LICENSE) © 2026 Thomas Lammerich
