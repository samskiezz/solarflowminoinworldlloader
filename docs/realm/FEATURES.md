# SolarFlow Realm Workstation – feature ledger

Every feature listed here is a registered self-test (`FEATURES` export of its module). The count is produced by `npm run features:realm`,
verified in Node for the pure features and in Chromium (`npm run smoke:realm`, or the in-app **System check** window) for the DOM features.

| Metric | Value |
|---|---|
| Registered features | **731** |
| Verified in Node (this run) | 409 passed, 0 failed |
| Browser-verified (DOM) features | 322 |
| Modules | 115 |
| Generated | 2026-10-12T03:18:35.503Z |

## By area

| Area | Features |
|---|---|
| Core shell | 104 |
| Solar engineering domain | 124 |
| Crew simulation | 101 |
| Shell | 83 |
| Windows (game UI) | 240 |
| 3D game world | 79 |

## business/bank (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.bank.categorise` | Bank transactions categorise by payee with model-derived contractor and supplier rules | node + browser |
| 2 | `biz.bank.recurring` | Weekly fixed payments are detected and annualised; same-day repeats flagged as duplicates | node + browser |
| 3 | `biz.bank.balances` | Account balances, 30-day flows and days of cash | node + browser |

## business/calendar (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.calendar.funnel` | Marketing funnel numbers parse out of meeting notes (spend, leads, pickup, close, CPA) | node + browser |
| 2 | `biz.calendar.recurring` | Recurring meetings expand into occurrences and report who never responds | node + browser |
| 3 | `biz.calendar.clashes` | Overlapping events are flagged as clashes | node + browser |

## business/crypto (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.crypto.roundtrip` | A snapshot seals with AES-256-GCM under a PBKDF2 passphrase, gzipped, and opens again byte for byte | node + browser |
| 2 | `biz.crypto.wrongKey` | A wrong passphrase or a tampered envelope is refused, never half-decrypted | node + browser |
| 3 | `biz.crypto.passphrase` | Generated passphrases are five words and a number | node + browser |

## business/drive (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.drive.checklist` | A handover pack is scored against the ten documents a compliant handover needs | node + browser |
| 2 | `biz.drive.match` | Packs match installed sites by customer name, tolerant of brackets and order | node + browser |
| 3 | `biz.drive.coverage` | Coverage: installed sites without a pack, duplicate and incomplete packs | node + browser |

## business/gmail (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.gmail.thread` | A thread classifies, links to a job/site and knows whether the customer is waiting on a reply | node + browser |
| 2 | `biz.gmail.noise` | Notifications, marketing and supplier invoices never count as unanswered | node + browser |
| 3 | `biz.gmail.stats` | Inbox statistics: categories, waiting customers, median response time, leads, complaints | node + browser |

## business/insights (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.insights.rules` | Thirty-plus rules cover finance, receivables, operations, customers, handover, calendar, market and people | node + browser |
| 2 | `biz.insights.run` | Running the rules on a model yields ranked findings with owners, impact, evidence, actions and links | node + browser |
| 3 | `biz.insights.summary` | Findings summarise into counts by severity/owner and a 0-100 health score | node + browser |
| 4 | `biz.insights.state` | Resolved and snoozed findings drop out until they expire | node + browser |
| 5 | `biz.insights.quest` | A finding converts into a quest with objectives and a credit reward scaled to its impact | node + browser |
| 6 | `biz.insights.robust` | A failing rule reports itself instead of breaking the run | node + browser |

## business/market (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.market.incentives` | PV STCs and the federal battery discount price under editable assumptions | node + browser |
| 2 | `biz.market.benchmark` | Quotes benchmark against installed-price bands with a verdict | node + browser |
| 3 | `biz.market.funnel` | Lead-farm economics: sales per week, cost per sale, ROAS and break-even close rate | node + browser |
| 4 | `biz.market.watchlist` | A dated watchlist tells the crew what to re-verify and why | node + browser |

## business/model (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.model.build` | The whole model builds from raw connector payloads with every source present | node + browser |
| 2 | `biz.model.linkInvoices` | Invoices link to jobs and sites by the SM8 reference; overdue amounts land on the site | node + browser |
| 3 | `biz.model.linkThreads` | Email threads attach to sites by customer email or address and count waiting customers | node + browser |
| 4 | `biz.model.insights` | The built model carries ranked findings and a health score | node + browser |
| 5 | `biz.model.digest` | Model digest is compact and non-identifying; isModel tells built models from raw payloads | node + browser |

## business/schema (9)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.schema.address` | Australian addresses parse into street, suburb, state and postcode with a stable match key | node + browser |
| 2 | `biz.schema.description` | ServiceM8 job descriptions yield customer, contact, NMI, system and team fields | node + browser |
| 3 | `biz.schema.system` | System sizes derive from inverter, battery and panel strings | node + browser |
| 4 | `biz.schema.kind` | Internal tasks, site visits, sales and test jobs are told apart from real installs | node + browser |
| 5 | `biz.schema.partner` | Job titles map to the channel partner or retail | node + browser |
| 6 | `biz.schema.invoiceRef` | Xero invoice references link back to the ServiceM8 job and site | node + browser |
| 7 | `biz.schema.email` | Emails classify into legal, complaint, lead, quote, supplier, DNSP, finance, monitoring and noise | node + browser |
| 8 | `biz.schema.extract` | Job numbers and street addresses can be lifted out of free text | node + browser |
| 9 | `biz.schema.dates` | Day and business-day arithmetic | node + browser |

## business/servicem8 (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.sm8.normalise` | A ServiceM8 job becomes a normalised job with customer, site, system, team and stage | node + browser |
| 2 | `biz.sm8.stages` | Status plus billing flags map to realm stages (quote, approval, install, claim, handover, complete, lost) | node + browser |
| 3 | `biz.sm8.sites` | Jobs at the same address collapse into one site that knows if it is installed | node + browser |
| 4 | `biz.sm8.summaries` | Job summaries supply invoice, payment, schedule and customer-response flags | node + browser |
| 5 | `biz.sm8.details` | A job known only from a summary is completed by its detail record (title, address, description, checklist) | node + browser |
| 6 | `biz.sm8.stats` | Job statistics: win rate, pipeline value, awaiting payment, installed base | node + browser |

## business/social (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.social.import` | Facebook pages and Instagram accounts import into one feed of posts, comments and messages with engagement | node + browser |
| 2 | `biz.social.unanswered` | Unanswered questions and price enquiries in comments and messages are found and flagged as leads | node + browser |
| 3 | `biz.social.stats` | Cadence, engagement rate and best posting day/hour are measured from the history | node + browser |
| 4 | `biz.social.drafts` | Minions draft posts from recent installs (suburb and system, never the customer), the market and the season, plus suggested replies | node + browser |

## business/staff (2)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.staff.accounts` | Contractor names parse out of Xero expense account names | node + browser |
| 2 | `biz.staff.merge` | Staff, contractor accounts, weekly bank payments and on-site mentions merge into one roster | node + browser |

## business/sync (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.sync.import` | Importing a raw snapshot builds the model, caches it and reports a digest | node + browser |
| 2 | `biz.sync.server` | The model loads from /api/business/model with the cloud token, falling back when absent | node + browser |
| 3 | `biz.sync.state` | Resolving a finding pays its quest reward and hides it; snoozing hides it for a while | node + browser |
| 4 | `biz.sync.social` | Social drafts wait for approval, can be edited and dismissed, open enquiries are tracked, and publishing goes through the server only once approved | node + browser |
| 5 | `biz.sync.encrypted` | Encrypted snapshots import with a passphrase and export sealed; a wrong passphrase is refused | node + browser |
| 6 | `biz.sync.world` | Real site jobs mirror into the world as realm jobs with the right stage, tasks and business links | node + browser |

## business/xero (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `biz.xero.invoice` | Xero invoices normalise and link to the ServiceM8 job and site via the reference | node + browser |
| 2 | `biz.xero.kpis` | Finance KPIs: margins, monthly run-rate, runway, DSO, labour share, customer concentration | node + browser |
| 3 | `biz.xero.lines` | Invoice and bill line items are kept and classified (battery, solar, ev, labour), feeding product mix and supplier spend | node + browser |
| 4 | `biz.xero.bills` | Bills normalise with reimbursement detection | node + browser |
| 5 | `biz.xero.unreconciled` | Unreconciled bank entries normalise from the API shape and the table shape | node + browser |

