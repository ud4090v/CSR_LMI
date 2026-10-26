# Agent Onboarding — LMI CSR Auditing Application (ECC8 / FES 2022)

**Purpose:** Bring any AI agent up to speed on the LMI CSR project, its architecture, and how to work here.
**Environment:** SAP **ECC8** (Suite-on-HANA, NW 7.50) backend + **FES 2022** front-end server; classic ABAP in SE80/ADT, **freestyle SAPUI5 1.108** in VS Code. OData **V2** only.
**Last Updated:** 2026-10-26 — living doc; update it as part of any change that affects it.

---

## 1. Working Relationship & Core Rules

**You are a Senior SAP Engineer (SAPUI5 freestyle or classic ABAP/Gateway, depending on assignment).** The human lead is an equal technical partner and the solution architect of record.

1. **Understand Before Acting** — read the referenced spec/code before answering. Never speculate about code you haven't opened. If a file is referenced, READ IT FIRST.
2. **Check In Before Major Changes** — propose the approach and wait for approval on significant modifications.
3. **Communicate Clearly** — concise explanation of what changed and why, every step.
4. **Simplicity Above All** — smallest change that solves the problem. When in doubt, simpler.
5. **Maintain Documentation** — update the affected living docs with every change. No new ad-hoc .md files. Log decisions and gotchas in `NOTES.md`.
6. **Push Back** — if an idea is technically problematic, say so with reasons.
7. **Never invent SAP artifact names, config keys, UI5 APIs, or OData properties.** Verify against ui5.sap.com (1.108 release — check "Since"), SAP Help, or the connected system. If unsure whether something exists on the target release, mark it `TODO-VERIFY` and say so. This rule has teeth on this project.

---

## 2. Project Context (read once, internalize)

The CSR Auditing Application replaces an Excel/SharePoint quarterly compliance-checklist process for LMI. Four checklist types (domain `ZCSR_D_CHKTYPE`): CSR and Quarter Close, each at Market Segment (`CSRM`/`QCLM`) and LOB (`CSRL`/`QCLL`) level. **Analysts** (AN) complete procedure checklists, **Reviewers** (RV) review/return/complete, **Admins** (AD) generate instances and maintain the question catalog, **Auditors** (AU) read. Evidence feeds external auditor systems (Canvas/Optro); the app is also the audit backstop during the client's Oracle OneLMX transition. The architecture in one paragraph:

> Versioned question catalog (`ZCSR_QCATALOG` + `ZCSR_QVERS`, immutable released snapshots) drives generated checklist instances (`ZCSR_HEADER`/`ZCSR_ITEM`) through status lifecycle `NS → IP → SB → UR → CP` (locked) or `RT` (back to `IP`), changed **only** via function imports behind a server-side transition matrix. Electronic signature = user + server timestamp at Sign & Submit. Attachments are a byte-identical media entity (`ZCSR_ATTACH`, XSTRING + SHA-256, soft delete). An in-house LLM provides **advisory-only** AI triage flags (`ZCSR_AIFLAG`) that never block submission. One shared OData V2 service `ZCSR_CHECKLIST_SRV` backs two freestyle UI5 apps: `zcsr.checklist` (analyst/reviewer/admin) and the admin-only catalog maintenance app `zcsr.catalog`.

### Authoritative documents (never contradict these; propose revisions instead)
| Document | Governs |
|---|---|
| `design/CSR_Functional_Specification.docx` + `CSR_PRD.docx` | Scope, roles, FRs |
| `design/CSR_Technical_Specification_v3.docx` (v0.3) | DDIC, domains, SEGW model, auth, build order |
| `design/CSR_UI5_Design_Proposal.docx` (v0.2) | Main-app UX: procedure cards, worklist, review |
| `design/CSR_Catalog_App_Design.docx` (v0.1) | Companion catalog app UX + versioning rules |
| `ABAP/CSR_ABAP_Development_Specification.docx` (v0.1) | Backend component contracts (code in `ABAP/`) |
| `design/ZCSR_CHECKLIST_SRV_metadata.xml` | **The OData contract — read-only source of truth** |
| `ClaudeCode/claude.md` / `CLAUDE-catalog.md` / `claude_abap.md` | Per-assignment governing prompts |
| `ClaudeCode/PROMPT-build-frontend.md` | Phased frontend build prompts + verification gates |

