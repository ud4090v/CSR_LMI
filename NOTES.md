# NOTES — LMI CSR Auditing Application

Running log of decisions, corrections, bugs and open flags. Append dated entries;
newest first. Agents: read the **Open flags** section before starting any task.

---

## Open flags (resolve, then move to the log with the outcome)

1. **`ToItems` and instruction rows (affects frontend Phase 2 + Phase 7).**
   The UI design renders the Instructions panel from `ChecklistItem` rows with
   `Inptype = 'C'`. The reference ABAP `GENERATE_INSTANCES` created `ZCSR_ITEM`
   records only for `INPTYPE = 'I'`. Whether the live DPC returns `C` rows under
   `ToItems` (synthesized from the bound catalog version) or not decides the
   frontend approach: panel from `ToItems` vs. panel from `QuestionSet` for the
   header's `CatalogVers`. **Verify on the first live-service call; do not
   improvise client-side.**
2. **`NA_ALLOWED` missing from the catalog seed workbook.**
   `design/ZCSR_QCATALOG_seed_v0001.xlsx` predates the v0.2 field. Before (or
   at) catalog load, derive the column from the client template's explicit N/A
   permissions (`LOB CSR and Qtr Close Chklsts - 2021-3Q - Final-6.xlsm`).
   Frontend mock data meanwhile uses demo values only.
3. **Stale metadata copy in `design/`.**
   `design/zcsr_metadata.xml` is the obsolete v0.1 contract (Section CHAR 40,
   incomplete Question entity, no CatalogVersion/version FIs). Recommend
   deleting it or renaming to `zcsr_metadata_v0.1_OBSOLETE.xml`. The contract
   is `design/ZCSR_CHECKLIST_SRV_metadata.xml`.
4. **Market Segment templates (CSRM/QCLM) still pending from the client.**
   Catalog version 0001 covers CSRL + QCLL only. When the segment templates
   arrive they may grow the `ZCSR_SECTION` domain (DDIC transport each) — see
   Tech Spec changelog v0.2 item 7.

---

## Log

### 2026-10-27 — AI Integration Specification added
- `design/CSR_AI_Integration_Specification.docx` (v0.1, 7 pp): the AI
  architecture made explicit — backend-only decision rationale (credential
  custody, flags-as-audit-artifacts, unattended paths, CORS/topology, data
  governance), SM59/STRUST wiring, prompt/response contract, three trigger
  paths with sequence diagram, failure semantics, platform confirmation
  checklist (9 items for the LLM platform team), and the proposed
  TVARVC parameterization (ZCSR_LLM_MODEL / ZCSR_LLM_PATH) for
  ZCL_CSR_AI_CLIENT — to be applied on-system, then synced to ABAP/.

### 2026-10-27 — Mockup guided tour + client demo deck
- Mockup enhanced with **in-app guidance mode** behind a runtime parameter:
  `index.html?guide=1` (also `tour=1`) shows a "Guided tour" button / G key;
  spotlight coachmarks explain every UI element per screen (guide.js + CSS;
  absent without the parameter; independent of presenter mode). Verified
  headless: param gating, 8 worklist + 11 detail steps, zero console errors.
- **`mockup/CSR_Product_Demo_Walkthrough.pptx`**: 14-slide client demo deck —
  pains→solution, annotated walkthroughs of all six screens (real screenshots,
  numbered callouts), analyst/reviewer/admin workflows, guided-tour slide,
  acceptance ask. Speaker notes throughout. DEMO_SCRIPT.md documents both.

### 2026-10-26 — Mockup track added ahead of the full build
- Client asked for a quick demo mockup for acceptance BEFORE the full frontend
  build. New track: `ClaudeCode/PROMPT-mockup-demo.md` (phases M1-M4) governed
  by `mockup/CLAUDE.md`. Key rules: throwaway vanilla HTML/CSS/JS (NOT UI5,
  never upgraded into the product), Horizon fidelity ceiling (nothing the real
  1.108 app can't render), real procedure/LOB content verbatim from the
  design/ seed workbooks, confidential (no public hosting), presenter rail +
  DEMO_SCRIPT.md for the meeting. After acceptance: tag, freeze, log outcome
  here, proceed with PROMPT-build-frontend.md.

### 2026-10-26 — Repo structure finalized; flag #4 resolved
- CLAUDE.md architecture: thin router at repo root + per-folder governing
  prompts (`checklist/`, `catalog/`, `ABAP/`); `ClaudeCode/` holds only the
  phased build prompts. Frontend build prompt aligned to the layout.
- RESOLVED (was open flag #4): duplicate `ABAP/readme.md` stub removed
  (case conflict with `ABAP/README.md` on Windows checkouts).

### 2026-10-26 — Backend complete; frontend phase begins; agent scaffolding adapted
- `ZCSR_CHECKLIST_SRV` is live on DEV; all ABAP components activated
  (reference copies in `ABAP/`, contracts in the ABAP Development Specification).
- Agent scaffolding (`AGENT_INSTRUCTIONS.txt`, `AGENT_ONBOARDING.md`,
  `UI5_AGENT_PLAYBOOK.md`, this file) adapted from the CDC/E008 originals to
  LMI CSR. Key inversions vs. CDC: OData **V2** not V4; freestyle UI5 **1.108**
  not S/4-delivered; **mockserver-first** local dev (CDC banned mocks); CDN
  bootstrap permitted for local dev (CDC banned external hosting). CDC-only
  rules (ETag/412 flows, RAP field control, draftless-RAP concerns) removed.
- Frontend build plan: `ClaudeCode/PROMPT-build-frontend.md` (Phases 0–7 with
  verification gates). Verified starter repo `zcsr-checklist-starter.zip`
  (booting shell + Worklist + mockserver with all nine function imports +
  mock data generated from the seed workbooks) available as the Phase 0 shortcut.

### 2026-08/09 — Design-suite corrections worth remembering (from the design phase)
- **Gateway business exception is `/IWBEP/CX_MGW_BUSI_EXCEPTION`** (with the
  DPC message container). Early drafts said `/IWBEP/CX_MPC_BUSI_EXCEPTION`,
  which does not exist; all docs and prompts were corrected. If you see the
  MPC variant anywhere, it's a leftover — fix it and log here.
- `SECTION` converted from CHAR 40 free text to fixed-value domain
  **`ZCSR_SECTION`** (`P` = Procedures, `I` = Instructions / Notes); adding
  future section values is a DDIC change + transport.
- v0.2 template-driven model deltas: INPTYPE 'A' removed in favor of
  `ATTACH_MODE` (N/O/R) + `RESP_REQUIRED`; `TITLE`/`EXAMPLE_TEXT` added and
  denormalized into `ChecklistItem`; `NA_ALLOWED` added; `MARKET_SEG` accepts
  literal `'ALL'`; `ZCSR_MSEG` carries parent LOB (cascading filters);
  submit labeled **"Sign & Submit"**.
- v0.3 catalog deltas: `ZCSR_QVERS` version table (Draft/Released, one-way
  release), `QuestionSet` CRUD gated by server-computed `Editable`,
  `CopyCatalogVersion`/`ReleaseCatalogVersion` function imports, change
  documents extended to catalog writes, ACTVT 70 for catalog maintenance.
