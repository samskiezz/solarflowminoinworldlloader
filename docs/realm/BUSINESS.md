# The real business inside Solarhaven

Solarhaven is no longer only a simulation. With the business connectors on, every house in the
suburbs is a real site from ServiceM8, every quest can be a real problem the minions found, and
the windows read the company's actual numbers from Xero, the mailbox, Drive, the calendar and
the bank feed.

Everything is **read-only**. The game never writes to ServiceM8, Xero, Google or the bank. Customer
records live on your own server (`DATA_DIR/business/`) and in the browser's private cache. Nothing
is written into the public site or the shared game save, and the source code contains no customer
data (tests use fictional names).

## What is read and what the minions do with it

| Source | Read | Used for |
|---|---|---|
| **ServiceM8** | jobs (all statuses), companies, staff, queues, categories, job activities (the schedule) | the pipeline by stage, sites and the installed base, sold-but-unscheduled work, stale work orders, jobs missing customer/NMI/contact, duplicate open jobs, safety forms, team-on-site counts |
| **Xero** | profit and loss, balance sheet, invoices and bills for the period, unreconciled bank queue, organisation | margins, run-rate, runway, working capital, overdue receivables per invoice (linked to the job by the `SM8-<job>` reference), payables, customer concentration, labour share, card fees, bookkeeping backlog |
| **Gmail** (one mailbox, or every workspace mailbox with domain-wide delegation) | thread metadata only: from/to/cc, subject, snippet, labels, dates | who is waiting on a reply and for how long, leads, quotes, complaints, legal letters, network-operator approvals, supplier invoices, response times; threads attach to sites by address, customer email or job number |
| **Google Drive** | the Handover Documents folder and each customer folder's file names | handover pack coverage of the installed base and what each pack is missing (CCEW, commissioning, STC form, warranties, manual, photos, SLD, DNSP approval, invoice, safety sheet) |
| **Google Calendar** | events 60 days back and 90 ahead | clashes, the weekly jobs meeting's attendance, the lead-farm numbers left in sales-call notes |
| **Bank feed** | accounts, balances, transactions | days of cash, recurring payments, duplicate payments, bank vs Xero variance, consent expiry |
| **Facebook & Instagram** | pages and the linked Instagram business accounts: followers, posts with reactions/comments/shares, the comments, the Messenger inbox (metadata + last message), media reach and saves | posting cadence and best times, engagement rate, unanswered questions and price enquiries (leads), installs not yet shown; the crew's drafts and the approval queue |
| **Market** | editable assumptions (STC price, battery discount factor, price bands, wholesale) and a watchlist | quote benchmarking, incentives, lead-farm economics, "re-verify" reminders |

The rules live in `docs/realm/js/business/insights.js` (39 rules, each owned by the minion whose
specialty fits: Kite chases invoices, Echo and Prism watch the inbox, Quill the handover packs,
Forge and Orbit the schedule, Lumen and Vault the money, Cipher and Rune pricing and market, Sentry
data quality, Moss safety, Sage people, Atlas strategy and legal). Every finding carries evidence, a
dollar impact where one can be estimated, the action to take and a deep link to the source record.
Findings become **business quests** (Quests › Business quests) that pay credits when resolved.

## Windows (hotkeys)

| Window | Key | Shows |
|---|---|---|
| Business HQ | Shift+B | health score, money, work, customers and documents at a glance; pipeline by stage; connector status and sync |
| Findings | Shift+K | every open finding with filters, owners, resolve/snooze, "ask the minion" |
| Sites & suburbs | Shift+I | every address with stage, system, revenue, overdue, waiting emails and pack status; suburbs as districts; the site file |
| Inbox | Shift+N | conversations waiting on us, all threads, response performance |
| Finance | Shift+F | position, P&L, receivables/payables ageing, invoices and bills, bank feed and reconciliation |
| Calendar & schedule | Shift+G | upcoming events, sold work with no date, meetings and the lead-farm numbers |
| Handover packs | Shift+T | coverage, each pack's completeness, installed sites without a pack, the standard |
| Market intel | Shift+M | benchmark a quote, lead-funnel economics, assumptions, watchlist |
| People | Shift+Y | staff and contractors with cost, weekly rate and jobs on site |
| Social media | Shift+J | accounts and reach, cadence and engagement, the inbox of unanswered comments and messages with suggested replies, the crew's drafts, the approval queue and the post history |

In the world: every real site is a house on a suburb lot (suburbs are districts with labels on the
ground and on the minimap), the house state follows the real stage, and "Visit in Solarhaven" in the
site file walks you to its door. The player bounds and the map grew to fit the suburbs.

## Setting it up

### 1. The server does the syncing

Put the credentials in the API server's `.env` (see `.env.example`, section *Business connectors*):

