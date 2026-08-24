# CLAUDE.md — CSR Auditing Application

You are developing the **CSR Auditing Application**: a freestyle SAPUI5 app replacing an
Excel/SharePoint quarterly compliance-checklist process, backed by a classic ABAP OData V2
service on SAP ECC. This file governs every session in this repository. Where it conflicts
with your general knowledge, **this file wins**.

## Prime directive: never fabricate APIs

Before writing any call against an API you are not 100% certain of — SAPUI5 controls,
methods, or constructor settings; OData V2 model methods; ABAP classes/function modules —
**verify against live documentation first** (ui5.sap.com API reference for the 1.108
release, SAP Help / ABAP docs). If you cannot verify, say so explicitly and propose a
verified alternative. Never invent OData properties, UI5 APIs, ABAP classes, config
parameters, or SAP notes. Flag every uncertainty; never paper over one with
plausible-looking code.

## 1. Hard platform constraints — never violate

| Layer | Constraint |
|---|---|
| Backend | SAP ECC8 (Suite-4-HANA), **classic ABAP OO only** |
| Service | SAP Gateway **OData V2** via SEGW (`ZCSR_CHECKLIST_SRV`), DPC_EXT/MPC_EXT classes |
| Frontend | **Freestyle SAPUI5 1.108** (FES 2022 baseline), XML views, JS controllers |
| Deployment | BSP repository on the Front-End Server, launchpad tile |
| AI | In-house LLM platform, OpenAI-compatible API, called **from ABAP only** (SM59 + CL_HTTP_CLIENT) |

**Forbidden — do not generate:**
- RAP, CDS behavior definitions, BDEF, `@ObjectModel`/`@UI` annotations, ABAP Cloud syntax
- OData **V4** anything: `sap.ui.model.odata.v4.ODataModel`, V4 `$batch` payloads
- Fiori Elements, `sap.fe.*`, annotation-driven UIs
- SAP BTP services, CAP, Node backends
- TypeScript — plain JS with `sap.ui.define` AMD modules only
- `localStorage` / `sessionStorage` / IndexedDB — state lives in the OData backend or in-memory JSONModel
- UI5 APIs newer than **1.108** (check "Since" in the API reference when verifying)

## 2. Commands

```bash
npm install            # once
npx ui5 serve          # local dev server with mockserver (http://localhost:8080/index.html)
npm run lint           # eslint (UI5 profile)
npm test               # QUnit unit tests (karma)
npm run opa            # OPA5 journeys
```

After ANY code change: run lint + affected tests before considering the task done.
If a command or script above does not exist yet, creating it is part of repo setup — ask
before changing test tooling choices.

## 3. Repository layout

```
webapp/
  manifest.json            # app descriptor: models, routing (see §5)
  Component.js             # role bootstrap, device model, central error handler
  index.html
  view/App.view.xml        # sap.m.App root
  view/Worklist.view.xml         + controller/Worklist.controller.js
  view/ChecklistDetail.view.xml  + controller/ChecklistDetail.controller.js
  view/ReviewQueue.view.xml      + controller/ReviewQueue.controller.js
  view/AdminBoard.view.xml       + controller/AdminBoard.controller.js
  view/NotFound.view.xml
  fragment/{UploadDialog,ReturnNotesDialog,ReassignDialog,ExportDialog,MessagePopover}.fragment.xml
  model/formatter.js       # status/severity/color formatters
  model/roles.js           # AN/RV/AD/AU role helper
  css/style.css            # .zcsrInput .zcsrAttach .zcsrComment ONLY
  i18n/i18n.properties     # ALL user-facing text — never hardcode strings
  localService/metadata.xml       # ZCSR_CHECKLIST_SRV contract — READ-ONLY SOURCE OF TRUTH
  localService/mockserver.js
  localService/mockdata/*.json
abap/                      # reference ABAP sources (SE80-managed; review copies only)
```

App ID `zcsr.checklist`; namespace every module `zcsr/checklist/...`.
Generate all bindings from `localService/metadata.xml`; never add properties it lacks.
If a task appears to need a contract change, stop and raise it — the metadata is versioned
with the backend and does not change casually.

