# CLAUDE.md — CSR_LMI monorepo router

This repository holds the **LMI CSR Auditing Application**: a versioned-catalog,
quarterly compliance-checklist platform on **SAP ECC8 / FES 2022** — classic ABAP +
Gateway **OData V2** (`ZCSR_CHECKLIST_SRV`, live on DEV) + two **freestyle SAPUI5 1.108**
apps. NOT RAP, NOT CDS behavior, NOT OData V4, NOT Fiori Elements, NOT BTP, NOT
TypeScript — anywhere in this repo.

This root file is a router only. **Before any task, read at the repo root:**
1. `AGENT_INSTRUCTIONS.txt` — working relationship and core rules
2. `AGENT_ONBOARDING.md` — project context, hard guardrails, status, testing checklist
3. `UI5_AGENT_PLAYBOOK.md` — frontend patterns (V2 on 1.108)
4. `NOTES.md` — **open flags first**, then the decision log

## Which prompt governs your work

| You are working in / on | Governing prompt (auto-loads there) |
|---|---|
| `checklist/` — main app `zcsr.checklist` | `checklist/CLAUDE.md` |
| `catalog/` — companion app `zcsr.catalog` | `catalog/CLAUDE.md` |
| `ABAP/` — backend (live; maintenance mode) | `ABAP/CLAUDE.md` |
| `mockup/` — client-demo mockup (throwaway, NOT UI5) | `mockup/CLAUDE.md` |

Open your Claude Code session with the app folder as the working directory so the
folder's `CLAUDE.md` loads automatically; if you are working from the repo root, read
the governing prompt for your assignment before touching its files.

Frontend build order and per-phase verification gates: `ClaudeCode/PROMPT-build-frontend.md`.
Client-demo mockup track (runs BEFORE the full build): `ClaudeCode/PROMPT-mockup-demo.md`.

## Non-negotiables that apply repo-wide

- The OData contract is `design/ZCSR_CHECKLIST_SRV_metadata.xml` — read-only; the
  backend is live and versioned with it. Never bind against the stale
  `design/zcsr_metadata.xml`. Contract needs are raised, not implemented.
- Never fabricate SAP artifact names, UI5 APIs, config keys, or OData properties.
  Verify (ui5.sap.com 1.108 "Since", SAP Help, the connected system) or mark
  `TODO-VERIFY` and say so.
- Status changes only via the service's function imports; authorization is
  server-side; AI triage is advisory and never blocks.
- Living docs: update the ones your change affects; log decisions and gotchas in
  `NOTES.md`. No new ad-hoc .md files.
