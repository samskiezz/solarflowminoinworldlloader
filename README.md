# SolarFlow Minion World Loader

**Version**: 2.4.0 · **Live site**: https://samskiezz.github.io/solarflowminoinworldlloader/

SolarFlow is a solar and battery compliance workspace for the Australian market, wrapped in a
"minion realm" simulation. It has two parts:

| Part | What it is | Runs on |
| --- | --- | --- |
| `docs/` | Static front end: dashboard, product catalogue, AS/NZS standards references, minion roster, 3D realm, simulations | GitHub Pages (or any static host) |
| `server.js` + `src/` | Optional Express API: users, per-user data, product search API, compliance screening, audit log, WebSocket updates | Node.js 18+ (PostgreSQL optional) |
| `server/vps-server.js` | Tiny file-backed persistence server for the realm state | Node.js 18+ |

## SolarFlow Realm – the game (new in 2.5.0, on your real business since 2.6.0, breeding minions and social media in 2.7.0)

`docs/realm/index.html` is a 3D game, **Solarhaven**: a town where your solar crew live and work. You walk a
third-person character through it (W A S D, mouse-orbit camera, Space to jump, E to talk or enter), your
minions walk the streets on their own – to the Design Workshop, the Standards Library, the campfire, the
cafe, their bunks at the Guild Hall at night, and to the houses they are assigned to – and every house is a
real solar job that visibly builds up: a "SOLAR?" sign on the lot, plans, scaffolding, panels appearing on
the roof, an inverter and battery on the wall, then a green glow once it is commissioned. Day and night,
storms and heatwaves come from the simulated world clock. WoW-style `!`/`?` quest markers float over houses,
an objective tracker runs an in-world tutorial, and the window system (hotbar 1–9, hotkeys, draggable windows)
is the game's UI, as in a deep RPG.

The original realm is in it: the 24-minion roster (tiers, specialties, identicon portraits) lives in town, six as
your founding crew and the rest recruitable; the Minion Cognition Engine returns as an optional language-model
adapter (Settings › AI) that gives every minion a persona, memories and clause context; the Sims-style needs
widgets appear when you hover or click a minion.

Minions are aware: they face and greet you when you approach, talk to each other at the campfire from their
memories and the standards, shelter from storms and remark on jobs that need attention. Sound is synthesised in
the browser (off by default), touch controls appear on phones and tablets, graphics quality is adjustable, and
cloud save works through the API server's `/api/state` (Settings › Data).

Everything behind the windows is real work:

- **Real product data** – the Clean Energy Council approved module, inverter and battery lists
  (`docs/data/cec-products.json`, regenerated with `node scripts/import-cec-lists.js`).
- **Engineering with clause references** – string sizing (AS/NZS 5033 Voc correction, MPPT window, 1000 V
  domestic limit), voltage rise (AS/NZS 4777.1 2 %, AS/NZS 3008 mV/A·m), d.c. cable drop, battery location
  (AS/NZS 5139 restricted locations and clearances), STCs (zone × deeming × kW) and battery STCs,
  yield/NPV/IRR/LCOE, phase balance, inverter main-switch rule, export limits, roof layout.
