# LMI CSR UI5 Playbook — OData V2 on ECC8 / FES 2022

**Purpose:** Frontend patterns for AI agents on the CSR Auditing Application. Replaces the CDC/E008 (V4) playbook this file was copied from.
**Stack:** Freestyle **SAPUI5 1.108** (FES 2022 baseline — verify "Since ≤ 1.108" in the API reference before using any control/method), theme **Horizon** (`sap_horizon`), **OData V2 model** (`sap.ui.model.odata.v2.ODataModel`), two apps on one service: `zcsr.checklist` + `zcsr.catalog`.
**Last Updated:** 2026-10-26 — living doc.

> ⚠️ Patterns from the CDC/E008 playbook that do NOT apply here — if you catch yourself writing any of these, you're following the wrong playbook: `sap.ui.model.odata.v4.ODataModel`, `bindContext(...)`/`invoke()` bound actions, `requestProperty`/`requestSideEffects`, `autoExpandSelect`, `$auto` batch groups, annotation-driven field control, FE building blocks, ISO-date assumptions, ETag/412-centric flows. Here, **V2 is the law**: `/Date(ms)/` values exist and the V2 type system handles them; `callFunction` drives every state change; `metadataLoaded()` / `attachMetadataFailed` are correct APIs, not mistakes.

---

## 1. Bootstrap & Local Dev

**Local development runs against the mockserver by default** (Onboarding §3.5 — deliberate inversion of the CDC rule). `npm start` boots `index.html`, which starts `localService/mockserver.js` before the ComponentContainer. UI5 1.108 loads from the public CDN for local dev:

```html
<script id="sap-ui-bootstrap"
    src="https://ui5.sap.com/1.108/resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon"
    data-sap-ui-libs="sap.m"
    data-sap-ui-async="true"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-oninit="module:zcsr/checklist/index"
    data-sap-ui-resourceroots='{"zcsr.checklist": "./"}'>
</script>
```

- Tooling-managed framework (exact patch pinning, offline dev) is the alternative — see the comment block in `ui5.yaml`; then the src becomes `resources/sap-ui-core.js`.
- **Mockserver rules:** simulate against `localService/metadata.xml`; `MockServer` does **not** auto-mock function imports — every one of the nine gets an explicit request handler that mutates mock data per the status transition matrix; `SubmitChecklist`'s handler runs the validation mirror and answers failures as one OData error with itemized `innererror/errordetails`, so the blocked-submit UX is fully testable locally.
- **Phase 7 (live DEV service):** add a ui5-tooling backend proxy for `/sap/opu/odata` to the FES host (ask the architect for host/client — never guess), add a toggle to skip `mockserver.init()`. Report live-vs-mock discrepancies; do not silently adapt (Onboarding §3.5).
- **Deployment:** `npm run build`, BSP upload via `/UI5/UI5_REPOSITORY_LOAD`, launchpad catalog/tile on-system. In production the FES serves UI5; the CDN bootstrap is local-dev only.

## 2. Manifest & Model (V2)

```json
"sap.app": { "dataSources": { "mainService": {
  "uri": "/sap/opu/odata/sap/ZCSR_CHECKLIST_SRV/",
  "type": "OData",
  "settings": { "odataVersion": "2.0", "localUri": "localService/metadata.xml" } } } },
"sap.ui5": { "models": { "": {
  "dataSource": "mainService", "preload": true,
  "settings": {
    "defaultBindingMode": "TwoWay",
    "defaultCountMode": "Inline",
    "refreshAfterChange": false,
    "useBatch": true } } } }
```

- One default model from the manifest; don't also create it in `Component.js`.
- `TwoWay` + `refreshAfterChange: false` is the autosave foundation: item edits accumulate as pending changes, a debounce flushes them, and bindings refresh **explicitly** after function imports.
- Guard first binds with `oModel.metadataLoaded().then(...)`; wire `attachMetadataFailed` centrally in `Component.js`.

## 3. Core V2 Patterns

### 3.1 Keys, element binding, reads
```javascript
var sPath = "/" + oModel.createKey("ChecklistHeaderSet", { HeaderGuid: sGuid });
oView.bindElement({ path: sPath, events: { change: this._onBindingChange.bind(this) } });
```
Never concatenate entity URLs by string (`createKey` handles `guid'...'` literals); never bypass the model with fetch/AJAX.