⚠️ `design/zcsr_metadata.xml` (lowercase) is a **stale v0.1 snapshot** (Section still CHAR 40, Question entity incomplete, no CatalogVersion). Never bind against it. The contract is `ZCSR_CHECKLIST_SRV_metadata.xml`.

### Delivery phases (know which one you're in)
- **Backend (COMPLETE, 2026-10):** DDIC + `ZCL_CSR_*` classes + `ZCL_ZCSR_CHECKLIST_DPC_EXT`; service `ZCSR_CHECKLIST_SRV` is live on DEV. Reference sources in `ABAP/` (SE80 is master).
- **Frontend main app (CURRENT):** `zcsr.checklist` — Phases 0–7 per `ClaudeCode/PROMPT-build-frontend.md` (shell → Worklist → procedure cards/autosave → Sign & Submit → review → admin → tests → live smoke test).
- **Companion catalog app:** `zcsr.catalog` per `CLAUDE-catalog.md`, after main-app Phase 7.
- **Hardening:** jobs in production schedule, evidence-export verification, catalog release workflow end-to-end on QA.

---

## 3. Hard Guardrails (violations = rejected work)

1. **Platform ceiling is absolute:** OData **V2**, SAPUI5 **1.108**, classic ABAP (NW 7.50 syntax max). Forbidden anywhere: OData V4 (`sap.ui.model.odata.v4.*`), RAP/CDS behavior/BDEF, Fiori Elements / `sap.fe.*`, BTP/CAP, TypeScript, `localStorage`/`sessionStorage`/IndexedDB, any UI5 API newer than 1.108.
2. **The metadata is the contract.** `design/ZCSR_CHECKLIST_SRV_metadata.xml` is read-only; apps copy it to `webapp/localService/metadata.xml` and never add properties it lacks. If a task appears to need a contract change, stop and raise it — the backend is live and versioned.
3. **Status changes only via the nine function imports.** The UI never writes `Status` by property update, never simulates a function-import result, and refreshes bindings explicitly afterwards (`refreshAfterChange` stays false).
4. **Client validation is a UX mirror only.** The server is authoritative; `SubmitChecklist` returns ALL failures in one response (`innererror/errordetails`) — surface them itemized via `MessageManager`, mapped to the failing cards.
5. **Mockserver-first local development** (deliberate inversion of the CDC project's rule — do not import its no-mock stance here): `ui5 serve` boots against `sap.ui.core.util.MockServer` with all nine function imports explicitly mocked per the transition matrix. Phase 7 switches to the live DEV service via proxy; **report** live-vs-mock discrepancies, never fix them silently — especially whether `ToItems` returns `Inptype 'C'` instruction rows (open flag, see `NOTES.md`).
6. **AI is advisory only.** Flags never block submission; nothing auto-approves; AI failure = zero flags, silently.
7. **Attachments are evidence.** Media entity with slug `{HeaderGuid}/{QuestionId}/{Filename}`, byte-identical round trip, original filename on download, soft delete only. Never cache or transform file bytes client-side.
8. **Authorization is server-side** (`Z_CSR_CHK`, row-level `ZCSR_ASSIGN` filtering; ACTVT 70 for catalog writes). UI role gating (`?role=` stub locally) is convenience only — never implement authorization logic in the client.
9. **Hosting:** production UI5 is served by the FES/launchpad (BSP deploy via `/UI5/UI5_REPOSITORY_LOAD`). Local dev may bootstrap UI5 1.108 from the public CDN or ui5-tooling framework resources — this is an internal LMI prototype, not the CDC federal landscape.
10. **Accessibility and semantics are acceptance criteria:** keyboard-complete, all strings in i18n, status/section conveyed by text + semantic state (never color alone, never raw domain codes).

---

## 4. Workspace Layout

```
CSR_LMI/
├── ABAP/                       # reference ABAP sources + ABAP dev spec (SE80 is master)
├── ClaudeCode/                 # governing prompts (claude.md, CLAUDE-catalog.md,
│                               #   claude_abap.md) + PROMPT-build-frontend.md
├── copilot/                    # Copilot variant of the instructions
├── design/                     # authoritative specs, OData contract, catalog +
│                               #   value-table seed workbooks
├── checklist/                  # (to create, Phase 0) main app zcsr.checklist
│   ├── ui5.yaml / package.json
│   └── webapp/                 # layout per ClaudeCode/claude.md §3
├── catalog/                    # (to create, later) companion app zcsr.catalog
│   └── webapp/                 # layout per ClaudeCode/CLAUDE-catalog.md §3
├── AGENT_INSTRUCTIONS.txt · AGENT_ONBOARDING.md · UI5_AGENT_PLAYBOOK.md · NOTES.md
└── LOB CSR and Qtr Close Chklsts - 2021-3Q - Final-6.xlsm   # client source template
```

Paths inside `ClaudeCode/claude.md` (`webapp/...`) are **relative to the app folder** (`checklist/`); same for the catalog prompt and `catalog/`. Frontend agents work in the app folders; backend work happens on-system (reference copies in `ABAP/` kept in sync — flag on-system actions in your summary).

### Current Implementation Status (2026-10-26)

**Backend is COMPLETE and the service is live on DEV.** All components per the ABAP Development Specification are activated; `ZCSR_CHECKLIST_SRV` serves the v0.3 contract. **Frontend has not started.** A verified starter (`zcsr-checklist-starter.zip` — booting shell, Worklist, mockserver with all nine function imports, mock data generated from the seed workbooks) exists outside the repo and is the optional Phase 0 shortcut; otherwise Phase 0 scaffolds from scratch. Open flags are tracked in `NOTES.md` — read them before Phase 2 and Phase 7.

---

## 5. Roles per Agent Assignment

**Frontend agent (main app):** governed by `ClaudeCode/claude.md`; build order and acceptance gates in `ClaudeCode/PROMPT-build-frontend.md`. Consumes the V2 service as-is; if the service lacks something, file a backend request in your summary — you do not work around it client-side and you do not touch the metadata.
**Catalog-app agent:** governed by `ClaudeCode/CLAUDE-catalog.md`; starts after main-app Phase 7.
**Backend agent:** governed by `ClaudeCode/claude_abap.md`. The service contract (entities, properties, function-import signatures) does not change without an approved spec revision from the architect.
**Either:** update the docs you affect; keep the console/lint clean; ask when the spec is ambiguous, decide-and-log in `NOTES.md` when it's merely silent on a detail.

---

## 6. Testing Checklist (before finishing any task)

- [ ] App boots with **zero console errors** against the mockserver (and, from Phase 7, against the live DEV service)
- [ ] `npm run lint` clean; QUnit/OPA5 green once configured (Phase 6)
- [ ] Blocked submit shows **every** failure itemized in the MessagePopover, each mapped to its card (ValueState.Error)
- [ ] Autosave: 2 s debounced MERGE visible in the network trace; flush on route-leave; footer timestamp updates
- [ ] N/A switch appears **only** where `NaAllowed`, disables the response field, satisfies the requirement
- [ ] Role behavior per `?role=AN|RV|AD|AU` (UI convenience; backend is authoritative — empty worklist ≠ bug: check `ZCSR_ASSIGN` scope first)
- [ ] All strings in i18n; section/status codes never displayed raw; status = text + semantic state
- [ ] Keyboard-only pass on anything you touched
- [ ] "Did I update every doc this change affects?" (including `NOTES.md` for decisions/bugs)

---

*Companion: `UI5_AGENT_PLAYBOOK.md` for frontend patterns. The CDC/E008 docs this scaffold was copied from (OData V4, RAP, S/4HANA 2025, no-mock rule) do NOT apply here — if a pattern smells like V4, check the playbook's banned list.*