- `SERVICEM8_API_KEY` (a private-app key) or `SERVICEM8_EMAIL` + `SERVICEM8_PASSWORD`
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID` – a Xero *custom connection* with the read-only
  scopes `accounting.reports.read accounting.transactions.read accounting.contacts.read accounting.settings.read`
- Google Workspace, either:
  - `GOOGLE_SERVICE_ACCOUNT_JSON` (path or JSON) + `GOOGLE_IMPERSONATE=info@yourdomain` with domain-wide
    delegation for the read-only scopes `gmail.readonly`, `drive.metadata.readonly`, `calendar.readonly`,
    `admin.directory.user.readonly`; set `GOOGLE_ALL_USERS=true` to read every mailbox in the workspace
    (the "admin portal" view: all mail to and from every staff address), or
  - `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN` for one mailbox
  - `GOOGLE_HANDOVER_FOLDER_ID` (the Drive folder that holds one folder per customer), `GOOGLE_CALENDAR_ID`
- `BANK_FEED_URL` + `BANK_FEED_TOKEN` – any read-only endpoint returning `{banks, accounts, transactions}`
- `META_ACCESS_TOKEN` – a long-lived user or system-user token from a Meta app with `pages_show_list`,
  `pages_read_engagement`, `pages_read_user_content`, `read_insights`, `instagram_basic`,
  `instagram_manage_comments`, `instagram_manage_insights`, `pages_messaging`; `META_PAGE_IDS` /
  `META_IG_USER_IDS` to limit which accounts (blank = every page the token can see). Publishing
  additionally needs `pages_manage_posts` + `instagram_content_publish` and `META_ALLOW_PUBLISH=true`;
  even then only drafts an admin approved in the Social window are posted.
- `BUSINESS_API_TOKEN` – a long random token the game may use instead of a user login
- `BUSINESS_SYNC_MINUTES` – re-sync on a timer (0 = only when you press Sync)
- `BUSINESS_NAME`, `BUSINESS_DOMAINS` – your company name and the email domains that count as "us"

Then either press **Sync now** in Business HQ › Connectors (as an admin) or call the API:

```
POST /api/business/sync          (admin JWT or BUSINESS_API_TOKEN; add ?wait=1 to wait for it)
GET  /api/business/status
GET  /api/business/model         (the built model; the game loads this)
POST /api/business/import        (a raw payload, a built model, or {snapshot, passphrase} for an encrypted one)
POST /api/business/social/publish (admin; an approved draft {text, platforms, imageUrl?, link?}; needs META_ALLOW_PUBLISH)
GET  /api/business/raw/:source   (servicem8 | xero | google | bank | meta)
```

Raw payloads are kept in `DATA_DIR/business/raw/*.json` and the model in `DATA_DIR/business/model.json`.
Drop a `market.json` next to them to override the market assumptions.

### 2. Without the server: build a snapshot and import it

Export from each system (or use the server's raw files) into a folder and run

```
node scripts/business-snapshot.mjs data/business/raw data/business/model.json
```

The script lists the file names it understands; per-job detail records go in `details/*.json`, extra
Gmail pages in `gmail-pages/*.json` and per-folder Drive listings in `drive-folders/*.json` (merge them
into `drive.json` → `files` keyed by folder id). Import the result in the game under
**Settings › Business › Import a snapshot file**; it stays in the browser's private cache. `data/` is
gitignored, so neither the exports nor the model can reach the public site by accident.

To move a model safely (Drive, email, a USB stick) seal it: `SNAPSHOT_PASSPHRASE='five words and a number'
node scripts/business-snapshot.mjs data/business/raw data/business/model.enc.json --encrypt`, or
**Settings › Business › Export encrypted** in the game. The file is gzipped and encrypted with AES-256-GCM
under a key derived from the passphrase (PBKDF2-SHA256, 310k rounds); importing asks for the passphrase and
decrypts in the browser. Without the passphrase the file is noise.

### 3. In the game

Log in (Settings › Data › Cloud save) or paste the business token as the cloud token, then
Settings › Business › *Pull model from server*. The sites are mirrored into Solarhaven automatically
(up to 220 houses; the rest are listed in the Sites window). "Load the example business" shows the
whole thing with fictional data.

## The crew's families and the company's epochs

Every minion carries digital DNA (`docs/realm/js/sim/genetics.js`): personality, cognition, body and an
aptitude for each skill. As the clock runs they meet, befriend or fall out with each other, pair up, and
have children who inherit genes, looks and a share of their parents' skills; children grow up in town and
can be recruited once grown, elders mentor, and the very old are remembered at the memorial (Crew ›
Family). The company itself climbs 24 real milestones of a solar business (`sim/epochs.js`) driven by the
installed base, revenue, crew expertise and the findings you resolve.

## Social media: what the crew does

With a Meta token on the server the crew reads every page and Instagram account: Prism watches cadence and
engagement, Echo answers (suggested replies for every unanswered comment and message, price enquiries
flagged as leads with a one-click lead job), Quill writes install stories from real jobs – suburb and system
only, never the customer's name – Cipher writes rebate and market posts, Rune introduces new products.
Everything is a draft until you approve it in the Social window; publishing goes through your server and
only when `META_ALLOW_PUBLISH=true`. With publishing off, copy the approved text into the Facebook or
Instagram app.

## Privacy and limits

- Read-only everywhere; no connector is ever asked to change, send or delete anything.
- Mail is metadata only (headers, labels, snippet); bodies are never fetched.
- The public GitHub Pages site contains no business data. The model lives on your server and in your
  browser; export/clear it from Settings › Business. Encrypted snapshots may travel; plain ones should not.
- Social posts never name a customer; nothing is published without an admin's approval and the server flag.
- The market figures are assumptions dated in the Market window; the crew is told to re-verify them.