### 3.2 Function imports — the ONLY way state changes
```javascript
oModel.callFunction("/SubmitChecklist", {
    method: "POST",
    urlParameters: { HeaderGuid: sGuid },
    success: function (oData) { /* refresh header binding explicitly, lock form */ },
    error: this._handleBusinessError.bind(this)   // -> 3.4
});
```
All nine: `SubmitChecklist`, `StartReview`, `CompleteReview(Outcome, Notes)`, `ReassignChecklist(NewAnalyst)`, `GenerateInstances(Chktype, PeriodYear, PeriodQtr)`, `TriggerAiTriage`, `ExportEvidence` (GET → binary ZIP, trigger a browser download), `CopyCatalogVersion(SourceVersion)`, `ReleaseCatalogVersion(Version, ValidFrom)`. Never write `Status` (or catalog version `Status`) via property update; never simulate a function-import result client-side.

### 3.3 Autosave (ChecklistDetail)
`liveChange` → restartable 2 s timer → `oModel.submitChanges({ success, error })` (MERGE batch of `Response`/`NaFlag` only) → footer "Draft autosaved hh:mm:ss". Flush pending changes on route-leave and before Sign & Submit. `hasPendingChanges()` is the dirty check.

### 3.4 Business errors → itemized MessageManager mapping
`SubmitChecklist` fails with ONE response carrying every validation failure:
```javascript
_handleBusinessError: function (oError) {
    var oResp = JSON.parse(oError.responseText);
    var aDetails = (oResp.error.innererror && oResp.error.innererror.errordetails) || [];
    // one sap.ui.core.message.Message per detail; detail.target = QuestionId ->
    // resolve to the card's control, set ValueState.Error + text, then open
    // the MessagePopover from the footer. Fall back to oResp.error.message.value.
}
```
The V2 model also pushes parsed messages into `sap.ui.getCore().getMessageManager()` — prefer reading from there where it already has them; the explicit parse is the fallback for mapping targets to cards.

### 3.5 Dates
V2 serializes `Edm.DateTime` as `/Date(ms)/` — the model and `sap.ui.model.type.Date`/`DateTime` handle it. Bind with a type (`formatOptions: { style: 'medium', UTC: true }` for `display-format="Date"` fields like `DueDate`/`ValidFrom`). Do NOT hand-write `/Date(...)/` regexes in controllers, and do NOT delete them from mock data — they're the correct wire format here.

### 3.6 Attachments (media entity)
Upload via `sap.m.upload.UploadSet` bound to the item's `ToAttachments`: POST stream with slug `{HeaderGuid}/{QuestionId}/{Filename}` and the model's CSRF token (`oModel.getSecurityToken()`, refresh on 403). Download via `$value` — the backend sets `Content-Disposition` with the original filename; byte-identical round trip is a backend guarantee, not something the client re-implements. Delete = soft delete (standard DELETE; row survives for audit).

### 3.7 Review mode
One `ChecklistDetail` view serves edit and review: `{app>/mode}` drives `editable`/visibility via expression binding. Review footer = Complete Review / Return to Analyst (ReturnNotesDialog; notes mandatory client-side AND server-enforced — expect ZCSR 007 if bypassed).

## 4. CSR-Specific UI Patterns

### 4.1 Procedure cards (the core screen — full contract in ClaudeCode/claude.md §6)
One card per item with `Inptype === 'I'`, ordered `Seqnr`, grouped by `Section` (headers via `formatter.sectionText` — never the raw P/I code). Anatomy: title bar `"{Seqnr} · {Title}"` + completion indicator → requirement `sap.m.Text maxLines="3"` + "Show more" (QuestionText is 600–1,600 chars; never fully expanded by default) → collapsed Example panel only when `ExampleText` non-empty → growing TextArea (`.zcsrInput`) with N/A `Switch` rendered **only when `NaAllowed`** (on = field disabled, `NaFlag=true`, requirement satisfied) → `UploadSet` (`.zcsrAttach`) only when `AttachMode !== 'N'`, labeled "Optional Attachments" (O) / "Required evidence" (R).