## core/audio (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.audio.off` | Sound is off by default and plays nothing | node + browser |
| 2 | `core.audio.synth` | Nine synthesised cues play when enabled | node + browser |
| 3 | `core.audio.loops` | Ambience loops follow phase, weather and the campfire | node + browser |
| 4 | `core.audio.noContext` | Without WebAudio support everything is a safe no-op | node + browser |

## core/bus (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.bus.onEmit` | Subscribe and emit events | node + browser |
| 2 | `core.bus.once` | One-shot listeners | node + browser |
| 3 | `core.bus.off` | Unsubscribe via returned disposer | node + browser |
| 4 | `core.bus.wildcard` | Wildcard listeners see every event | node + browser |
| 5 | `core.bus.errorIsolation` | A throwing handler never breaks other handlers | node + browser |
| 6 | `core.bus.history` | Bounded event history for the debug console | node + browser |

## core/clock (9)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.clock.advance` | Fixed-step accumulator | node + browser |
| 2 | `core.clock.speeds` | Five speed presets incl. pause | node + browser |
| 3 | `core.clock.update` | Clock ticks the world at the chosen speed | node + browser |
| 4 | `core.clock.pause` | Pause/resume remembers previous speed | node + browser |
| 5 | `core.clock.fasterSlower` | Step through speeds | node + browser |
| 6 | `core.clock.startStop` | Interval lifecycle with injectable timers | node + browser |
| 7 | `core.clock.frameClamp` | Background tabs never fast-forward more than 5 s | node + browser |
| 8 | `core.clock.dayPhase` | Day/night phase for the realm backdrop | node + browser |
| 9 | `core.clock.busEvents` | Emits clock:tick and clock:speed events | node + browser |

## core/cloud (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.cloud.unconfigured` | Cloud save is inert until an API URL is set | node + browser |
| 2 | `core.cloud.pushPull` | Push and pull the realm document through /api/state | node + browser |
| 3 | `core.cloud.login` | Login stores a bearer token used for writes | node + browser |
| 4 | `core.cloud.conflict` | A newer server copy blocks a push unless forced | node + browser |
| 5 | `core.cloud.legacyCoexists` | Legacy state on the server is preserved next to the realm save | node + browser |

## core/commands (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.cmd.fuzzy` | Fuzzy scoring (exact > prefix > contains > subsequence) | node + browser |
| 2 | `core.cmd.parse` | Slash command parsing with args and flags | node + browser |
| 3 | `core.cmd.registerRun` | Register and run commands | node + browser |
| 4 | `core.cmd.search` | Palette search ranks recent commands higher | node + browser |
| 5 | `core.cmd.exec` | Console executes slash lines and lists help | node + browser |
| 6 | `core.cmd.aliases` | Command aliases | node + browser |
| 7 | `core.cmd.errors` | Command errors are reported, not thrown | node + browser |

## core/context (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.ctx.create` | Context wires store, world, clock, keys and commands | node + browser |
| 2 | `core.ctx.persistWorld` | World persists and restores through the store | node + browser |
| 3 | `core.ctx.currentJob` | Current job selection with fallback | node + browser |
| 4 | `core.ctx.design` | Design records saved per job and mirrored into the job | node + browser |
| 5 | `core.ctx.level` | Company level from credits earned | node + browser |
| 6 | `core.ctx.products` | Inline product catalogue indexing | node + browser |
| 7 | `core.ctx.worldEvents` | World events are republished on the bus | node + browser |

## core/i18n (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.i18n.translate` | Message lookup with interpolation | node + browser |
| 2 | `core.i18n.locales` | Six locales with English fallback | node + browser |
| 3 | `core.i18n.coverage` | Translation coverage metric | node + browser |
| 4 | `core.i18n.number` | Locale-aware number formatting | node + browser |
| 5 | `core.i18n.currency` | Currency formatting | node + browser |
| 6 | `core.i18n.date` | Date formatting | node + browser |
| 7 | `core.i18n.relative` | Relative time ("in 2 hours") | node + browser |
| 8 | `core.i18n.listeners` | Locale change notifications | node + browser |

## core/keybinds (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.keys.normalize` | Keyboard event normalisation | node + browser |
| 2 | `core.keys.defaults` | Default WoW-style window bindings | node + browser |
| 3 | `core.keys.handle` | Dispatch key events to actions | node + browser |
| 4 | `core.keys.typingGuard` | Keys ignored while typing (except Escape/Ctrl) | node + browser |
| 5 | `core.keys.rebind` | Rebinding with conflict detection | node + browser |
| 6 | `core.keys.persist` | Bindings persist through the store | node + browser |
| 7 | `core.keys.reset` | Reset to defaults | node + browser |
| 8 | `core.keys.list` | List bindings with default markers | node + browser |

## core/llm (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.llm.requests` | Builds OpenAI-compatible and Anthropic requests | node + browser |
| 2 | `core.llm.persona` | Persona prompt carries role, mood, memories and standard clauses | node + browser |
| 3 | `core.llm.notConfigured` | Unconfigured adapter refuses and leaves the template dialogue in place | node + browser |
| 4 | `core.llm.completeAndRateLimit` | Completes through fetch with rate limiting | node + browser |
| 5 | `core.llm.replyAs` | Replies as a minion with memories and clause context | node + browser |
| 6 | `core.llm.errors` | HTTP errors surface as test failures, not crashes | node + browser |

## core/registry (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.registry.register` | Register features with duplicate detection | node + browser |
| 2 | `core.registry.run` | Run self-tests with pass/fail/timeout reporting | node + browser |
| 3 | `core.registry.report` | Markdown report generation | node + browser |

## core/store (11)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.store.defaults` | Default state document | node + browser |
| 2 | `core.store.getSet` | Path-based get/set/patch | node + browser |
| 3 | `core.store.persist` | Persists to storage and reloads | node + browser |
| 4 | `core.store.subscribe` | Change subscriptions with path prefixes | node + browser |
| 5 | `core.store.push` | Bounded list append | node + browser |
| 6 | `core.store.exportImport` | Backup export/import round-trip | node + browser |
| 7 | `core.store.importRejectsGarbage` | Import rejects non-backup documents | node + browser |
| 8 | `core.store.migrate` | Migration fills new keys without losing data | node + browser |
| 9 | `core.store.corruptRecovery` | Corrupt storage falls back to defaults and keeps a copy | node + browser |
| 10 | `core.store.reset` | Reset to defaults | node + browser |
| 11 | `core.store.size` | Reports document size | node + browser |

## core/ui (16)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.ui.escape` | HTML escaping | node + browser |
| 2 | `core.ui.fmt` | Number/percent formatting | node + browser |
| 3 | `core.ui.sort` | Natural sort with null handling | node + browser |
| 4 | `core.ui.filter` | Multi-term row filtering | node + browser |
| 5 | `core.ui.paginate` | Pagination with clamping | node + browser |
| 6 | `core.ui.rarity` | Rarity tiers (common → legendary) | node + browser |
| 7 | `core.ui.h` | Element builder with events/attributes | browser |
| 8 | `core.ui.tooltip` | Rich tooltips show on hover | browser |
| 9 | `core.ui.toast` | Toast notifications | browser |
| 10 | `core.ui.dialog` | Modal dialog resolves with the chosen button | browser |
| 11 | `core.ui.contextMenu` | Context menus | browser |
| 12 | `core.ui.tabs` | Tab strips with persistence callback | browser |
| 13 | `core.ui.table` | Sortable, filterable, paged data table | browser |
| 14 | `core.ui.progress` | Progress bars | browser |
| 15 | `core.ui.forms` | Form fields (number/text/select) | browser |
| 16 | `core.ui.charts` | Sparkline and bar chart | browser |

## core/wm (14)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `core.wm.clamp` | Windows clamp to the viewport | node + browser |
| 2 | `core.wm.cascade` | Cascade layout algorithm | node + browser |
| 3 | `core.wm.tile` | Tile layout algorithm | node + browser |
| 4 | `core.wm.openClose` | Open, toggle and close windows | browser |
| 5 | `core.wm.zOrder` | Focus brings a window to the front | browser |
| 6 | `core.wm.tabs` | Window tabs re-render the body | browser |
| 7 | `core.wm.minMax` | Minimise and maximise | browser |
| 8 | `core.wm.moveResize` | Programmatic move/resize with clamping | browser |
| 9 | `core.wm.closeTop` | Escape closes the top-most window | browser |
| 10 | `core.wm.layouts` | Cascade/tile all open windows | browser |
| 11 | `core.wm.snapshot` | Session restore of open windows | browser |
| 12 | `core.wm.cycle` | Tab cycles focus through windows | browser |
| 13 | `core.wm.contextMenu` | Title-bar context menu (close others, cascade, tile) | browser |
| 14 | `core.wm.renderErrorIsolation` | A crashing window shows an error instead of breaking the shell | browser |

