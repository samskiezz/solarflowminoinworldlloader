# SolarFlow Realm – research synthesis and design decisions

Date: 2026-10-11. This document records what was researched before building the Realm Workstation and
which decisions came out of it. Sources are listed at the end.

## 1. What the product must be

SolarFlow's purpose is solar/battery compliance work for the Australian market (AS/NZS 3000, 5033,
4777.1/4777.2, 5139, 3008, 3017) wrapped in a "minion realm". The research question was: *how do we make
that genuinely useful to installers, designers and inspectors, attractive to a global audience in 2026,
and deep in the way Blizzard/Bethesda-style games are deep, without changing its purpose?*

Answer: keep the crew-of-agents metaphor, but make every "spell", "quest" and "inventory item" map to a
real piece of compliance work with real data and real calculations.

| Game concept | Realm Workstation | Real-world function |
| --- | --- | --- |
| Character sheet | Minion sheet | Agent skills (standards knowledge), needs, memory, workload |
| Crew / guild roster | Crew window | Team capacity, who is best at what, delegation |
| Quest log | Jobs & tasks | Job pipeline: lead → design → quote → install → commission → STC claim → handover |
| Inventory / bags | Product vault | Official CEC approved modules, inverters, batteries (13,160 records) with approval status |
| Spellbook | Calculators | String sizing, voltage rise, cable sizing, battery location, STCs, yield, finance |
| Codex / lore | Standards codex | Clause-referenced summaries of each AS/NZS standard |
| World map | Site map | Jobs by location, STC zone, DNSP region |
| Journal | Memory stream | What each agent observed, reflected on and planned |
| Achievements | Mastery | Real competency milestones (first compliant 1000 V design, zero-defect audit…) |
| Market | Credit economy | Credits earned by completed, verified work; spent on crew upgrades |

## 2. Game UI patterns adopted (World of Warcraft, Elder Scrolls, Blizzard UX)

* **Windows, not pages.** WoW's strength is a stable HUD plus movable, resizable, stackable windows
  (character, spellbook, quest log, bags, map) each opened by a single key. We built a window manager with
  drag, resize, minimise, z-ordering, tabs inside windows, remembered positions and keybinds (C, P, L, B, M,
  J, K, N, O, Esc).
* **Action bar.** A hotbar of the most-used tools with number keys 1–9, like WoW's main action bar.
* **Tooltips everywhere.** WoW's tooltip discipline (what it is, what it does, where it comes from) is applied
  to every clause, calculator field and product.
* **Quest log with instant feedback.** Blizzard's post-mortem on WoW quest design stresses visible progress
  feedback so players stop re-opening the log. Job tasks show live progress and toast notifications on
  completion.
* **Minimap and compass** → site map window plus a corner "minimap" of active jobs.
* **Chat/console** → an in-app console with slash commands (`/go`, `/calc`, `/assign`) and agent dialogue,
  modelled on the WoW chat frame.
* **Modern accessibility** (Dragonflight UI rework): keyboard-first operation, press-and-hold not required,
  reduced motion support, readable contrast, scalable UI.
* **Elder Scrolls journal/skills** → the Codex is organised like Skyrim's skill constellations: each standard
  is a constellation of clauses; each agent's mastery lights up the clauses it has applied in verified work.
* **Diegetic restraint**: Game UI Database analysis of Skyrim shows that menus should be spacious, few
  levels deep, and readable at a glance; we keep every window at most two levels deep.

## 3. Agent intelligence (The Sims, utility AI, Generative Agents)

* **Needs-based utility AI (The Sims).** Each agent has needs (energy, focus, morale, social, mastery
  hunger, safety-mindedness) that decay at different rates. Every available action "advertises" how much
  of each need it satisfies; the agent scores actions through per-need response curves (hunger-style
  curves: near-zero when satisfied, dominant when critical) and picks the best. Traits re-weight the
  advertisements (a *meticulous* agent is drawn to audit tasks; a *gregarious* one to customer handover).
  Will Wright's lesson that "autonomy was too good" is respected: the player can always override, and
  agents only *propose* safety-critical decisions.
