# Changelog

All notable changes to VigorTally are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-25

The first release.

### Added

- **Self-hosting**:
  - One Docker image serving both the API and the web app (tested on amd64; arm64 builds untested)
  - Runs on an embedded PostgreSQL (PGlite) or an external PostgreSQL
  - Migrations run automatically on start
  - Compose files for both setups
  - Healthcheck, structured JSON logs and security headers
- **Accounts**:
  - First-run admin setup and households with several members
  - Login with rate limiting, a profile with daily targets, units and shopping day, and password changes
- **Companion app pairing**:
  - One-time QR codes, revocable device tokens and a list of connected devices
- **Activities**:
  - Presets and custom activities with their own fields, and session logging
  - Built-in exercise library plus custom exercises
  - Workout templates with supersets and notes
- **Workout logger**:
  - SET / PREVIOUS / KG / REPS table, with warm-up, drop and failure sets
  - Rest timer, and workouts kept on the device until finished
- **Nutrition**:
  - Food database shared by the household, with Open Food Facts barcode lookup
  - Diary with nutrient snapshots, quick add, water, weigh-ins and the macro ring
- **Kitchen**:
  - Recipes with linked ingredients and nutrition per serving, and import from a URL (schema.org)
  - Weekly meal planner with repeats
  - Shopping list and forecast worked out from the plan, purchases and diary
- **Statistics**:
  - Metric registry (weight, nutrition, water, workouts, volume, estimated 1RM, sessions, active time, distance)
  - Customizable dashboard with line, bar and number widgets
- **Data export**: everything a user logged, as JSON.
- **Companion app** (Expo, Android and iOS):
  - Pairing by QR code, offline outbox and workout logger
  - Nutrition with barcode scanning, and the dashboard

[1.0.0]: https://github.com/MaximScribe/vigortally/releases/tag/v1.0.0