## domain/ac (12)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `ac.mvPerAm` | mV/A·m lookup (3-phase and single-phase) | node + browser |
| 2 | `ac.inverterCurrent` | Inverter rated current | node + browser |
| 3 | `ac.voltageRise` | Voltage rise for a segment | node + browser |
| 4 | `ac.voltageRisePath` | Voltage rise over a path vs 2 % limit | node + browser |
| 5 | `ac.voltageRisePath.fail` | Voltage rise path failure detection | node + browser |
| 6 | `ac.maxCableLength` | Maximum cable length for a limit | node + browser |
| 7 | `ac.deratedRating` | Current rating with ambient and grouping derating | node + browser |
| 8 | `ac.selectAcCable` | AC cable selection (rating + rise) | node + browser |
| 9 | `ac.checkPhaseBalance` | Phase balance check (5 kVA) | node + browser |
| 10 | `ac.checkSinglePhaseCapacity` | Single-phase capacity rule (30 kVA) | node + browser |
| 11 | `ac.inverterMainSwitchRule` | Inverter main switch / master switch rule | node + browser |
| 12 | `ac.checkExportLimit` | DNSP export limit check | node + browser |

## domain/battery (10)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `battery.assess.restricted` | Battery restricted-location detection | node + browser |
| 2 | `battery.assess.clearance` | Battery 600 mm clearance rule | node + browser |
| 3 | `battery.assess.barrier` | Non-combustible barrier rule | node + browser |
| 4 | `battery.assess.warnings` | Battery environmental warnings | node + browser |
| 5 | `battery.sizeBattery` | Battery sizing from daily consumption | node + browser |
| 6 | `battery.backupCapability` | Backup hours for loads | node + browser |
| 7 | `battery.stcFactor` | Battery STC factor schedule | node + browser |
| 8 | `battery.stcs.tiered` | Battery STCs with 14/28/50 kWh tiers | node + browser |
| 9 | `battery.stcs.untiered` | Battery STCs before tiers | node + browser |
| 10 | `battery.stcs.ineligible` | Battery STC eligibility bounds | node + browser |

## domain/checklists (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `checklists.catalogue` | Clause-referenced checklists (5 lists, 52 items) | node + browser |
| 2 | `checklists.evaluate.pass` | Checklist evaluation: PASS | node + browser |
| 3 | `checklists.evaluate.fail` | Checklist evaluation: critical FAIL | node + browser |
| 4 | `checklists.evaluate.incomplete` | Checklist evaluation: INCOMPLETE and completion % | node + browser |
| 5 | `checklists.evaluate.defects` | Checklist evaluation: non-critical DEFECTS | node + browser |
| 6 | `checklists.applicable` | Applicable checklists for a configuration | node + browser |

## domain/commissioning (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `commissioning.definitions` | Commissioning test definitions (13 tests) | node + browser |
| 2 | `commissioning.expectedStringVoc` | Expected string Voc at site temperature | node + browser |
| 3 | `commissioning.expectedIsc` | Expected Isc at irradiance | node + browser |
| 4 | `commissioning.evaluate.pass` | Commissioning evaluation PASS | node + browser |
| 5 | `commissioning.evaluate.fail` | Commissioning evaluation FAIL on insulation | node + browser |
| 6 | `commissioning.evaluate.voc` | Voc deviation beyond 5 % fails | node + browser |
| 7 | `commissioning.irradiance` | Irradiance adequacy for I-V tests | node + browser |

## domain/dnsp (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `dnsp.lookup` | DNSPs by postcode/state | node + browser |
| 2 | `dnsp.catalogue` | Sixteen network operators with export allowances | node + browser |
| 3 | `dnsp.validate` | Application validation with NMI format and export allowance | node + browser |
| 4 | `dnsp.summary` | Application summary text | node + browser |

## domain/handover (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `handover.addYears` | Date arithmetic for warranty expiry | node + browser |
| 2 | `handover.warranty` | Warranty register with product and performance terms | node + browser |
| 3 | `handover.maintenance` | Maintenance schedule with owner and installer items | node + browser |
| 4 | `handover.manual` | Owner's manual text with shutdown procedure | node + browser |

## domain/incentives (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `incentives.zoneForPostcode` | STC postcode zone lookup | node + browser |
| 2 | `incentives.zoneTableCoverage` | Postcode zone table covers 0000–9999 contiguously | node + browser |
| 3 | `incentives.deemingYears` | Deeming period schedule to 2030 | node + browser |
| 4 | `incentives.solarStcs` | Solar STC calculation | node + browser |
| 5 | `incentives.solarStcs.cap` | STC price cap and system size limit | node + browser |
| 6 | `incentives.stateFromPostcode` | State inference from postcode | node + browser |
| 7 | `incentives.statePrograms` | State program catalogue | node + browser |

## domain/jobs (10)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `jobs.stages` | Job pipeline (9 stages, 28 tasks) | node + browser |
| 2 | `jobs.createJob` | Create job with task map | node + browser |
| 3 | `jobs.completeTask` | Complete and reopen tasks | node + browser |
| 4 | `jobs.advanceStage.blocked` | Stage advance blocked by incomplete tasks | node + browser |
| 5 | `jobs.advanceStage` | Stage advance when tasks complete | node + browser |
| 6 | `jobs.stageGate` | Commissioning gate requires checklists and tests | node + browser |
| 7 | `jobs.progress` | Job progress percentage | node + browser |
| 8 | `jobs.validateForStcClaim` | STC claim readiness validation | node + browser |
| 9 | `jobs.addNote` | Job notes | node + browser |
| 10 | `jobs.jobsByStage` | Group jobs by stage | node + browser |

## domain/jurisdictions (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `jurisdictions.catalogue` | Jurisdiction profiles (AU, NZ, UK, US, EU) | node + browser |
| 2 | `jurisdictions.limit` | Jurisdiction limit lookup | node + browser |
| 3 | `jurisdictions.standards` | Standards per jurisdiction | node + browser |

## domain/labels (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `labels.pvOnly` | Label set for PV-only systems | node + browser |
| 2 | `labels.battery` | Battery labels added for BESS | node + browser |
| 3 | `labels.backupSupplyType` | Supply-type labels (alternative/independent) | node + browser |
| 4 | `labels.masterSwitch` | Master switch label when > 2 inverter main switches | node + browser |
| 5 | `labels.ratingText` | Array rating label text | node + browser |
| 6 | `labels.sheet` | Printable label sheet | node + browser |

## domain/loads (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `loads.library` | Appliance library | node + browser |
| 2 | `loads.hourlyProfile` | Hourly load profile | node + browser |
| 3 | `loads.dailyKwh` | Daily consumption | node + browser |
| 4 | `loads.peakKw` | Peak demand (kW) | node + browser |
| 5 | `loads.eveningSharePct` | Evening share for battery sizing | node + browser |
| 6 | `loads.maximumDemandA` | Maximum demand estimate | node + browser |

## domain/pricing (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `pricing.defaultItems` | Default line items from the design | node + browser |
| 2 | `pricing.totals` | Totals with STC discount, GST and payment schedule | node + browser |
| 3 | `pricing.margin` | Gross margin from cost of goods | node + browser |
| 4 | `pricing.perWatt` | Price per watt | node + browser |
| 5 | `pricing.proposalText` | Plain-text proposal document | node + browser |
| 6 | `pricing.noNegative` | Discounts never push the total below zero | node + browser |

## domain/products (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `products.flatten` | Flatten catalogue categories | node + browser |
| 2 | `products.isApprovedOn` | Approval status on a date | node + browser |
| 3 | `products.daysToExpiry` | Days to approval expiry | node + browser |
| 4 | `products.search` | Catalogue search with filters and paging | node + browser |
| 5 | `products.manufacturers` | Manufacturer facets | node + browser |
| 6 | `products.matchInverters` | Inverter matching by DC/AC ratio | node + browser |
| 7 | `products.matchBatteries` | Battery matching by usable capacity | node + browser |
| 8 | `products.designCompatibility` | Design compatibility and expiry warnings | node + browser |