- **Job pipeline** – nine stages with gates, checklists (52 items citing clauses), commissioning test
  sheet (13 tests), serial register, DNSP connection application, labels, proposal/quote with the STC
  discount, handover pack (owner's manual, maintenance schedule, warranty register) and a printable report.
- **A crew that behaves** – utility-AI needs with response curves, traits, skills with XP, a memory stream
  with retrieval and reflection, GOAP planning that turns into *suggestions*, a credit economy earned only
  from verified work, achievements and quests derived from real jobs. Talk to anyone (E) and they answer from
  their mood and memories.
- **Verifiable feature count** – every feature registers a self-test. `npm run features:realm` writes
  `docs/realm/FEATURES.md`; `npm run smoke:realm` runs all of them in Chromium (WebGL via SwiftShader) plus
  an end-to-end play-through; the in-app **System check** window does the same for players.

The game needs WebGL; without it the same windows still work as a workstation. Research notes behind the
design (standards, incentives, market, game-UI and agent-AI references) are in `docs/realm/RESEARCH.md`.

### Your real business in the game (2.6.0)

Read-only connectors for ServiceM8, Xero, Gmail, Google Drive, Google Calendar and a bank feed build one
cross-linked business model on your API server; the game loads it, turns every real site into a house in
the suburbs of Solarhaven, and the minions run 34 rules over it to find mistakes and improvements
(overdue invoices, sold work never scheduled, customers waiting on replies, installs without handover
packs, cash runway, labour share, lead-farm economics…). Findings become quests. Nothing is written
back and no customer data enters the repo or the public site. Setup, windows and the API are in
`docs/realm/BUSINESS.md`; `node scripts/business-snapshot.mjs` builds the model from exports without
the server (`--encrypt` seals it with a passphrase).

### Families, epochs and social media (2.7.0)

Minions carry digital DNA, make friends and rivals, pair up and have children who inherit genes, looks and
skills, grow up in town, become elders and are remembered at the memorial (Crew › Family). The company
climbs 24 real solar-business epochs. Facebook Pages and Instagram Business are read like the other
connectors: the crew finds unanswered enquiries, drafts posts from real installs and waits for your
approval before anything is published (Social, Shift+J).

## What the data is (and is not)

- **Product catalogue** (`docs/cer-product-database.json`, 9,247 records) is a **simulated dataset**
  generated by `create-realistic-cer-db.js` so the UI has realistic volume to search and page through.
  It is *not* the Clean Energy Council approved products lists. The official lists are published by the
  [Clean Energy Council](https://www.cleanenergycouncil.org.au/industry-programs/products-program).
  The UI labels the dataset as simulated wherever it is shown.
- **AS/NZS standards** data (`docs/as-nzs-standards-scraped.json`, `docs/standards/*.json`) contains
  public summaries, scopes and section references only. The standards themselves are copyrighted and
  must be purchased from Standards Australia.
- **Minions, hive state, progress** (`docs/hive_state.json` and the files derived from it) are the
  simulation's own data.
- **Browser metrics** shown on the dashboard (health score, memory, latency) are measured in your browser.

## Quick start

### Static site only

```bash
git clone https://github.com/samskiezz/solarflowminoinworldlloader.git
cd solarflowminoinworldlloader
python3 -m http.server 8000      # or: npx http-server -p 8000
open http://localhost:8000/docs/
```

### API server

```bash
npm ci
cp .env.example .env             # set JWT_SECRET (32+ chars); DATABASE_URL is optional
npm start                        # http://localhost:3000  (serves docs/ and the API)
```

Without `DATABASE_URL` the server still serves the site, `/api/cer-products`, `/api/standards`,
`/api/compliance/check` and the shared `/api/state`. Users, audit log and backups need PostgreSQL.

### Docker

```bash
cp .env.example .env && echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
docker compose up --build        # API on :3000 + PostgreSQL
```

## Developer workflow

```bash
npm run lint        # eslint (server code)
npm run check       # syntax-check every JS file, validate every JSON file, verify local links in docs/
npm test            # node:test suite (security, standards, stores, API, VPS server)
npm run verify      # all of the above (same as CI)
npm run build:cer   # regenerate the simulated catalogue + summary (deterministic)
npm run build       # regenerate the hive-derived pages (status.html, roster.html, feeds)
```

CI (`.github/workflows/ci.yml`) runs lint, checks, tests, a server smoke test and a Docker build on
Node 18/20/22 for every push and pull request.

## API overview

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health`, `/api/health` | – | `503 degraded` while a configured database is unreachable |
| GET | `/api/version` | – | |
| POST | `/api/auth/register`, `/api/auth/login` | – | rate limited, brute-force lockout |
| GET | `/api/auth/me` | user | |
| GET/POST | `/api/data/:key` | user | per-user JSON documents (PostgreSQL) |
| GET | `/api/state` | – | shared front-end state (file backed) |
| POST | `/api/state` | user* | *or `ALLOW_ANONYMOUS_STATE_WRITES=true` |
| GET | `/api/cer-products` | – | `q`, `category`, `manufacturer`, `verified`, `limit` (≤500), `offset` |
| GET | `/api/cer-products/summary`, `/api/cer-products/:id` | – | |
| POST | `/api/cer-products` | auditor/admin | |
| GET | `/api/standards` | – | bundled summaries; never fetches remotely |
| POST | `/api/standards/refresh` | admin | remote fetch only with `STANDARDS_REMOTE_FETCH=true` |
| POST | `/api/compliance/check` | user | `{ standard_code, installation_data }` → PASS / WARNING / FAIL / INCOMPLETE |
| GET | `/api/audit` | admin | |
| POST | `/api/backup` | admin | writes `DATA_DIR/backups/backup-*.json` |
| WS | `/` | – | `{type:"ping"}`, `{type:"subscribe",channels:[...]}` |

All configuration is documented in `.env.example` and read in `src/config.js`.

## Front-end architecture

Scripts on the dashboard load in this order (see `docs/index.html`):

1. `solarflow-config.js` – runtime config (VPS URL, polling intervals, feature flags)
2. Foundation: `storage-manager.js`, `event-manager.js`, `error-handler.js`, `security-utils.js`, `performance-monitor.js`
3. Core: `central-data-loader.js` (loads each data file once), `unified-credit-system.js`
4. `init-orchestrator.js` – initialises the above in dependency order and emits `solarflow-ready`
5. Persistence: `universal-bootloader.js`, `working-persistence.js`
6. Monitors: `real-vps-integration.js`, `real-health-monitor.js`, `real-neural-processor.js`, `real-compliance-engine.js`

The VPS backend is only contacted when `solarflow-config.js` resolves a URL the page is allowed to
call (an `http://` backend is never attempted from an `https://` page because the browser would
block it). Everything else works in "local mode".

## Deployment

- **GitHub Pages**: push to `main`; the site is served from `docs/`.
- **VPS**: `DOMAIN=example.com ADMIN_EMAIL=you@example.com ./deploy.sh` installs the systemd
  service (`systemd/solarflow-quantum.service`) behind nginx (`nginx/solarflow.conf`) with Let's Encrypt.
  See `DEPLOYMENT.md` for details.

## Repository layout

```
docs/                 static site (GitHub Pages root)
  standards/          public AS/NZS summaries used by the minion knowledge pages
  vendor/three/       pinned three.js build
server.js, src/       Express API server (config, logger, data stores, security, standards)
server/               VPS persistence server
scripts/              build pipeline (hive → pages/feeds), check-* scripts, scrapers
tests/                node:test suite
artifacts/            document pipeline outputs (JSON), kept for reference
apps/, genesis/       experimental Fastify/Next.js and Python prototypes (not part of the build)
```

## Changelog

See `CHANGELOG.md`. The 2.4.0 entry and `IMPROVEMENTS.md` list all 142 fixes made in the audit release.

## License

MIT – see `LICENSE`.