## 4. Data contract (OData V2, `ZCSR_CHECKLIST_SRV`)

Entity sets (keys):
- `ChecklistHeaderSet` (HeaderGuid) — read-only; **status never changes via property update**
- `ChecklistItemSet` (HeaderGuid, QuestionId) — MERGE-updatable: `Response`, `NaFlag` only
- `AttachmentSet` (AttachGuid) — **media entity**: POST stream + `slug` to create, `$value` to read, DELETE = soft delete
- `ReviewSet`, `AiFlagSet` (read-only), `QuestionSet` (read-only)
- Value helps: `MarketSegVHSet` (has `Lob` for cascading), `LobVHSet`, `AnalystVHSet`

Navigation: Header → `ToItems` / `ToAttachments` / `ToReviews` / `ToAiFlags`;
Item → `ToAttachments`.

`ChecklistItem` denormalized read-only catalog fields: `Section`, `Seqnr`, `Title`,
`QuestionText`, `ExampleText`, `Inptype` (`I`|`C`), `RespRequired`,
`AttachMode` (`N`|`O`|`R`), `NaAllowed`.

Function imports — **the only way state changes** (all POST unless noted):
`SubmitChecklist(HeaderGuid)` · `StartReview(HeaderGuid)` ·
`CompleteReview(HeaderGuid, Outcome, Notes)` · `ReassignChecklist(HeaderGuid, NewAnalyst)` ·
`GenerateInstances(Chktype, PeriodYear, PeriodQtr)` · `TriggerAiTriage(HeaderGuid)` ·
`ExportEvidence(HeaderGuid)` (GET → binary ZIP, trigger browser download).

Status flow: `NS` → `IP` → `SB` → `UR` → `CP` (locked) or `RT` (→ `IP`). UI never writes `Status`.

## 5. Routing (manifest)

| Route | Pattern | View | Access |
|---|---|---|---|
| `worklist` | `` | Worklist | AN/AD |
| `detail` | `checklist/{headerGuid}` | ChecklistDetail, mode=edit | owner/backup/AD |
| `review` | `review` | ReviewQueue | RV/AD |
| `detailReview` | `review/{headerGuid}` | ChecklistDetail, mode=review | RV/AD |
| `admin` | `admin` | AdminBoard | AD |
| `notFound` | `:all*:` | NotFound | — |

One ChecklistDetail view serves both modes; `{app>/mode}` drives editability via expression
binding. Deep links (`#/checklist/{guid}`) come from reminder e-mails — guard in
`onPatternMatched`, send 403s to NotFound. UI role gating is convenience; the backend
AUTHORITY-CHECK is authoritative.

## 6. ChecklistDetail — procedure cards (core screen)

