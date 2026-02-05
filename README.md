# SolarFlow Minion World Loader

Static GitHub Pages app that renders the SolarFlow feed, roster, and realm from a single source-of-truth state file.

## Quick start

```bash
npm install
npm run build
```

## Data flow

- **Source of truth:** `docs/hive_state.json`
- **Generated artifacts:**
  - `docs/index.html` (embedded hive + derived state)
  - `docs/roster.html` (embedded derived roster)
  - `docs/status.json`, `docs/feed.json`, `docs/minions.json`, `docs/agora.json`
  - `docs/build.json`

The build pipeline validates and normalizes `hive_state.json`, applies safe defaults, and derives deterministic snapshots.

## Validation + regeneration

```bash
# Validate hive_state.json (schema + invariants)
npm run validate

# Rebuild all derived artifacts
npm run build

# Optional: advance timestamps + regenerate derived snapshots
node scripts/tick.js
```

If you update `docs/hive_state.json` manually, re-run `npm run build` to refresh the embedded HTML and JSON snapshots.

## Tests

```bash
npm test
```

Tests include schema validation, deterministic derivation checks, and GitHub Pages path checks.

## Diagnostics panel

The main UI includes a Diagnostics section showing the build SHA, schema version, last updated timestamp, and any validation warnings derived from `hive_state.json`.

## Known limitations

- The 3D realm requires a modern browser with ES modules + WebGL support.
