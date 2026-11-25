# Changelog

All notable changes to VigorTally are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Docker Compose:**
  - The built-in database now lives in a named volume instead of `./data`. On Linux, Docker created that folder owned by root, so the server couldn't write to it.
  - Compose always builds the image locally and never tries to pull it from a registry.
  - Moving from 1.0.0: if you already have data in `docker/data`, copy it into the new volume before starting:

    ```bash
    docker run --rm -v vigortally_vigortally-data:/data -v "$PWD/data":/old alpine sh -c 'cp -a /old/. /data/ && chown -R 1000:1000 /data'
    ```

### Added

- A `docker/.env.example` for `PUBLIC_URL`, the host port, the time zone and the Postgres password.
- A step-by-step Docker Compose guide in the README, with update and backup commands.

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
