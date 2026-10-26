# Claude Code Build Prompts — CSR Auditing Application Frontend (VS Code)

How to use: put `CLAUDE.md` at the repo root, open the folder in VS Code, start
Claude Code (`claude` in the integrated terminal). `CLAUDE.md` loads
automatically and governs every session — these prompts only tell it **what to
build next**; the rules live in CLAUDE.md. Paste one phase at a time, review
the result, commit, then move on. Each phase ends with its own verification
gate, so never accept "done" without it.

Prerequisite in the repo root: `ZCSR_CHECKLIST_SRV_metadata.xml` (copied to
`webapp/localService/metadata.xml` in Phase 0) and the two seed workbooks
(`ZCSR_QCATALOG_seed_v0001.xlsx`, `ZCSR_value_tables_seed.xlsx`).

---

## Phase 0 — Repo setup & booting shell

```
Set up the zcsr.checklist repository per CLAUDE.md §2–§3 so the app boots
against a mockserver.

If zcsr-checklist-starter.zip is present in the repo, unzip it here, run
npm install and npm start, and verify instead of scaffolding from scratch.
Otherwise create: package.json (scripts exactly as CLAUDE.md §2), ui5.yaml,
eslint config, webapp/index.html + index.js (UI5 1.108 bootstrap, sap_horizon,
mockserver started for local dev), manifest.json with the mainService
dataSource (/sap/opu/odata/sap/ZCSR_CHECKLIST_SRV/, localUri
localService/metadata.xml, defaultBindingMode TwoWay, refreshAfterChange
false) and ALL SIX routes from CLAUDE.md §5, Component.js (device + app-state
models, router init, central metadataFailed handler), empty-but-routable stub
views for Worklist / ChecklistDetail / ReviewQueue / AdminBoard / NotFound,
model/formatter.js (statusState, severityState, sectionText per CLAUDE.md §8),
model/roles.js (?role URL param stub, default AD, documented as UI convenience
only), css/style.css with ONLY the three .zcsr* classes, i18n/i18n.properties.

Copy ZCSR_CHECKLIST_SRV_metadata.xml to webapp/localService/metadata.xml and
treat it as read-only. Build localService/mockserver.js against it and
generate mockdata JSONs from the two seed workbooks (versions 0001 Released +
0002 Draft; 6–8 demo ChecklistHeaderSet instances covering every status
NS/IP/SB/UR/RT/CP with items carrying the denormalized catalog fields; VH sets
from the value-table workbook). Mock ALL NINE function imports explicitly —
MockServer does not auto-mock them — mutating mock data per the status
transition matrix; SubmitChecklist must run the §7 validation mirror and
answer failures as one OData error with itemized innererror/errordetails.

Verify: npm run lint clean; npm start boots; Worklist route renders with zero
console errors; navigating to an unknown hash lands on NotFound. Show me the
file tree and the boot result before finishing.
```

## Phase 1 — Worklist

```
Build the Worklist per CLAUDE.md §5 and §8. Growing table (threshold 25) over
ChecklistHeaderSet sorted by DueDate: Type, LOB, Segment ('ALL' displayed as
"All"), Period, Analyst, Due, Progress %, AI flags, Status as ObjectStatus
(text + formatter.statusState — never color alone). Filter bar: cascading
LOB → Market Segment ComboBoxes using MarketSegVHSet filtered by its Lob
property. Row press navigates to the detail route. Review Queue / Admin
buttons visible per role (RV/AD, AD). All strings in i18n.

Verify: lint clean, app boots, filters cascade correctly (selecting a LOB
restricts segments and the table), clearing filters restores the full list,
zero console errors.
```

## Phase 2 — ChecklistDetail: procedure cards (core screen)

```
Build the ChecklistDetail procedure cards exactly per CLAUDE.md §6. One card
per ChecklistItem with Inptype 'I', ordered by Seqnr, grouped by Section
(headers via formatter.sectionText, never the raw code). Inptype 'C' rows
render inside a collapsed Instructions panel above the first card,
auto-expanded on a checklist's first open. Card anatomy top to bottom:
1) title bar "{Seqnr} · {Title}" + completion indicator (answered/open/N/A);
2) requirement sap.m.Text maxLines=3 with a "Show more" toggle; 3) collapsed
Example panel only when ExampleText is non-empty; 4) growing TextArea with
class zcsrInput, N/A Switch rendered ONLY when NaAllowed (on = TextArea
disabled, NaFlag=true); 5) attachments only when AttachMode !== 'N':
sap.m.upload.UploadSet bound to the item's ToAttachments, class zcsrAttach,
label "Optional Attachments" (O) / "Required evidence" (R).

Autosave: liveChange → 2 s debounce → submitChanges() MERGE batch; flush on
route-leave; footer shows "Draft autosaved hh:mm:ss". refreshAfterChange stays
false; refresh bindings explicitly after any function import. Deep-link guard
in onPatternMatched: unknown/unauthorized GUIDs route to NotFound.

Verify against the mockserver: lint clean; typing in a response autosaves
after 2 s (watch the MERGE in the network tab); N/A switch appears only on
NaAllowed items and disables the field; Instructions panel auto-expands on
first open only; zero console errors.
```