* **Infinite Axis Utility (Dave Mark).** Considerations are normalised through response curves
  (linear, quadratic, logistic, inverse) and combined multiplicatively with a compensation factor, as in
  Guild Wars 2: Heart of Thorns.
* **Generative Agents (Park et al., UIST 2023).** Each agent keeps a *memory stream* of time-stamped
  observations with an importance score; retrieval ranks by recency, importance and relevance; periodic
  *reflection* synthesises higher-level insights ("I keep finding undersized DC isolators on batch-built
  homes"); *planning* turns goals into daily task plans that react to new observations. The same three
  layers are implemented without a cloud LLM: retrieval is keyword/recency/importance scoring and
  reflection is rule-based, with an optional LLM hook for richer dialogue.
* **GOAP-lite planning** for multi-step work (e.g. to claim STCs: products approved → design compliant →
  installation tested → documents complete).
* **Autonomy levels** (observe, suggest, semi, full) following the sims4ai autonomy gating idea so users
  stay in control of what agents may do unattended.

## 4. Compliance facts encoded (Australia, 2026)

* **AS/NZS 4777.1:2024** replaced the 2016 edition (released Aug 2024, in force in most states from early
  2025). It removes the 600 V domestic DC limit (now 1000 V in line with 5033:2021), limits a switchboard
  with loads to two inverter main switches (otherwise a master switch), introduces supply-type labelling
  (alternative / independent / substitute) and allows single-phase systems up to 30 kVA subject to supply.
  Voltage rise from point of supply to inverter terminals: ≤ 2 %.
* **AS/NZS 5033:2021**: DC conditioning units / disconnection points can replace rooftop isolators; DC
  wiring must not run within 600 mm of the ceiling except in defined zones; ground-mounted arrays need
  restricted access regardless of voltage; array maximum voltage must be temperature corrected (Table 4.1
  factors when the manufacturer coefficient is not available); DC voltage drop ≤ 3 % (CEC guideline);
  string cable rating 1.25 × Isc.
* **AS/NZS 5139:2019 (+Amd 1:2025)**: lithium batteries not in habitable rooms, ceiling spaces, wall
  cavities, under stairs/walkways or on escape routes; 600 mm clearance from exits, windows, vents and
  hot water/air-conditioning units; non-combustible barrier when mounted on a combustible wall adjoining a
  habitable room (barrier extends 600 mm each side and 900 mm above); access/working space.
* **AS/NZS 3008.1.1**: voltage drop from mV/A·m tables (three-phase values; single-phase = ×1.155),
  40 °C ambient base, derating for grouping and temperature. AS/NZS 3000 total voltage drop limit 5 %.
* **STCs (solar PV)**: certificates = kW × zone rating × deeming years; zone ratings 1.622 / 1.536 / 1.382 /
  1.185 by postcode (Schedule 5 of the Renewable Energy (Electricity) Regulations 2001, 126 postcode
  ranges, embedded in full); deeming period 5 years in 2026, falling by one each year to 1 in 2030.
* **Cheaper Home Batteries Program**: battery STCs on usable capacity, factor 8.4 (Jan–Apr 2026), 6.8
  (May–Dec 2026), 5.7 (H1 2027), 5.2 (H2 2027), 4.6, 4.1, 3.6 … 2.1 by 2030; from 1 May 2026 the first
  14 kWh earn 100 %, 14–28 kWh 60 %, 28–50 kWh 15 %, nothing above 50 kWh; design and install by an SAA
  accredited person (Solar Accreditation Australia replaced CEC accreditation on 29 Feb 2024).
* **Approved products**: the CEC lists (modules, inverters, batteries) are republished as CSV by the Clean
  Energy Regulator. The Realm imports them directly (`scripts/import-cec-lists.js`), so the product vault
  is the real list with approval/expiry dates, not a simulation. AS/NZS 4777.2:2020 Amd 2 region settings
  became mandatory on 23 Aug 2025; non-compliant inverters were delisted.
* **Market context**: electricity 26–43 c/kWh by network; feed-in tariffs 2–10 c/kWh (QLD regional draft
  6.15 c for 2026-27); typical residential battery cost $550–1,000 per usable kWh installed; CEC
  consumer-guide yields of 3.5 (Hobart) to 5.0 (Alice Springs) kWh per kW per day.

## 5. Market and monetisation (2026)

* OpenSolar is free (28,000 pros, 185 countries, AI design, proposals, payments); Aurora ≈ US$1,765/yr
  with LIDAR shading and the best proposals; Pylon charges A$4–10 per project; Australian compliance
  tooling (SolarPlus, Simpro, Formitize-style job sheets) is fragmented and spreadsheet-heavy.
* Gap: nobody sells **compliance-first** tooling with live approved-product data, clause-referenced
  checklists, commissioning records and STC readiness checks in one place, let alone one that is engaging
  to use. That is the Realm's positioning: *the inspector's brain, with a crew*.
* Pricing model recommended: free tier (calculators, codex, 3 jobs), Pro per seat (unlimited jobs,
  reports, team crew), Enterprise (API, SSO, multi-jurisdiction). Global reach via a *jurisdiction*
  abstraction: AU/NZ first (same standards), then UK (BS 7671 §712, MCS, BS EN 62446, G98/G99), US (NEC
  690/705, UL 1741), EU (IEC 62446, IEC 60364-7-712). The domain engine keeps jurisdiction-specific limits
  in data, not code, so adding a region is a data task.
* Gamification evidence: in professional tools, visible mastery, streaks and achievements work when they
  reflect real competence and never gate real functionality; we never lock a calculator behind "XP".

## 6. Architecture decisions

* Pure ES-module domain engine (`docs/realm/js/domain/*`) that runs identically in the browser and in
  Node tests; every exported calculation ships with a self-test registered in the feature registry so the
  in-app "System check" count is verifiable rather than claimed.
* Offline-first: IndexedDB with localStorage fallback; the optional API server syncs state.
* No cloud dependency for intelligence: the agent model is deterministic and testable; an LLM can be
  plugged in for dialogue through `window.SOLARFLOW_LLM`.
* Accessibility: all windows keyboard-operable, ARIA roles on dialogs and tabs, reduced-motion respected.

## Sources

* Blizzard, "Get into the grid of things with the updated UI and HUD" (Dragonflight UI), 2022.
* Froehlich, "Learning UI design through World of Warcraft", 2019; GDC 2009 "Learning from WoW's quest
  design mistakes" (Jeff Kaplan).
* Game UI Database: The Elder Scrolls V: Skyrim; Delfino, "UX and UI in game design: HUD, inventory and
  menus", 2025; Tyler D&I "RPG UI Lab", 2026.
* Mark Brown (GMTK), "The genius AI behind The Sims"; Dave Mark & Kevin Dill, "Improving AI decision
  modeling through utility theory", GDC 2010; Game AI Pro 3 ch. 13 (Infinite Axis Utility in Guild Wars 2).
* Park et al., "Generative Agents: Interactive Simulacra of Human Behavior", UIST 2023.
* ECA WA and Master Electricians Australia summaries of AS/NZS 4777.1:2024; GSES "AS/NZS 5033:2021
  deep dive" and "Habitable rooms and restricted locations for battery installation"; Energy Training
  Group "Key changes to AS/NZS 5033:2021"; Solar Victoria PV audit checklist and installation guidance.
* Clean Energy Regulator: CEC approved products CSVs, postcode zone ratings (Schedule 5), Cheaper Home
  Batteries Program changes (Dec 2025); DCCEEW program page; Solar Accreditation Australia.
* GSES "Inverter power factor modes and voltage rise"; jCalc / ECalPro AS/NZS 3008 references.
* OpenSolar, Aurora Solar, Pylon pricing and product pages (2025–2026); SurgePV comparison; Australian
  Energy Council Solar Report Q2 2025; EnergyPlans feed-in tariff tables 2026; QCA draft FiT 2026-27.