## domain/pv (14)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `pv.correctVoc` | Voc temperature correction (coefficient) | node + browser |
| 2 | `pv.vocFactorTable` | Voc correction factor table (AS/NZS 5033 Table 4.1 style) | node + browser |
| 3 | `pv.correctVmp` | Vmp hot-cell correction | node + browser |
| 4 | `pv.cellTemperature` | NOCT cell temperature model | node + browser |
| 5 | `pv.arrayMaxVoltage` | Array maximum voltage | node + browser |
| 6 | `pv.systemVoltageLimit` | Installation class voltage limits | node + browser |
| 7 | `pv.stringSizing` | String sizing against Voc, MPPT and class limits | node + browser |
| 8 | `pv.stringSizing.infeasible` | String sizing reports infeasible combinations | node + browser |
| 9 | `pv.dcAcRatio` | DC/AC ratio and 133 % oversizing check | node + browser |
| 10 | `pv.stringCableCurrent` | String/array cable current (1.25 × Isc) | node + browser |
| 11 | `pv.dcVoltageDrop` | DC voltage drop percentage | node + browser |
| 12 | `pv.selectDcCable` | DC cable selection for 3 % limit | node + browser |
| 13 | `pv.orientationFactor` | Tilt/azimuth generation factor | node + browser |
| 14 | `pv.arrayLayout` | Roof layout module count | node + browser |

## domain/report (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `report.escapeHtml` | HTML escaping | node + browser |
| 2 | `report.designSection` | Design section renders provided fields only | node + browser |
| 3 | `report.buildJobReport` | Full job report document | node + browser |
| 4 | `report.extraSections` | Reports accept extra sections (proposal, serials, warranties) | node + browser |

## domain/serials (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `serials.validate` | Serial format validation | node + browser |
| 2 | `serials.parse` | Parse pasted lists with duplicates and invalids | node + browser |
| 3 | `serials.status` | Register status against the design | node + browser |
| 4 | `serials.duplicatesAcross` | Duplicates across categories are flagged | node + browser |
| 5 | `serials.csv` | Serial CSV export | node + browser |

## domain/standards (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `standards.catalogue` | Standards codex (8 standards) | node + browser |
| 2 | `standards.standardById` | Standard lookup | node + browser |
| 3 | `standards.findClause` | Clause lookup | node + browser |
| 4 | `standards.search` | Full-text clause search | node + browser |

## domain/yield (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `yield.cityYield` | CEC city yield table | node + browser |
| 2 | `yield.annualYield` | Annual yield with orientation and losses | node + browser |
| 3 | `yield.monthlyYield` | Monthly yield distribution sums to annual | node + browser |
| 4 | `yield.financials` | Payback, NPV, IRR and lifetime savings | node + browser |
| 5 | `yield.irr` | IRR solver | node + browser |
| 6 | `yield.lcoe` | LCOE | node + browser |
| 7 | `yield.co2Offset` | CO₂ offset estimate | node + browser |
| 8 | `yield.selfConsumption` | Self-consumption with battery | node + browser |

## game/awareness (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.aware.greet` | Minions turn to face the player and greet them once per approach | browser |
| 2 | `game.aware.conversation` | Minions sharing the campfire talk to each other and gain social | browser |
| 3 | `game.aware.shelter` | A storm sends everyone indoors; clearing it sends them back | browser |
| 4 | `game.aware.notice` | Idle crew near a job house remark on what it needs | browser |
| 5 | `game.aware.cooldowns` | Greetings and notices respect cooldowns | browser |

## game/behaviour (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.behaviour.lastAction` | Last self-chosen action is read from the agent log | node + browser |
| 2 | `game.behaviour.work` | An agent with a job task walks to that house | node + browser |
| 3 | `game.behaviour.rest` | Resting or night sends agents to the guild bunks | node + browser |
| 4 | `game.behaviour.places` | Study → library, break → cafe, social → campfire, inspect → yard | node + browser |
| 5 | `game.behaviour.spotsSpread` | Agents take different spots at the same place | node + browser |
| 6 | `game.behaviour.wander` | Idle minions spread across town and move haunts through the day | node + browser |
| 7 | `game.behaviour.bubble` | Speech bubbles from the feed or from an urgent need | node + browser |

## game/characters (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.chibi.build` | Procedural chibi character with hard hat, vest, arms, legs and tool | browser |
| 2 | `game.chibi.playerLook` | Player gets a distinct blue outfit and white hat | browser |
| 3 | `game.chibi.animations` | Nine animation states move the right parts | browser |
| 4 | `game.chibi.face` | Characters turn smoothly toward a heading | browser |
| 5 | `game.chibi.deterministicSkin` | Skin tone and hat derive from id and role deterministically | browser |

## game/game (12)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.start` | The game starts with the town, the player, the crew and job houses | browser |
| 2 | `game.clockDrivesWorld` | Simulated clock drives day/night and weather in the world | browser |
| 3 | `game.tutorialChain` | In-world tutorial objectives complete in order and pay credits | browser |
| 4 | `game.houseAppears` | Creating a job raises a house with a quest marker | browser |
| 5 | `game.floatingRewards` | Completed tasks and level-ups float reward text in the world | browser |
| 6 | `game.interactKey` | E interacts with whatever is in front of the player | browser |
| 7 | `game.minimap` | Town minimap with player, crew, houses and markers | browser |
| 8 | `game.clickSelect` | Clicking a minion selects them and opens their sheet | browser |
| 9 | `game.soundHooks` | World events trigger sound cues when sound is on | browser |
| 10 | `game.hudToggle` | Shift+Z hides the HUD overlay | browser |
| 11 | `game.realSites` | Mirrored real sites get houses on suburb lots, suburb labels in the overlay and the player can travel to a site or suburb | browser |
| 12 | `game.persistPosition` | Player position is remembered between sessions | browser |

## game/interact (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.interact.markers` | WoW-style ! and ? markers float over job houses | browser |
| 2 | `game.interact.house` | Standing at a house and pressing E opens that job | browser |
| 3 | `game.interact.npc` | Talking to a crew member opens chat and they remember it | browser |
| 4 | `game.interact.landmark` | Entering a landmark opens its window (library → Codex) | browser |
| 5 | `game.interact.labels` | Landmark labels describe what each building does | browser |

## game/npcs (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.npcs.spawn` | Every crew member spawns as a chibi with a nameplate | browser |
| 2 | `game.npcs.walkToWork` | An agent assigned to a job walks to that house and works | browser |
| 3 | `game.npcs.restAtNight` | At night the crew sleeps at the guild hall | browser |
| 4 | `game.npcs.bubbles` | Crew speak in bubbles when something happens | browser |
| 5 | `game.npcs.needsWidget` | Hovering or selecting a minion shows their needs widget | browser |
| 6 | `game.npcs.roster` | The whole 24-minion roster walks the town; townsfolk plates look different | browser |
| 7 | `game.npcs.nearest` | Nearest crew member lookup for interaction | browser |

## game/overlay (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.overlay.anchors` | Overlay items project 3D anchors to screen positions | browser |
| 2 | `game.overlay.distanceCull` | Far-away plates are hidden | browser |
| 3 | `game.overlay.floatText` | Floating reward text animates and removes itself | browser |
| 4 | `game.overlay.needsWidget` | Sims-style needs widget with six bars | browser |
| 5 | `game.overlay.widgets` | Nameplate, bubble, quest marker and key prompt widgets | browser |

## game/player (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.player.move` | WASD moves the player relative to the camera | browser |
| 2 | `game.player.collide` | Buildings block the player | browser |
| 3 | `game.player.clickToMove` | Click-to-move walks to the point and calls back on arrival | browser |
| 4 | `game.player.camera` | Third-person camera orbits and zooms | browser |
| 5 | `game.player.jump` | Space jumps with gravity | browser |
| 6 | `game.player.axis` | Analog axis input (touch joystick) moves the player | browser |
| 7 | `game.player.worldBounds` | The player cannot leave the town | browser |

## game/scene (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.scene.engine` | WebGL engine renders a frame | browser |
| 2 | `game.scene.dayNight` | Sun, sky, fog and lamps follow the world clock phase | browser |
| 3 | `game.scene.weather` | Storms rain and darken the sky; heatwaves warm it | browser |
| 4 | `game.scene.town` | Town builds ground, roads, square, ten landmarks, trees and lamps | browser |
| 5 | `game.scene.houses` | One house per job; it builds up with the job stage | browser |
| 6 | `game.scene.quality` | Graphics quality: shadows and pixel ratio switch at runtime | browser |
| 7 | `game.scene.picking` | Ground and object picking from screen coordinates | browser |