### 4.2 Instructions panel
`Inptype === 'C'` rows render in a collapsed panel above the first card, auto-expanded on a checklist's first open. ⚠️ Open flag: whether the live `ToItems` actually returns `C` rows — see `NOTES.md`; if it doesn't, raise it (fallback design: read `QuestionSet` for the header's `CatalogVers`), don't improvise.

### 4.3 Worklist & cascading filters
Growing table (threshold 25), sorted by `DueDate`; LOB → Market Segment ComboBoxes cascade via `MarketSegVHSet`'s `Lob` property; whole-LOB CSR rows display Segment "All" (`MarketSeg === 'ALL'`). Status always `ObjectStatus` text + `formatter.statusState`.

### 4.4 Styling
Custom CSS is exactly three classes — `.zcsrInput` (green response), `.zcsrAttach` (yellow evidence), `.zcsrComment` (gray guidance) — mirroring the client's template color semantics. Restyle nothing else; color never carries meaning alone.

### 4.5 sap.ushell guard (kept from the CDC playbook — still right)
```javascript
var oUser;
try { var c = sap.ui.require("sap/ushell/Container");
      oUser = c && c.getUser && c.getUser(); } catch (e) { /* standalone */ }
if (!oUser) { oUser = { getId: function(){return "LOCAL_USER";}, getFullName: function(){return "Local User";} }; }
```
Standalone `ui5 serve` has no FLP; production runs inside the launchpad. Guard every ushell access. User identity is display-only — authorization is entirely server-side (`ZCSR_ASSIGN` + `Z_CSR_CHK`).

### 4.6 Busy/availability
Initialize the `app` JSON model with defaults before first data; clear busy from `metadataLoaded()`/`attachMetadataFailed` and request handlers — on V2 these APIs exist and are the right ones (the CDC playbook's warning against them applies to V4 only).

### 4.7 Catalog app specifics (zcsr.catalog)
FlexibleColumnLayout; `Section`/`Inptype` derived from the active IconTabBar tab on create — never rendered as inputs; `QuestionId` read from the create response, never constructed client-side; writes only where `Editable === true`; explicit Save + dirty-guard (no autosave); reorder = two immediate Seqnr MERGEs. Full contract: `ClaudeCode/CLAUDE-catalog.md`.

## 5. Troubleshooting (V2 / CSR)

| Symptom | Likely cause | Fix |
|---|---|---|
| Empty worklist, no error | **Row-level `ZCSR_ASSIGN` scope** — user has no valid assignment for the scope/period | Check assignments (SM30) / test user, not the query |
| 403 on a function import | `Z_CSR_CHK` authorization (ACTVT 70 for catalog writes) | PFCG role, not client code |
| Status doesn't change / 405 | Tried a property update on `Status` or `CatalogVersion` | Use the function import (3.2) — status never changes via MERGE |
| Edits never reach the server | Pending changes not flushed | `submitChanges()` from the debounce; check `hasPendingChanges()` |
| Stale header after submit/review | `refreshAfterChange` is false by design | Refresh the element/list binding explicitly in the FI success handler |
| Submit error shows only one message | Read only `error.message` | Parse `innererror/errordetails` and map each `target` QuestionId (3.4) |
| Dates show off-by-one | Missing `UTC: true` on a `display-format="Date"` field | Bind with `sap.ui.model.type.Date`, `formatOptions.UTC: true` |
| Function import 404 on mockserver | MockServer doesn't auto-mock FIs | Add/fix the explicit request handler in `mockserver.js` |
| Upload 403 | CSRF token stale | `refreshSecurityToken()` / let UploadSet use the model's token; verify slug format |
| Download corrupt or renamed | Client transformed the stream | Use `$value` URL directly; filename comes from `Content-Disposition` |
| Instructions panel empty against live service | `ToItems` may not include `Inptype 'C'` rows (open flag) | STOP and raise per `NOTES.md` — don't work around silently |
| `metadataLoaded is not a function` | You're on a V4 model — wrong playbook | This project is V2; re-read the banned list at the top |
| Table in hidden container empty | Binding suspended while invisible | Bind/resume after visibility flips (legacy lesson, still true) |

## 6. Agent Workflow

1. Read Onboarding + this playbook + `NOTES.md` + the governing prompt for your assignment + the view/controller you're touching + the relevant spec section in `design/`.
2. Confirm which build phase the task belongs to (`ClaudeCode/PROMPT-build-frontend.md`); don't build ahead of phase without approval.
3. Implement the smallest change; run against the mockserver; console clean; checklist from Onboarding §6.
4. Update affected docs + `NOTES.md`. State what changed, why, and anything needing on-system action.

## 7. Current Focus (2026-10-26)

Backend complete; service live on DEV. **Frontend Phase 0 starts now**: booting `zcsr.checklist` shell + mockserver (the verified starter zip is the shortcut), then Worklist → procedure cards → Sign & Submit → review → admin → tests → Phase 7 live smoke test, each gated per `ClaudeCode/PROMPT-build-frontend.md`. Before Phase 2, read the `ToItems` flag in `NOTES.md`; before Phase 7, ask the architect for the DEV host/client for the proxy.
