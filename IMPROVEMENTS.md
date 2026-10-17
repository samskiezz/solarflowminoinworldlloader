# Audit release 2.4.0 – improvement ledger

Every item below was changed in this release. Numbers are for reference in the changelog and commit.

## Repository hygiene

1. Untracked `node_modules/` (34,511 committed files, ~400 MB) and ignored it.
2. Untracked `backups/` (316 files holding 12 copies of the 8 MB catalogue) and ignored it.
3. Untracked `__pycache__/`, `neural_env/`, `*.pid`, `*.log`, `FORCE_DEPLOY`, `DEPLOY_TIMESTAMP.txt`, `.test`, `docs/.cache-bust`.
4. Wrote a complete `.gitignore` (env files, logs, data, build output, editors, Python).
5. Added `.dockerignore` so images never contain backups, artifacts, git history or secrets.
6. Added `.editorconfig` and `.nvmrc` (Node 20).
7. `.gitattributes`: LF normalisation, binary markers, `-diff` on the 5 MB catalogue.
8. Deleted four stale server copies (`server_broken_*`, `server_corrupted`, `server_working`, `simple_server`).
9. Deleted 16 orphaned front-end scripts, 10 of which did not even parse.
10. Deleted the unused `SQLiteService` (it required `better-sqlite3`, which was never installed).
11. Removed the duplicate 8 MB `real-cer-product-database.json` and pointed 13 references at the single file.
12. Generated `package-lock.json` (missing before, so Docker's `npm ci` could not run).
13. `package.json`: removed six scripts pointing at non-existent files and nine unused dependencies (webpack, babel, jest, multer, node-cron …); `engines` node ≥ 18.
14. Replaced native `bcrypt` with `bcryptjs` (no build toolchain needed on Alpine).
15. ESLint 9 flat config; `npm run lint` was broken because the config was eslintrc-style.
16. Aligned the version to 2.4.0 in `package.json`, `build.json`, `version.txt`, `index.html` and the runtime config (four different versions were shown before).
17. Repaired six truncated/concatenated JavaScript files so they parse: completed `showLLMConfig()` and `updateMinionDisplay()`, fixed two mid-comment concatenations, closed the scraper's truncated string, fixed double-escaped regexes in `code-audit.js`.

## Tooling and CI

18. `scripts/check-syntax.js` – `node --check` over every shipped JS file.
19. `scripts/validate-json.js` – parses every JSON file and checks minion ids/tiers/avatars, catalogue totals and summary staleness.
20. `scripts/check-links.js` – verifies every local `src`/`href`/`fetch` target in `docs/` exists and flags absolute paths that 404 on GitHub Pages.
21. `tests/` – 34 `node:test` cases covering security, standards, data stores, the API and the VPS server.
22. GitHub Actions workflow: lint, checks, tests, a server smoke test and a Docker build on Node 18/20/22.
23. `npm run verify` runs lint + checks + tests (same as CI).
24. Fixed invalid JSON in `docs/agora.json` (`"delta":+0.2`).

## API server (`server.js`, `src/`)

25. Central `src/config.js`: every environment variable declared once with defaults.
26. `JWT_SECRET` is required (32+ chars) in production; development uses a random per-process secret instead of the old well-known default.
27. Database reconnect crash fixed: the retry set `this.db = null` and then called `this.db.initializeTables()`, which threw and exited the process. Now exponential backoff, no nulling.
28. The database is optional; without `DATABASE_URL` the site, catalogue API, standards, compliance screening and shared state all work.
29. `/health` returns `503 degraded` while a configured database is down; added `/api/health`, `/ready`, `/api/version`.
30. Request ids (`X-Request-Id`) on every response, in logs and in error bodies.
31. Full `helmet()` header set (only CSP was applied before), HSTS in production, `worker-src blob:` for the neural worker.
32. CORS origins from `CORS_ORIGIN`; requests without an Origin (curl, health checks) pass; unknown origins are rejected and logged.
33. `TRUST_PROXY` support so rate limits see the client IP behind nginx.
34. Shared winston logger module; creates the log directory, rotates files, silent under tests.
35. Request logging with status and duration through the logger (was `console.log` of the user agent).
36. `404` is JSON for `/api/*` and a styled page for everything else (was JSON for all).
37. Error handler propagates deliberate statuses (400/401/403/409/413/503), masks only real 500s, maps body-parse errors to 400.
38. Login input is validated (objects could previously reach the SQL layer).
39. Duplicate registration returns `409`.
40. `/api/cer-products`: the `verified` filter bug (omitting the query parameter filtered to *unverified* products) fixed; `limit` capped at 500; added `offset`, `q`, `category`, `total`.
41. `/api/cer-products` is served from the bundled file when no database is configured, plus `/summary` and `/:id`.
42. `GET /api/standards` no longer scrapes external websites on every request; refresh is admin-only and remote fetching is off unless `STANDARDS_REMOTE_FETCH=true`.
43. `/api/state` GET/POST implemented (the bootloaders had been receiving JSON 404s); size-limited and requires a token or explicit `ALLOW_ANONYMOUS_STATE_WRITES`.
44. The "modify" rate limiter is now actually applied to write routes (it was created and never used).
45. Body limit reduced from 10 MB to 1 MB (configurable).
46. WebSocket: heartbeat/pong with dead-client termination, `maxPayload`, `subscribe` channels honoured by `broadcast`, malformed JSON answered.
47. Graceful shutdown with timeout: closes WebSocket clients, HTTP server and the pool; signals handled once; uncaught exceptions trigger a graceful stop rather than an immediate exit.
48. Static files get cache headers (immutable vendor, revalidated JSON) and dotfiles are ignored.
49. The server is exported as a class and `start()` resolves after `listen` (with error propagation) so it can be tested.
50. Compliance records validate the product id and derive the standard version from the code (was hard-coded `'2021'`).

## Database service

51. `system_data` used a global `UNIQUE(key)`, so two users saving the same key hit a 500. Now unique per `(key, user)` with a migration-safe index.
52. Indexes on `audit_log`, `system_data` and `cer_products`.
53. Backups were stored inside `system_data`, so each backup embedded all previous backups (exponential growth). Now written to `DATA_DIR/backups/` and pruned to 20.
54. Pool `error` handler (an idle-client error used to crash the process), connection timeout, `TIMESTAMPTZ` columns.
55. SSL from `DATABASE_SSL`; certificate verification is only disabled with an explicit `DATABASE_SSL_INSECURE` (production previously used `rejectUnauthorized: false`).
56. Timing-safe login path (a dummy hash is compared when the user does not exist); emails lower-cased.
57. CER product upsert with `ON CONFLICT (manufacturer, model_number)`.
58. Audit log records IP and user agent and runs inside the save transaction.

## Security service

59. Passwords were HTML-sanitised and trimmed before hashing (silently altering them); strings now opt out with `sanitize: false`.
60. bcrypt's 72-byte limit enforced through `maxLength`.
61. Brute-force map is pruned periodically (it grew forever).
62. `requireRole` supports a role hierarchy and arrays.
63. Validator gained `enum`, `integer`, `pattern`, http(s)-only URLs, non-string rejection and defaults.
64. `ValidationError` carries status 400 and the list of failing fields.
65. CSP `connect-src` includes `ws:`/`wss:` and an optional `VPS_API_URL`.

## Standards service

66. Missing installation fields produce `UNKNOWN` checks and an `INCOMPLETE` result instead of silent `FAIL`s.
67. Outbound fetches have timeouts, size limits, redirect caps and a proper user agent.
68. Fabricated Standards Australia purchase URLs replaced with store search links.
69. Standard codes are normalised (`AS/NZS 5033:2021` → `AS_NZS_5033_2021`; `AS_NZS_4777_2016` → part 1).
70. Added labelling and ventilation checks and a disclaimer on every result.

## VPS persistence server (`server/vps-server.js`)

71. CORS preflight: `OPTIONS` fell through to a 404, so every cross-origin JSON POST failed. Now answered with 204 and the right headers.
72. Atomic file writes (temp file + rename) – a crash mid-write can no longer corrupt state.
73. Optional `VPS_WRITE_KEY` (`X-Api-Key`, timing-safe compare) protects writes; reads stay public.
74. Knowledge-base arrays are bounded (5,000 entries) and documents/standards de-duplicated.
75. `DATA_DIR`, `STATIC_DIR`, `CORS_ORIGIN` from the environment; the data path was hard-coded to `/opt/openclaw/data`.
76. Body limit 5 MB (was 50 MB); invalid JSON → 400; `/api` 404s are JSON.
77. WebSocket heartbeat; sync messages no longer ship the whole knowledge base.
78. `server/test-endpoints.js` used port 3001 against a server on 3000; now env-driven and exits non-zero on failure.

## Front-end core modules

79. **Data loss bug**: `storage-manager.js` "migrated" legacy keys by copying and then deleting them on every page load, while the bootloader, credit system, error log and other pages still read the legacy keys. State was wiped each visit. Migration is now non-destructive.
80. `solarflow-config.js`: one runtime config for VPS URL, polling intervals and feature flags (overridable per browser).
81. Mixed content: the `http://` VPS was requested from the `https://` GitHub Pages site and blocked by the browser, several times a minute. It is now never attempted when the page is https.
82. `real-vps-integration.js`: invalid `timeout` fetch option → `AbortSignal.timeout`; bounded retries with backoff; polling stops after the retry budget; async metrics are awaited (a Promise was being stored as data).
83. The health monitor re-downloaded the 8 MB catalogue every 15 seconds with `cache: no-cache`. It now probes three small files with `HEAD`, every 30 seconds, and pauses while the tab is hidden.
84. Removed `eval()` from the health monitor (blocked by CSP anyway).
85. The health monitor built scores from a Promise (`getNetworkMetrics()` was not awaited); `updateMetrics()` is now async.
86. Navigation Timing Level 2 replaces the deprecated `performance.timing` in both monitors.
87. `real-compliance-engine.js` had a syntax error (`async performCompliance Verification`) so the module never loaded on any page.
88. `vps-neural-integration.js` never cleared its interval after "max retries"; it now stops, uses the config URL and reports "not configured" instead of "disconnected".
89. `real_status_loader.js` showed hard-coded "18 Core Systems | 9,247 CER Products"; it now shows live counts, drops the cache-busting query and respects the poll interval.
90. `central-data-loader.js`: removed `?t=Date.now()` on the 5 MB file (it defeated the HTTP cache on every visit); `loadProgress` compared fields that do not exist; hive state was merged with unrelated page state; the standards file structure was misread; a cheap summary dataset is loaded first.
91. The loader no longer tries to store the whole catalogue in localStorage as a "fallback" (it exceeds the quota).
92. `init-orchestrator.js`: foundation modules were booked as "core", the error overlay used `innerHTML` with the error text, and the status API lacked ready/failed lists; all fixed, plus a `solarflow-init-failed` event.
93. `unified-credit-system.js`: a missing or textual tier produced `NaN` credits; corrupted saved state is tolerated.
94. `error-handler.js`: debounced persistence (an error storm stalled the page), precise quota detection, non-`Error` rejections handled, promise objects no longer retained.
95. `security-utils.escapeHTML` no longer throws on non-strings.
96. `universal-bootloader.js`: no `/api/state` calls on static hosts (two 404s per page before), version from config, fake seeded productivity removed.
97. `missing-functions-complete-implementation.js` wrote the whole catalogue into localStorage; it now stores a small summary.

## Pages

98. Dashboard: a `setTimeout` dereferenced two elements that do not exist (`#current-hash`, `#current-time`) and threw on every load.
99. Dashboard: the catalogue check read `data.products` (always "empty or invalid"); counts now come from the loader.
100. Dashboard: the 5 MB catalogue was fetched again every 30 seconds for the footer line; removed.
101. Dashboard: a random "SHA256" hash and hard-coded "18 systems / 100% functional" replaced with live module counts and `build.json`.
102. Dashboard: the fake "backup" alert now exports local data as JSON; "version check" compares with the deployed `build.json`; "report" is generated from live module state and opened via a Blob URL (no `document.write`, popup-blocker fallback).
103. Dashboard: removed `/bundle.js` (absolute path, 404 on GitHub Pages) and a script tag after `</html>`.
104. Dashboard: navigation buttons are real links (keyboard, middle-click, screen readers), `noscript` notice, inline favicon (no more favicon 404), meta description, theme colour, reduced-motion support.
105. Dashboard: console spam (three log lines per second) removed; the 250-line embedded bootloader copy replaced by the shared `universal-bootloader.js`.
106. Dashboard: the "Consciousness" link went to a page that only said "fake data detected" and redirected; now links directly, plus new links to the honest status and realm status pages.
107. `cer-products.html` showed no products at all (`data.products`); it now flattens the categories, renders in pages of 60 (9,000 cards froze the browser), debounces search, escapes HTML and shows the simulated-data notice; category filter values match the data.
108. `project-solar-australia-WORKING.html`: same structure bug; minion count read from the hive roster; fake fallback counts (`|| 9247`, `|| 50`) removed.
109. `processed-documents.html`: fake fallback count (`|| 12`) removed; references the single catalogue file.
110. `minion-standards-integration.js` fetched `/artifacts/...` which is not served; nine public standards summaries were copied to `docs/standards/`.
111. Added `docs/404.html`.
112. `honest-system-status.html` no longer claims the catalogue is real data.
113. `working.html` linked a page that never existed.
114. `scripts/build_index.js` overwrote the dashboard (`docs/index.html`) on every `npm run build`; it now writes `docs/status.html`, linked from the dashboard.
115. `scripts/build_all.js` writes the package version into `build.json` and `version.txt`.

## Data

116. The catalogue had 1,296 duplicate product ids (and duplicate manufacturer/model pairs); every record is now unique.
117. The generator is deterministic (seeded PRNG), so rebuilding produces an identical file.
118. Specifications are rounded (e.g. `voc_volts: 48.369710806586504` → `42.8`), inverter phases/MPPT/DC voltage follow the power class, model codes carry their wattage; file size 8.1 MB → 5.7 MB.
119. `metadata.simulated: true` plus a link to the real Clean Energy Council lists; the UI and README say so.
120. `docs/cer-product-summary.json` provides counts and manufacturer lists for pages that only need numbers.
121. `minions.json`: display names added; 20 minions that shared four portraits now use their own identicons; `hive_state.json` roster synced so builds keep the fix.

## Infrastructure and documentation

122. Dockerfile: `npm ci --only=production` failed without a lockfile; now multi-stage, Node 20, non-root, volumes, working healthcheck.
123. `docker-compose.yml`: adds the app service, a health-checked PostgreSQL, no `POSTGRES_HOST_AUTH_METHOD: trust`.
124. nginx: upstream keepalive, ACME challenge path, HSTS, gzip, immutable vendor cache, correct upstream port.
125. systemd unit: `EnvironmentFile` for secrets, filesystem/privilege hardening, correct port and data paths.
126. `deploy.sh`: used an undefined `$DOMAIN`, installed deps with `npm install express ws`; now parameterised, `npm ci`, rsync excludes, generates `.env` with a JWT secret.
127. `start.sh`: hard-coded a foreign home directory and started a deleted server file.
128. `deploy_to_vps.sh`: shipped a hard-coded database password; now generated and stored with mode 600.
129. `deploy/*.sh`: install from `server/package.json`; the source path is no longer hard-coded.
130. `.env.example` rewritten to match the variables the server actually reads (it listed `PORT=3001`, Next.js, SMTP and S3 settings nothing used).
131. README rewritten with an honest description of the data, the API table and the developer workflow.
132. CHANGELOG 2.4.0 entry, this ledger, VERSION_TRACKER entry and the DEPLOYMENT VPS-integration step updated.

## Found by the headless-browser smoke run (after the above)

133. `real-neural-processor.js` called `this.processQueue()` every 100 ms, but `processQueue` is the queue *array*; every tick threw a `TypeError` (captured by the error handler and written to localStorage). Replaced with a real `drainQueue()`.
134. `scripts/build_index.js` generated a page whose inline script did not parse (a literal newline inside a string, and a `catch` without its `try`), so the hive status board never rendered.
135. `universal-bootloader.js` collected a `403` on every page load when anonymous state writes are disabled; the server now returns `204` + `X-State-Writable` for an empty state and the bootloader stops posting when told writes are unavailable.
136. `minion-standards-integration.js` fetched two files that never existed; AS/NZS 3000 now has a summary file built from the reference data and the non-existent 3017 entry was dropped.
137. `project-solar-australia-WORKING.html` loaded the shared compliance engine but expected a different API (`loadState`, `workingFunctions` …) and threw once the engine actually parsed; the page uses its own logic again.
138. `favicon.svg` plus `<link rel="icon">` on the generated and hand-written pages, and a `/favicon.ico` route on the server (a 404 on every page view before).
139. `ultimate-3d-realm-llm.html` removed its loading element and then wrote to it (`Cannot set properties of null`), aborting initialisation.
140. `autonomous-world.html` called `window.globalLLM.init()`, which does not exist, as soon as the repaired LLM module loaded; guarded.
141. `dominion-engine.html` imports `../src/core/*.js`; the API server now serves the browser-side engine folders (`src/core`, `src/world`, `src/actors`) so the page works there as well as on GitHub Pages.
142. `realm.html` used `THREE.CapsuleGeometry` with a three.js r128 CDN build that predates it (realm failed to initialise); falls back to a cylinder on old builds.