## game/steer (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.steer.arrive` | Arrive steering reaches the target and stops | node + browser |
| 2 | `game.steer.avoid` | Movement slides around boxes instead of entering them | node + browser |
| 3 | `game.steer.resolve` | Collision resolution pushes out of boxes | node + browser |
| 4 | `game.steer.allowInside` | Agents may enter the building they are visiting | node + browser |
| 5 | `game.steer.helpers` | Distance, heading, clamping and wander helpers | node + browser |

## game/touch (2)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.touch.joystick` | Virtual joystick drives the player analog axis | browser |
| 2 | `game.touch.buttons` | Interact and jump buttons | browser |

## game/town (12)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `game.town.landmarks` | Ten landmark buildings, each bound to a window | node + browser |
| 2 | `game.town.lots` | Twenty residential lots ring the town | node + browser |
| 3 | `game.town.lotForJob` | Jobs get stable lots | node + browser |
| 4 | `game.town.door` | Door positions face the street | node + browser |
| 5 | `game.town.obstacles` | Obstacle boxes include landmarks and job houses | node + browser |
| 6 | `game.town.houseState` | House build state follows the job stage | node + browser |
| 7 | `game.town.spots` | Behaviour spots for bunks, desks, shelves, fire, cafe, yard | node + browser |
| 8 | `game.town.roadsTrees` | Roads (town and suburb streets) and trees are laid out | node + browser |
| 9 | `game.town.district` | A skyline district rings the town beyond the suburbs | node + browser |
| 10 | `game.town.suburbLots` | Over 300 suburb lots line the outer streets, each facing its street | node + browser |
| 11 | `game.town.assignLots` | Real jobs are grouped by suburb into neighbouring lots; legacy jobs keep the inner ring | node + browser |
| 12 | `game.town.spotsForRoster` | Enough bunks, desks and seats for the whole 24-minion roster | node + browser |

## shell (21)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `shell.registerWindows` | All window modules register with the window manager | browser |
| 2 | `shell.topbar` | Top bar shows clock, speed, credits and level | browser |
| 3 | `shell.bell` | Notification bell shows the unread count | browser |
| 4 | `shell.dayPhase` | Backdrop phase follows the world clock | browser |
| 5 | `shell.hotbar` | Nine-slot hotbar toggles windows and highlights open ones | browser |
| 6 | `shell.hotbarAssign` | Right-click a hotbar slot to assign a window | browser |
| 7 | `shell.microMenu` | Micro-menu buttons for the main windows | browser |
| 8 | `shell.minimap` | Minimap draws jobs and home and opens the map | browser |
| 9 | `shell.dockFeed` | Dock shows crew events as they happen | browser |
| 10 | `shell.dockConsole` | Console runs slash commands from the dock | browser |
| 11 | `shell.dockChat` | Plain text in the dock talks to the crew | browser |
| 12 | `shell.palette` | Command palette searches and runs commands | browser |
| 13 | `shell.commands` | Built-in commands (job new, skip, stats, features) | browser |
| 14 | `shell.keybinds` | Keyboard toggles windows, pauses the clock and cycles | browser |
| 15 | `shell.hotbarKeys` | Number keys trigger hotbar slots | browser |
| 16 | `shell.eventToasts` | Achievements and level-ups raise toasts | browser |
| 17 | `shell.toastDedupe` | Identical world-event toasts are not repeated within a minute | browser |
| 18 | `shell.autosave` | Autosave persists world and open windows | browser |
| 19 | `shell.restoreSession` | Reopens the windows from the last session | browser |
| 20 | `shell.theme` | Themes apply to the document | browser |
| 21 | `shell.onboarding` | First-run onboarding captures profile and opens the dashboard | browser |

## sim/agent (10)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `agent.create` | Agent creation with deterministic traits | node + browser |
| 2 | `agent.assignAndWork` | Assigned task progresses and completes with XP | node + browser |
| 3 | `agent.idleBehaviour` | Idle agent chooses self-care actions | node + browser |
| 4 | `agent.observeAutonomy` | Observe autonomy never works tasks | node + browser |
| 5 | `agent.reflection` | Agent reflects after important memories | node + browser |
| 6 | `agent.meta` | Agents carry roster metadata (title, specialties, hired flag) | node + browser |
| 7 | `agent.serialise` | Agent round-trips through JSON | node + browser |
| 8 | `agent.efficiency` | Efficiency combines needs and traits | node + browser |
| 9 | `agent.genes` | Agents carry DNA, family fields and skill aptitudes that scale XP; all of it round-trips | node + browser |
| 10 | `agent.installBlocked` | Storm blocks install tasks | node + browser |

## sim/dialogue (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `dialogue.greeting` | Mood-based greeting | node + browser |
| 2 | `dialogue.traitLine` | Trait flavour lines | node + browser |
| 3 | `dialogue.reply.status` | Status reply reports mood and lowest need | node + browser |
| 4 | `dialogue.reply.skills` | Skills reply | node + browser |
| 5 | `dialogue.reply.standards` | Crew quote standard clauses when asked about the rules | node + browser |
| 6 | `dialogue.reply.intro` | Crew introduce themselves with title and specialties | node + browser |
| 7 | `dialogue.replyWithLlm.fallback` | LLM hook with template fallback | node + browser |
| 8 | `dialogue.replyWithLlm.hook` | LLM hook used when available | node + browser |

## sim/economy (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `economy.rewards` | Reward table and upgrade catalogue | node + browser |
| 2 | `economy.earn` | Earn credits (append-only ledger) | node + browser |
| 3 | `economy.spend` | Spend on upgrades with validation | node + browser |
| 4 | `economy.effects` | Upgrade effect aggregation | node + browser |
| 5 | `economy.summary` | Ledger summary | node + browser |

## sim/epochs (2)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `epochs.ladder` | Twenty-four company epochs with rising thresholds, each with a theme and a gift | node + browser |
| 2 | `epochs.progress` | The company index places the business on the ladder with progress to the next milestone | node + browser |

## sim/events (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `events.prng` | Seeded PRNG reproducibility | node + browser |
| 2 | `events.rollEvent` | Weighted world event roll | node + browser |
| 3 | `events.catalogue` | World event catalogue | node + browser |
| 4 | `events.questsForJob` | Quest generated from job stage | node + browser |
| 5 | `events.achievements` | Achievement evaluation | node + browser |
| 6 | `events.achievementCatalogue` | Achievement catalogue (15) | node + browser |

## sim/genetics (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `genes.dna` | Every minion carries deterministic digital DNA (768 base pairs over 23 loci) | node + browser |
| 2 | `genes.traits` | Loci project to stable traits in [0, 1]; the named personality traits and skill aptitudes derive from them | node + browser |
| 3 | `genes.breed` | Breeding is crossover plus mutation: children are related to both parents and never identical to either | node + browser |
| 4 | `genes.appearance` | Looks (hue, height, build, skin) come from the genes so families resemble each other | node + browser |

## sim/lifecycle (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `life.stages` | Minions age through infant, child, adolescent, adult and elder with rising capability; founders arrive grown | node + browser |
| 2 | `life.social` | Encounters build friendships or rivalries from genetic compatibility and can turn close adult friends into partners | node + browser |
| 3 | `life.breed` | Partners breed a child that inherits genes, looks, two traits, a quarter of each parent's skills and a surname; family links and cooldowns apply | node + browser |
| 4 | `life.death` | Only the very old die, probabilistically past their genetic lifespan; the family tree lists the living and the remembered | node + browser |

## sim/memory (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `memory.tokenize` | Tokeniser with stop words | node + browser |
| 2 | `memory.scoreImportance` | Importance heuristic | node + browser |
| 3 | `memory.addAndRecent` | Add memories and list recent | node + browser |
| 4 | `memory.retrieve` | Retrieval by relevance/recency/importance | node + browser |
| 5 | `memory.capacity` | Capacity bound | node + browser |
| 6 | `memory.reflect` | Reflection synthesises insights from failures | node + browser |
| 7 | `memory.serialise` | Serialise and restore | node + browser |

## sim/needs (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `needs.curves` | Response curves (linear, quadratic, sqrt, logistic, inverse) | node + browser |
| 2 | `needs.create` | Create needs in range | node + browser |
| 3 | `needs.decay` | Needs decay with trait modifiers | node + browser |
| 4 | `needs.applyEffects` | Apply activity effects with clamping | node + browser |
| 5 | `needs.urgency` | Urgency ranking | node + browser |
| 6 | `needs.mood` | Mood and moodlets | node + browser |
| 7 | `needs.efficiency` | Efficiency multiplier | node + browser |