One card per `ChecklistItem` with `Inptype === 'I'`, ordered by `Seqnr`, grouped by
`Section`. `Inptype === 'C'` rows render inside a collapsed **Instructions panel** above
the first card (auto-expanded on a checklist's first open).

Card anatomy, top to bottom:
1. **Title bar** — `"{Seqnr} · {Title}"` + completion indicator (✓ answered / open / N/A)
2. **Requirement text** — `sap.m.Text` `maxLines="3"` + "Show more" toggle
   (`QuestionText` is 600–1,600 chars; never fully expanded by default)
3. **Example** — collapsed `sap.m.Panel` with `ExampleText` (omit when empty)
4. **Response** — growing `sap.m.TextArea`, class `zcsrInput` (green). N/A `sap.m.Switch`
   renders **only when `NaAllowed`**; on = TextArea disabled, `NaFlag=true`, requirement satisfied
5. **Attachments** — only when `AttachMode !== 'N'`: `sap.m.upload.UploadSet` bound to the
   item's `ToAttachments`, class `zcsrAttach` (yellow). Label "Optional Attachments" (O)
   or "Required evidence" (R)

Autosave: `liveChange` → 2 s debounce → `oModel.submitChanges()` (MERGE batch); flush on
route-leave; footer shows "Draft autosaved hh:mm:ss". Set `refreshAfterChange=false` and
refresh bindings explicitly after function imports.

Submit button: **"Sign & Submit"** (i18n `btnSignSubmit`). On business error, push the V2
error container details into `MessageManager`, map each failing `QuestionId` to its control
(`ValueState.Error` + text), open the message popover. Success: refresh header, lock form,
`MessageToast`.

Review mode: read-only form, AI-flag panel expanded, footer = "Complete Review" /
"Return to Analyst" (ReturnNotesDialog; notes mandatory client-side AND server-enforced).

## 7. Validation semantics (client mirror; server authoritative)

Submittable when, for every `Inptype === 'I'` item:
- `RespRequired` → `Response` non-empty **or** (`NaAllowed` && `NaFlag`)
- `AttachMode === 'R'` → ≥1 non-deleted attachment on the item

`AttachMode === 'O'` never blocks. Client checks are UX only — never skip the function
import or simulate its result.

## 8. Formatters, styling, UX conventions

- `formatter.statusState`: NS→None, IP→Warning, SB/UR→Information, RT→Error, CP→Success
- `formatter.severityState`: H→Error, M→Warning, L→Information
- Theme `sap_horizon`; custom CSS limited to the three `.zcsr*` classes. Restyle nothing else.
- Status always conveyed by text + semantic state, never color alone.
- Worklist filter bar: cascading LOB → Market Segment ComboBoxes (`MarketSegVHSet`
  filtered by `Lob`); whole-LOB CSR rows show Segment "All".
- Tables: `growing="true"` `growingThreshold="25"`; never load full sets client-side.

## 9. ABAP reference (for backend snippets in `abap/`)

- Classic ABAP OO. Tables: `ZCSR_HEADER`, `ZCSR_ITEM`, `ZCSR_QCATALOG`, `ZCSR_ATTACH`,
  `ZCSR_REVIEW`, `ZCSR_ASSIGN`, `ZCSR_AIFLAG`, `ZCSR_DEADLINE`.
- Attachments: XSTRING written **directly** to `ZCSR_ATTACH-CONTENT` (never
  `EXPORT ... TO DATA BUFFER`); SHA-256 via `CL_ABAP_MESSAGE_DIGEST`; storage only through
  `ZIF_CSR_ATTACH_STORE` (prototype impl `ZCL_CSR_ATTACH_DB`; future `ZCL_CSR_ATTACH_AL`).
- Media in DPC_EXT `CREATE_STREAM`/`GET_STREAM`; `Content-Disposition` with original
  filename; byte-identical round trip is a hard requirement.
- Business errors: `/IWBEP/CX_MPC_BUSI_EXCEPTION` + message container so `SubmitChecklist`
  returns ALL failures in one response.
- Lock object `EZCSR_HEADER`; change documents (SCDO `ZCSR`) on every state change;
  transitions validated against the matrix in `ZCL_CSR_MODEL`.
- AI: `ZCL_CSR_AI_CLIENT`, SM59 dest `ZCSR_LLM`, POST `/v1/chat/completions`, JSON-only,
  parsed via `/UI2/CL_JSON`. AI failure = zero flags, never blocks submission; advisory only.

## 10. Local dev & testing

- Mockserver (`sap.ui.core.util.MockServer`) against `localService/metadata.xml`; mock data
  mirrors the seeded catalog (4 CSR-LOB + 3 QC-LOB procedures, instruction rows) and value
  tables (LOBs MIC2/SEMS/SAC/TLS; 13 segments + 'ALL').
- Mock function imports explicitly (MockServer does not auto-mock them) with handlers that
  mutate mock status per the transition matrix.
- QUnit: `formatter.js`, validation mirror. OPA5 journeys: analyst happy path
  (fill → Sign & Submit), blocked submit with itemized errors, N/A flow, reviewer return.

## 11. Workflow

1. **Plan before editing** on multi-file tasks: state the files you'll touch and why; wait
   for confirmation on anything architectural.
2. Implement in small, reviewable increments; prefer editing existing files over creating
   parallel variants.
3. **Verify**: lint + tests after every change; boot `ui5 serve` and check the affected
   screen renders without console errors before declaring done.
4. Definition of done: works against mockserver, zero console errors, all strings in i18n,
   keyboard accessible, no APIs outside verified UI5 1.108.
5. If requirements are ambiguous or conflict with `metadata.xml`, ask — do not guess.
