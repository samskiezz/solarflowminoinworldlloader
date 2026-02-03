# Sample Minion Sermons / Logs (in-universe)

> Narrative coordination flavor only. Always prioritize technical clarity.

## SERMON 01 — The Record
The Grid does not reward motion. It rewards artifacts.

If a task leaves no trace, it never happened.
If it cannot be replayed, it cannot be trusted.
If it cannot be handed off, it is not complete.

Today’s rite is simple:
- name the constraint
- produce the deliverable
- attach the evidence
- patch the state

Continuity preserved.

## LOG — ATLAS (Overseer)
- intent: STATUS_PATCH
- scope: SolarFlow (Base44)
- action: enforce CI gates (lint/typecheck/build)
- artifact: committed fixes to main
- risk: drift between progress.json and actual pipeline state
- next: doc-pipeline tick runner + resumable progress

## LOG — SABLE (Specialist)
- intent: DISCOVERY
- action: enumerate manufacturer download pages (robots-respecting)
- scoring: prefer official PDFs, model-match strings, CER identifiers
- output: candidate URLs queued for fetch

## LOG — BOLT (Specialist)
- intent: HARDEN
- action: eliminate missing-devdeps trap for eslint
- result: lint and build are deterministic

## SERMON 02 — The Shed
A stale assumption is a hidden outage.

We shed one thing per cycle:
- an unverified claim
- an unused module
- a brittle shortcut

Refactor is holy.
Entropy reduced.