## sim/planner (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `planner.scoreAction` | Utility scoring with need, trait and skill considerations | node + browser |
| 2 | `planner.chooseAction` | Best action selection | node + browser |
| 3 | `planner.chooseAction.explore` | Weighted-random exploration among top actions | node + browser |
| 4 | `planner.novelty` | Recently done actions are discounted | node + browser |
| 5 | `planner.goap` | GOAP plan to claim STCs | node + browser |
| 6 | `planner.goap.satisfied` | GOAP returns empty plan when goal already met | node + browser |
| 7 | `planner.goap.impossible` | GOAP reports impossible goals | node + browser |

## sim/roster (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `roster.legacy` | All 24 original minions are in the roster with tiers, modes and specialties | node + browser |
| 2 | `roster.mapping` | Specialties map to solar roles, traits and starting skills | node + browser |
| 3 | `roster.founding` | Six founding crew are hired; the rest can be recruited by tier cost | node + browser |
| 4 | `roster.portraits` | Every minion has an identicon portrait path | node + browser |
| 5 | `roster.uniqueTitles` | Every minion has a distinct solar title | node + browser |

## sim/skills (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `skills.definitions` | Skill tree (8 skills) | node + browser |
| 2 | `skills.levelCurve` | Level curve and progress | node + browser |
| 3 | `skills.awardXp` | Award XP with level-up detection | node + browser |
| 4 | `skills.rank` | Rank titles | node + browser |
| 5 | `skills.maxLevel` | Level cap | node + browser |
| 6 | `skills.skillForTask` | Task tag → skill mapping | node + browser |
| 7 | `skills.successChance` | Success probability from skill vs difficulty | node + browser |

## sim/social (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `social.approach` | Minions greet the player by mood, task and whether they are hired | node + browser |
| 2 | `social.conversation` | Two minions hold a conversation drawn from memories and specialties | node + browser |
| 3 | `social.standardsTopic` | Campfire talk includes standards questions answered from the Codex | node + browser |
| 4 | `social.shelter` | Storm shelter assignments spread across guild, cafe and library | node + browser |
| 5 | `social.notice` | Idle crew remark on jobs that need attention, by stage | node + browser |

## sim/suggestions (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `suggest.jobState` | Planner state derived from job and design | node + browser |
| 2 | `suggest.nextAction` | Next action from the GOAP plan | node + browser |
| 3 | `suggest.done` | No suggestion for a complete job | node + browser |
| 4 | `suggest.fromAgents` | Agents under suggest/semi/full autonomy propose actions | node + browser |
| 5 | `suggest.labels` | Every planner action has a label and a target window | node + browser |

## sim/traits (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `traits.catalogue` | Trait catalogue (8 traits) | node + browser |
| 2 | `traits.actionWeight` | Trait action weighting | node + browser |
| 3 | `traits.decayModifiers` | Trait decay modifiers combine | node + browser |
| 4 | `traits.multipliers` | Error/speed/XP multipliers | node + browser |
| 5 | `traits.fromSeed` | Deterministic traits from seed | node + browser |

## sim/world (14)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `world.recruit` | Townsfolk minions can be recruited into the crew for credits | node + browser |
| 2 | `world.create` | World with seeded clock and ledger | node + browser |
| 3 | `world.addAgentAndJob` | Add agents and jobs | node + browser |
| 4 | `world.assignNextTask` | Assign next open stage task | node + browser |
| 5 | `world.tick` | Tick advances time, agents and completes job tasks | node + browser |
| 6 | `world.events` | World events roll over time | node + browser |
| 7 | `world.quests` | Quests derived from open jobs | node + browser |
| 8 | `world.recordResults` | Checklist/commissioning results earn credits and achievements | node + browser |
| 9 | `world.serialise` | World round-trips through JSON | node + browser |
| 10 | `world.lifecycle` | Over time minions befriend each other, pair up and have children who grow, inherit and can be recruited when grown | node + browser |
| 11 | `world.death` | The old die and are remembered at the memorial; the next child born carries their soul and a share of their skills | node + browser |
| 12 | `world.arrangeMatch` | The player can arrange a match between two adults for credits; family and the already-partnered are refused | node + browser |
| 13 | `world.epoch` | The world reports its company epoch from installed work, crew and resolved findings | node + browser |
| 14 | `world.inferTag` | Task title → skill tag inference | node + browser |

## windows/achievements (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.ach.grid` | Achievement grid with progress | browser |
| 2 | `win.ach.progress` | Progress toward locked achievements | node + browser |
| 3 | `win.ach.coverage` | Every achievement has a progress rule | node + browser |

## windows/analytics (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.analytics.pipeline` | Pipeline kW, STC exposure and quoted value | browser |
| 2 | `win.analytics.utilisation` | Crew utilisation and first-time quality | browser |
| 3 | `win.analytics.render` | Analytics dashboard renders charts and tables | browser |

## windows/business (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.business.empty` | Business HQ explains how to connect when no model is loaded and can load the example | browser |
| 2 | `win.business.overview` | Overview shows the health score, money, work, customer and document KPIs with top findings | browser |
| 3 | `win.business.pipeline` | Pipeline tab lays real jobs out by stage with values and channel shares | browser |
| 4 | `win.business.connectors` | Connectors tab lists each source with record counts and sync time | browser |

## windows/calendar (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.calendar.upcoming` | Upcoming tab groups real events by day with meet links and clash count | browser |
| 2 | `win.calendar.unscheduled` | To-schedule tab lists sold work orders without a booking, by value | browser |
| 3 | `win.calendar.meetings` | Meetings tab shows attendance of the weekly jobs meeting and the lead-farm numbers | browser |

## windows/character (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.character.header` | Level, title and XP bar | browser |
| 2 | `win.character.saveProfile` | Edit and save the installer profile | browser |
| 3 | `win.character.zoneHint` | Postcode shows STC zone and state live | browser |
| 4 | `win.character.locale` | Switching language re-renders the chrome | browser |
| 5 | `win.character.stats` | Statistics sheet | browser |
| 6 | `win.character.titles` | Titles from levels and achievements | browser |
| 7 | `win.character.equipment` | Equipment shows owned upgrades | browser |

## windows/chat (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.chat.greeting` | Crew member greets you | browser |
| 2 | `win.chat.sendReply` | Send a message and get a mood-aware reply | browser |
| 3 | `win.chat.memoryRecall` | Agent recalls memories in conversation | browser |
| 4 | `win.chat.switchAgent` | Switch conversation partner | browser |
| 5 | `win.chat.channel` | Crew channel shows agent events | browser |
| 6 | `win.chat.llmOptional` | LLM replies are optional and detected at runtime | node + browser |

## windows/checklists (9)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.check.applicable` | Applicable checklists derived from the job | browser |
| 2 | `win.check.answer` | Answer items pass/fail/na and persist on the job | browser |
| 3 | `win.check.evidence` | Evidence notes per item | browser |
| 4 | `win.check.submit` | Submitting a PASS records stats and credits | browser |
| 5 | `win.check.incompleteBlocked` | Incomplete checklists cannot be submitted | browser |
| 6 | `win.check.switch` | Switch between applicable checklists | browser |
| 7 | `win.check.summary` | Per-job checklist summary | browser |
| 8 | `win.check.catalogue` | Checklist catalogue with clause references | browser |
| 9 | `win.check.csv` | Checklist CSV export | node + browser |

## windows/codex (10)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.codex.library` | Standards library with clause list | browser |
| 2 | `win.codex.selectStandard` | Switch between standards | browser |
| 3 | `win.codex.readClause` | Opening a clause logs it and counts toward achievements | browser |
| 4 | `win.codex.search` | Full-text search across clauses and checklist items | browser |
| 5 | `win.codex.searchJump` | Search hit jumps to the clause in the library | browser |
| 6 | `win.codex.contextQuery` | Clause links open the codex pre-searched | browser |
| 7 | `win.codex.jurisdictions` | Jurisdiction limits comparison table | browser |
| 8 | `win.codex.history` | Reading log with coverage | browser |
| 9 | `win.codex.bookmarks` | Bookmark clauses for quick return | browser |
| 10 | `win.codex.related` | Clause → checklist cross-references | node + browser |

