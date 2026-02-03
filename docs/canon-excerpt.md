# Canon Excerpt (in-universe)

## Book of Decisions — Excerpt: No-Fetch Loader Principle
**Decision:** The public loader UI must render without network fetch.

**Rationale:**
- Mobile cache failures caused stale UI and broken deployments.
- GitHub Pages is static; runtime fetch adds failure modes.

**Constraint:**
- Canonical state must be embedded in the HTML build output.

**Implementation:**
- `docs/hive_state.json` is the single source of truth.
- `scripts/build_index.js` embeds the canonical snapshot.
- Derived JSON (`status/feed/minions/agora`) is generated and committed.

**Audit rule:**
If derived files are edited directly, drift is assumed. Regenerate.

## Protocol Archive — Artifact Discipline
- Deliverables first.
- Minimal patch after.
- Always include evidence (URLs, logs, IDs, hashes).

The Canon holds.