## Phase 3 — Sign & Submit + itemized errors

```
Implement Sign & Submit per CLAUDE.md §6–§7. Button label from i18n
btnSignSubmit. Flush pending autosave, then call the SubmitChecklist function
import — never simulate its result and never write Status from the client. On
business error, push the V2 error container details (innererror/errordetails)
into MessageManager, map each failing QuestionId to its control
(ValueState.Error + text), and open the MessagePopover from the footer. On
success: refresh the header binding, lock the form, MessageToast.

Verify: with the mock NS/IP checklist missing required responses, Submit shows
the popover listing EVERY failure and marks each offending card; filling them
(or valid N/A) then submitting flips status to Submitted, stamps SignedBy/At,
and locks the form. Lint clean, zero console errors.
```

## Phase 4 — Review mode + ReviewQueue

```
Build review per CLAUDE.md §5–§6. ReviewQueue: SB/UR checklists sorted by
AiFlagCount descending; Start Review calls the function import then navigates
to detailReview. ChecklistDetail in review mode ({app>/mode}): form fully
read-only via expression binding, AI-flag panel expanded (ToAiFlags, severity
via formatter.severityState), footer = Complete Review / Return to Analyst.
Return opens ReturnNotesDialog (fragment) with a mandatory TextArea — client
check AND rely on the server's 007 error. When Status=RT in edit mode, show a
MessageStrip with the latest review note so the analyst sees why it came back.

Verify: full mock round trip — Start Review (SB→UR), Return with empty notes
is blocked, Return with notes flips to RT and the analyst view shows the
banner, Complete Review flips to CP and the form stays locked. Lint clean,
zero console errors.
```

## Phase 5 — AdminBoard

```
Build the AdminBoard (role AD) per CLAUDE.md §5: status overview of all
instances for a selected period (counts by status, text + semantic state),
ReassignDialog calling ReassignChecklist, and a GenerateInstances action
(Chktype + Year + Quarter) that calls the function import and refreshes.
UI gating by role stays convenience-only — no client-side authorization logic
beyond visibility.

Verify: reassign updates the analyst in the worklist; GenerateInstances
returns and the board refreshes. Lint clean, zero console errors.
```

## Phase 6 — Tests

```
Replace the npm test / npm run opa placeholders per CLAUDE.md §10. QUnit:
formatter.js (every status/severity/section mapping) and the validation
mirror (RespRequired × NaAllowed × NaFlag × response, AttachMode R with 0 vs
≥1 attachments). OPA5 journeys against the mockserver: analyst happy path
(fill → Sign & Submit), blocked submit with itemized errors, N/A flow,
reviewer return flow. Wire them into npm test and npm run opa so both exit 0.

Verify: both commands green, lint clean.
```

## Phase 7 — Live service smoke test

```
The backend ZCSR_CHECKLIST_SRV is live. Add a ui5.yaml proxy for
/sap/opu/odata to the FES host (I will provide host/client — ask, do not
guess) and an index toggle to skip mockserver.init(). Smoke-test against the
live service and report discrepancies WITHOUT fixing silently, especially:
(1) whether ToItems returns Inptype 'C' instruction rows or only 'I' — if only
'I', propose the §6 Instructions panel reading QuestionSet instead and wait
for my decision; (2) field formats (dates, guids) versus the mock; (3) the
real error container shape from SubmitChecklist. metadata.xml stays read-only
— if the live metadata differs from the repo copy, stop and raise it.
```

---

## Companion app kickoff (separate repo/folder, after Phase 7)

Place `CLAUDE-catalog.md` as that folder's `CLAUDE.md`, then:

```
Set up zcsr.catalog per CLAUDE.md §2–§3 (own ui5.yaml, FlexibleColumnLayout
shell, mockserver with versions 0001 Released + 0002 Draft and the
CopyCatalogVersion / ReleaseCatalogVersion mocks), then build in this order,
verifying each step like the main app: 1) CatalogList with the two-filter
IconTabBar (Questions — P / Instructions — I, live counts) + version Select
with Draft/Released pill; 2) RowEditor per section (P = full editor with
Behavior panel; I = Title + Text only, panel absent) with explicit Save,
dirty-guard, and live preview reusing the main app's formatters; 3) Add
(Section/Inptype derived from the active tab, QuestionId read from the create
response — never constructed client-side), Delete (Draft only), reorder via
two immediate Seqnr MERGEs; 4) Copy to New Version and Release Version flows;
read-only rendering + MessageStrip when the version is Released.
```