## windows/commissioning (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.comm.sheet` | Thirteen-test commissioning sheet | browser |
| 2 | `win.comm.expected` | Expected Voc/Isc derived from context | browser |
| 3 | `win.comm.evaluate` | Readings are evaluated live against criteria | browser |
| 4 | `win.comm.record` | Recording a full PASS awards credits and stats | browser |
| 5 | `win.comm.incomplete` | Incomplete sheets are not recorded | browser |
| 6 | `win.comm.irradiance` | Low irradiance warning | browser |
| 7 | `win.comm.reference` | Acceptance criteria reference | browser |
| 8 | `win.comm.csv` | Commissioning CSV export | node + browser |

## windows/crew (14)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.crew.roster` | Crew cards with portraits, needs, mood and traits | browser |
| 2 | `win.crew.recruit` | Recruit townsfolk minions from the original roster for credits | browser |
| 3 | `win.crew.select` | Select a member from the roster | browser |
| 4 | `win.crew.skills` | Skill sheet with rarity ranks and progress | browser |
| 5 | `win.crew.autonomy` | Change autonomy level | browser |
| 6 | `win.crew.break` | Send on break restores energy and records memory | browser |
| 7 | `win.crew.training` | Training spends credits to raise the weakest skill | browser |
| 8 | `win.crew.assign` | Assign next task on the current job | browser |
| 9 | `win.crew.memorySearch` | Memory retrieval search | browser |
| 10 | `win.crew.reflect` | Force a reflection | browser |
| 11 | `win.crew.hire` | Hire with credits, traits and role | browser |
| 12 | `win.crew.hireNeedsCredits` | Hiring is refused without credits | browser |
| 13 | `win.crew.family` | Family tab shows population, the company epoch, the family tree, genes and lets the player arrange a match | browser |
| 14 | `win.crew.traitReference` | Trait reference table | browser |

## windows/dashboard (7)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.dashboard.overview` | Overview with credits, level, crew and jobs | browser |
| 2 | `win.dashboard.quickActions` | Quick actions open other windows | browser |
| 3 | `win.dashboard.crewLink` | Clicking a crew line opens that member | browser |
| 4 | `win.dashboard.eventBanner` | Active world event banner | browser |
| 5 | `win.dashboard.productWatch` | Product watch flags de-listed or expiring products on open jobs | browser |
| 6 | `win.dashboard.feed` | Filterable activity feed | browser |
| 7 | `win.dashboard.pipeline` | Pipeline charts (jobs and kW per stage) | browser |

## windows/dnsp (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.dnsp.candidates` | Operators offered match the job postcode | browser |
| 2 | `win.dnsp.prefill` | Form prefilled from the design and profile | browser |
| 3 | `win.dnsp.validation` | Live validation including export allowance | browser |
| 4 | `win.dnsp.save` | Application persists in the design | browser |
| 5 | `win.dnsp.lodge` | Lodging requires a valid application and ticks the task | browser |
| 6 | `win.dnsp.operators` | Operator reference table | browser |

## windows/documents (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.documents.packs` | Packs tab shows coverage KPIs and every Drive folder with its completeness and missing documents | browser |
| 2 | `win.documents.missing` | Missing tab lists installed sites without a pack with a jump to the site file | browser |
| 3 | `win.documents.standard` | Standard tab lists the ten required documents | browser |

## windows/finance (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.finance.overview` | Finance overview: position, P&L summary and revenue by customer | browser |
| 2 | `win.finance.receivables` | Receivables tab ages every invoice and links overdue ones to jobs | browser |
| 3 | `win.finance.pnl` | P&L tab lists income, cost of sales and every expense account with share of income | browser |
| 4 | `win.finance.invoices` | Invoices and bills tables with job links | browser |
| 5 | `win.finance.mix` | Invoices tab shows outstanding totals, what was sold by line-item kind, spend by supplier and invoiced by month | browser |
| 6 | `win.finance.bank` | Bank tab: balances, variance, recurring payments, unreconciled queue and transactions | browser |

## windows/handover (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.handover.manual` | Owner's manual generated from the job and design | browser |
| 2 | `win.handover.issue` | Issuing the pack ticks the handover tasks | browser |
| 3 | `win.handover.maintenance` | Five-year maintenance schedule | browser |
| 4 | `win.handover.warranty` | Warranty register from selected products | browser |

## windows/help (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.help.tutorial` | Seven-step tutorial with completion tracking | browser |
| 2 | `win.help.keys` | Hotkey reference | browser |
| 3 | `win.help.glossary` | Glossary of solar and simulation terms | browser |
| 4 | `win.help.about` | About page reports the live feature count | browser |

## windows/inbox (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.inbox.waiting` | Waiting tab lists customer conversations without a reply, worst first | browser |
| 2 | `win.inbox.all` | All threads tab shows category chips and a searchable table with Gmail links | browser |
| 3 | `win.inbox.stats` | Response tab shows median reply time and leads | browser |

## windows/insights (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.insights.list` | Open findings list with severity/category filters, impact and owners | browser |
| 2 | `win.insights.resolve` | Resolving from the card pays credits and moves the finding to the Resolved tab | browser |
| 3 | `win.insights.owners` | By-minion tab groups findings per owner with a talk button | browser |

## windows/intel (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.intel.benchmark` | Benchmark a quote: verdict, band, incentives, and your priced jobs against the market | browser |
| 2 | `win.intel.funnel` | Lead funnel tab models spend, leads, pickup and close into margin after ads | browser |
| 3 | `win.intel.assumptions` | Assumptions tab edits STC price, battery factor and price bands and persists them | browser |
| 4 | `win.intel.watch` | Watchlist tab lists sources with cadence and reasons | browser |

## windows/inventory (12)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.vault.browse` | Browse the catalogue with search | browser |
| 2 | `win.vault.filters` | Category, manufacturer and approved-only filters | browser |
| 3 | `win.vault.sort` | Sort by expiry / power / recency | browser |
| 4 | `win.vault.detail` | Product detail panel with approval status and specs | browser |
| 5 | `win.vault.favourite` | Favourites persist | browser |
| 6 | `win.vault.compare` | Compare up to three products | browser |
| 7 | `win.vault.useInDesign` | Use a product in the current job design | browser |
| 8 | `win.vault.matches` | Inverter and battery matches for the job | browser |
| 9 | `win.vault.designSlots` | Job selection slots with compatibility check | browser |
| 10 | `win.vault.csv` | CSV export of the result set | node + browser |
| 11 | `win.vault.about` | Catalogue summary and provenance | browser |
| 12 | `win.vault.tooltip` | Rich item tooltips on models | browser |

## windows/jobs (11)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.jobs.board` | Kanban board of jobs by stage | browser |
| 2 | `win.jobs.create` | Create a job from the form with validation | browser |
| 3 | `win.jobs.tasks` | Tick stage tasks and persist | browser |
| 4 | `win.jobs.advance` | Advance stage only when tasks are complete | browser |
| 5 | `win.jobs.assign` | Assign a crew member and start the next task | browser |
| 6 | `win.jobs.stcReadiness` | STC claim readiness with evidence checkboxes | browser |
| 7 | `win.jobs.notes` | Add timestamped notes | browser |
| 8 | `win.jobs.list` | Searchable job table | browser |
| 9 | `win.jobs.duplicate` | Duplicate a job as a template (design carried, evidence reset) | browser |
| 10 | `win.jobs.exportImport` | Export and import a single job with its design | browser |
| 11 | `win.jobs.stageTrack` | Nine-stage progress track | browser |

## windows/journal (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.journal.add` | Add tagged notes attached to a job | browser |
| 2 | `win.journal.search` | Search notes by text or tag | browser |
| 3 | `win.journal.delete` | Delete a note | browser |
| 4 | `win.journal.markdown` | Markdown export | node + browser |
| 5 | `win.journal.reflections` | Crew reflections aggregated | browser |
| 6 | `win.journal.timeline` | Unified timeline of notes, crew events and job history | browser |

## windows/labels (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.labels.generate` | Label list generated from the job and design | browser |
| 2 | `win.labels.backup` | Backup circuits add supply-type labels | browser |
| 3 | `win.labels.masterSwitch` | More than two inverter main switches adds the master switch label | browser |
| 4 | `win.labels.save` | Label settings persist in the design | browser |
| 5 | `win.labels.html` | Printable label sheet HTML | node + browser |

## windows/loads (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.loads.library` | Appliance library with quantities | browser |
| 2 | `win.loads.select` | Selecting appliances updates the profile | browser |
| 3 | `win.loads.presets` | Household presets | browser |
| 4 | `win.loads.quantity` | Quantity multiplies consumption | browser |
| 5 | `win.loads.save` | Profile saved into the design for battery sizing | browser |
| 6 | `win.loads.maxDemand` | Maximum demand estimate | browser |

## windows/map (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.map.project` | Map projection and postcode positioning | node + browser |
| 2 | `win.map.render` | Realm map renders coastline, cities and job pins | browser |
| 3 | `win.map.pinClick` | Clicking a pin opens the job | browser |
| 4 | `win.map.stageFilter` | Filter pins by stage | browser |
| 5 | `win.map.zoneLookup` | Postcode zone lookup and full zone table | browser |
| 6 | `win.map.cities` | City yield table | browser |

## windows/market (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.market.shop` | Upgrade shop with affordability | browser |
| 2 | `win.market.buy` | Buying deducts credits and activates effects | browser |
| 3 | `win.market.ledger` | Ledger table and totals | browser |
| 4 | `win.market.earning` | Earning guide | browser |

## windows/notifications (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.notify.inbox` | Inbox of important events with unread count | browser |
| 2 | `win.notify.markRead` | Mark all read clears the badge | browser |
| 3 | `win.notify.navigate` | Clicking a notification opens its subject | browser |
| 4 | `win.notify.globalSearch` | Global search across jobs, crew, clauses, notes and products | browser |
| 5 | `win.notify.crewOnly` | Townsfolk level-ups stay out of the inbox | browser |
| 6 | `win.notify.searchClauses` | Search finds standard clauses | browser |

## windows/proposal (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.proposal.items` | Line items generated from the design | browser |
| 2 | `win.proposal.edit` | Editing quantities/prices updates totals and persists | browser |
| 3 | `win.proposal.stcDiscount` | STC values from the design discount the quote | browser |
| 4 | `win.proposal.addRemove` | Add and remove lines | browser |
| 5 | `win.proposal.preview` | Proposal document with payment schedule | browser |
| 6 | `win.proposal.issue` | Issuing the proposal ticks the quote-stage task | browser |

## windows/quests (8)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.quests.business` | Business quests tab turns open findings into quests with objectives, owner, links and a credit reward on turn-in | browser |
| 2 | `win.quests.list` | Quest list generated from open jobs | browser |
| 3 | `win.quests.objectives` | Objectives tick the underlying job tasks | browser |
| 4 | `win.quests.turnIn` | Turning in a quest advances the stage and pays credits | browser |
| 5 | `win.quests.blocked` | Blocked turn-in reports the reason | browser |
| 6 | `win.quests.flavour` | Stage flavour text for all nine stages | node + browser |
| 7 | `win.quests.dailyGoals` | Daily goals track real practice | browser |
| 8 | `win.quests.completed` | Completed quest history | browser |

## windows/reports (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.reports.build` | Full HTML job report with design, checklists, tests and labels | browser |
| 2 | `win.reports.preview` | Sandboxed report preview | browser |
| 3 | `win.reports.summary` | Markdown design summary | browser |
| 4 | `win.reports.extras` | Report includes proposal, serials and warranties when present | browser |
| 5 | `win.reports.escaping` | Customer input is HTML-escaped in reports | browser |

## windows/schedule (6)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.schedule.book` | Book a crew visit against a job | browser |
| 2 | `win.schedule.week` | Seven-day grid with today highlighted | browser |
| 3 | `win.schedule.conflicts` | Double-booked crew are flagged | browser |
| 4 | `win.schedule.weather` | Storm events warn on roof work | browser |
| 5 | `win.schedule.navigate` | Navigate weeks and remove bookings | browser |
| 6 | `win.schedule.helpers` | Week and conflict helpers | node + browser |

## windows/selftest (2)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.selftest.window` | System check window shows the registry size | browser |
| 2 | `win.selftest.lastRun` | Remembers the last run summary | browser |

## windows/serials (4)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.serials.add` | Paste serials with validation and de-duplication | browser |
| 2 | `win.serials.status` | Register status against the design counts | browser |
| 3 | `win.serials.evidence` | Complete register records STC evidence | browser |
| 4 | `win.serials.remove` | Remove a serial | browser |

## windows/settings (10)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.settings.business` | Settings › Business: server sync, snapshot import/export, example data, clear and mirror into the world | browser |
| 2 | `win.settings.general` | General settings save and apply | browser |
| 3 | `win.settings.ai` | AI tab configures the crew language model | browser |
| 4 | `win.settings.quality` | Graphics, sound and touch settings apply to the game | browser |
| 5 | `win.settings.cloud` | Cloud save controls (URL, login, push, pull) | browser |
| 6 | `win.settings.keysList` | Keybind table with custom markers | browser |
| 7 | `win.settings.rebind` | Rebind by pressing a key, with conflict refusal | browser |
| 8 | `win.settings.hotbar` | Hotbar slot editor | browser |
| 9 | `win.settings.data` | Backup size and export controls | browser |
| 10 | `win.settings.importRejects` | Import rejects invalid backups | browser |

## windows/sites (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.sites.table` | Sites table: every address with stage, system, revenue, overdue, waiting emails and pack status | browser |
| 2 | `win.sites.suburbs` | Suburbs tab aggregates sites into districts | browser |
| 3 | `win.sites.file` | Site file shows jobs, invoices, conversations and the handover pack for one address | browser |

## windows/social (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.social.overview` | Overview shows every account with followers, cadence, engagement, open enquiries and drafts ready | browser |
| 2 | `win.social.inbox` | Inbox lists unanswered comments and messages, leads first, with a suggested reply, mark-replied and lead-job creation | browser |
| 3 | `win.social.drafts` | Drafts can be edited, given platforms and an image, approved into the queue or dismissed | browser |
| 4 | `win.social.queue` | Queue shows approved drafts with publish/copy and explains when the server has publishing off | browser |
| 5 | `win.social.posts` | Posts tab lists the history across platforms with engagement and links | browser |

## windows/spellbook (13)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.spell.strings` | String sizing calculator with live results | browser |
| 2 | `win.spell.stringsPrefill` | Prefills from the job design products | browser |
| 3 | `win.spell.stringsSave` | Save string design into the job | browser |
| 4 | `win.spell.stringsLive` | Editing an input recalculates | browser |
| 5 | `win.spell.acrise` | Voltage rise with automatic cable selection | browser |
| 6 | `win.spell.dccable` | DC cable selection with drop table | browser |
| 7 | `win.spell.batteryLocation` | Battery location assessment flags restricted locations | browser |
| 8 | `win.spell.batterySizing` | Battery sizing, backup runtime and battery STCs | browser |
| 9 | `win.spell.stc` | Solar STC estimate with state programs | browser |
| 10 | `win.spell.yield` | Yield, self-consumption, NPV/IRR/LCOE and monthly chart | browser |
| 11 | `win.spell.phases` | Phase balance, main switch rule and export limit checks | browser |
| 12 | `win.spell.layout` | Roof layout drawing with orientation factor | browser |
| 13 | `win.spell.tabs` | Eight calculator tabs | node + browser |

## windows/staff (2)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.staff.roster` | Roster merges ServiceM8 staff with contractor accounts, weekly payments and on-site counts | browser |
| 2 | `win.staff.cost` | Cost tab ranks labour cost with revenue per labour dollar | browser |

## windows/suggestions (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.suggest.list` | Suggestions listed per open job | browser |
| 2 | `win.suggest.doIt` | "Do it" jumps to the right window and cheers the agent | browser |
| 3 | `win.suggest.dismiss` | Dismiss and restore suggestions | browser |
| 4 | `win.suggest.observeQuiet` | Observe-only crews make no suggestions | browser |
| 5 | `win.suggest.progression` | Suggestions advance as the design progresses | browser |

## windows/survey (5)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.survey.faces` | Add roof faces with orientation factor and fit | browser |
| 2 | `win.survey.best` | Best face (orientation × shading) feeds the design | browser |
| 3 | `win.survey.checks` | Survey checklist persists | browser |
| 4 | `win.survey.general` | Site details persist | browser |
| 5 | `win.survey.ranking` | Face ranking helper | node + browser |

## windows/wizard (3)

| # | Feature | What it verifies | Runs in |
|---|---|---|---|
| 1 | `win.wizard.steps` | Workflow steps derived from the job and design | browser |
| 2 | `win.wizard.progress` | Progress and next step | node + browser |
| 3 | `win.wizard.render` | Stepper highlights the next step and jumps to its window | browser |
