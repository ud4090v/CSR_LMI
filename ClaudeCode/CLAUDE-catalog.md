# CLAUDE.md — CSR Checklist Catalog (Companion Maintenance App)

You are developing **`zcsr.catalog`**: an admin-only freestyle SAPUI5 app for maintaining
the CSR checklist question catalog — Questions (Section `P`) and Instructions / Notes
texts (Section `I`) — per checklist type, across immutably-versioned catalog snapshots.
It shares the OData service of the main CSR Auditing Application but is a separate app
with its own BSP and launchpad tile. This file governs every session in this repository.
Where it conflicts with your general knowledge, **this file wins**.

Reference design: `CSR_Catalog_App_Design.docx`. Service contract:
`webapp/localService/metadata.xml` — **read-only source of truth**; never invent
properties it lacks. If a task appears to need a contract change, stop and raise it.

## Prime directive: never fabricate APIs

Before writing any call against an API you are not 100% certain of — SAPUI5 controls,
methods, or settings; OData V2 model methods; ABAP classes — **verify against live
documentation first** (ui5.sap.com API reference for the 1.108 release, SAP Help). If you
cannot verify, say so and propose a verified alternative. Never invent OData properties,
UI5 APIs, ABAP objects, or SAP notes. State uncertainty explicitly; never paper over it
with plausible-looking code.

## 1. Hard platform constraints — never violate

| Layer | Constraint |
|---|---|
| Frontend | **Freestyle SAPUI5 1.108** (FES 2022), XML views, plain JS (`sap.ui.define` AMD) |
| Service | SAP Gateway **OData V2**, service `ZCSR_CHECKLIST_SRV` (shared with main app) |
| Backend | Classic ABAP OO on ECC8 — relevant only for reference snippets |
| Access | Admin role only (backend `Z_CSR_CHK` ACTVT 70 is authoritative; UI gating is convenience) |

**Forbidden:** OData V4 (`sap.ui.model.odata.v4.*`), Fiori Elements / `sap.fe.*`, RAP/CDS,
BTP/CAP, TypeScript, `localStorage`/`sessionStorage`/IndexedDB, any UI5 API newer than
1.108 (check "Since" in the API reference).

## 2. Commands

```bash
npm install
npx ui5 serve          # dev server + mockserver
npm run lint
npm test               # QUnit
npm run opa            # OPA5 journeys
```

After ANY code change: lint + affected tests before done. Missing scripts = repo setup
work; ask before changing tooling choices.

## 3. Repository layout

```
webapp/
  manifest.json
  Component.js               # admin-role check, central error handler
  index.html
  view/App.view.xml          # hosts sap.f.FlexibleColumnLayout
  view/CatalogList.view.xml        + controller/CatalogList.controller.js    # begin column
  view/RowEditor.view.xml          + controller/RowEditor.controller.js      # mid column
  view/NotFound.view.xml
  fragment/{ConfirmDelete,ReleaseVersion,DirtyGuard}.fragment.xml
  model/formatter.js         # copied from main app + catalog additions (keep in sync)
  css/style.css              # .zcsrInput .zcsrAttach .zcsrComment (preview only)
  i18n/i18n.properties       # ALL user-facing text
  localService/metadata.xml  # shared service contract (copy)
  localService/mockserver.js
  localService/mockdata/*.json
```

## 4. Data contract (subset used by this app)

The service also contains checklist-instance entities (`ChecklistHeaderSet`, etc.) —
**this app never touches them.** It uses:

**`QuestionSet`** (keys `QuestionId`, `Version`) — full CRUD. Properties:
`Chktype` (`CSRM`|`CSRL`|`QCLM`|`QCLL`), `Section` (`P`|`I`), `Seqnr`, `Title` (60),
`QuestionText`, `ExampleText`, `Inptype` (`I`|`C`), `RespRequired`, `AttachMode`
(`N`|`O`|`R`), `NaAllowed`, `Editable` (server-computed, read-only), `ValidFrom`.
Create-only (immutable after create): `QuestionId`, `Version`, `Chktype`, `Section`,
`Inptype`.

**`CatalogVersionSet`** (key `Version`) — read-only: `Status` (`D` Draft | `R` Released),
`StatusText`, `ValidFrom`, `CreatedBy`, `CreatedAt`. Written only via function imports.

**Function imports** (POST):
- `CopyCatalogVersion(SourceVersion)` → new Draft version, deep copy of all rows of ALL
  checklist types
- `ReleaseCatalogVersion(Version, ValidFrom)` → `D`→`R`, one-way, locks all rows

**Hard rules:**
- Writes succeed only where `Editable === true` (Draft version, unbound). The server
  rejects everything else; the UI must render read-only rather than rely on the rejection.
- `QuestionId` is **generated server-side on create** (`<CHKTYPE>-Pnn` / `-Nnn`). Read it
  from the create response; never construct one client-side.
- `Section` and `Inptype` are **derived from the active tab on create** — Questions tab →
  `Section='P'`, `Inptype='I'`; Instructions tab → `Section='I'`, `Inptype='C'`. Never
  render a Section or Inptype input control.
- Version status changes ONLY via the two function imports — never via property update.

## 5. Layout & routing

`sap.f.FlexibleColumnLayout`:

| Route | Pattern | Layout |
|---|---|---|
| `catalog` | `{chktype}/{version}` | OneColumn (list) |
| `catalogEdit` | `{chktype}/{version}/row/{questionId}` | TwoColumnsMidExpanded (list + editor) |
| `notFound` | `:all*:` | — |

Chktype and version live in the hash — deep-linkable, refresh-safe. Defaults: first
checklist type, latest version. Tab selection (Questions vs Instructions) is UI state,
not a route segment; switching tabs closes the editor if the open row belongs to the
other section (dirty-guard first).

## 6. CatalogList (begin column)

- Header: Checklist Type `sap.m.Select` (4 fixed types) + Version `sap.m.Select` bound to
  `CatalogVersionSet` with status shown as `sap.m.ObjectStatus` (Draft→Warning,
  Released→Success). Overflow menu: "Copy to New Version", "Release Version…".
- `sap.m.IconTabBar`, two filters with live counts: **Questions — P** and
  **Instructions / Notes — I**. List binding filter: `Chktype` + `Version` + `Section`;
  sorter `Seqnr`.
- Questions tab columns: Seq, ID, Title, Resp (✓), Att (N/O/R), N/A (✓), reorder ↑↓.
  Instructions tab columns: Seq, Title, first-line preview, reorder ↑↓ — behavior flags
  are **not shown** (they don't apply).
- Reorder ↑↓: swap `Seqnr` with the neighbor, two MERGEs submitted immediately, no editor
  round trip. Disabled when version Released.
- Add: creates in the active tab's section (see §4), then navigates to `catalogEdit` for
  the returned `QuestionId`. Delete: confirm dialog; Draft versions only.
- Footer actions and reorder disabled entirely when the selected version is Released.

## 7. RowEditor (mid column)

- **Section P editor**: Title (`sap.m.Input`, maxLength 60), Requirement Text (growing
  `sap.m.TextArea` + live char counter, soft warning > 2,000 chars), Worked Example
  (growing `sap.m.TextArea`, optional), Behavior panel: Response required (`Switch`),
  Attachment mode (`Select` N/O/R), N/A allowed (`Switch`).
- **Section I editor**: Title (optional) + Text only. The Behavior panel is **absent,
  not disabled**.
- **Live preview panel**: render the row exactly as the analyst's procedure card shows
  it — collapsed 3-line requirement with "Show more", Example panel only when
  `ExampleText` non-empty — using the same formatters/CSS as the main app.
- **Explicit Save** (validate first) / Discard; NO autosave. Dirty-guard on navigation,
  tab switch, and version/type change ("Unsaved changes — discard?").
- Released version: entire editor read-only + `sap.m.MessageStrip` (information):
  "Released — copy to a new version to change the catalog."

## 8. Validation (client mirror; server authoritative)

Save blocks when: Section P without Title; Requirement/Text empty; AttachMode outside
N/O/R. Release (`ReleaseCatalogVersion`) additionally requires ≥1 Section P row per
active checklist type — surface the server's itemized message-container errors via
`MessageManager`, mapped to controls where possible. Never simulate function-import
results.

## 9. Formatters & conventions

- `formatter.sectionText`: P→i18n `sectionProcedures`, I→i18n `sectionInstructions` —
  raw codes never displayed.
- `formatter.versionState`: D→Warning, R→Success. Status always text + semantic state,
  never color alone.
- All strings in i18n from day one. Keyboard accessible. `growing` lists unnecessary
  (small row counts) but bindings stay server-filtered.

## 10. Local dev & testing

- MockServer against `localService/metadata.xml`; mock data: versions `0001` (Released,
  ValidFrom 2026-01-01) and `0002` (Draft); catalog rows for CSRL (4 P + instruction I
  rows) and QCLL (3 P + I rows) mirroring the seeded client templates.
- Mock the function imports explicitly (MockServer does not auto-mock them):
  `CopyCatalogVersion` clones rows to a new Draft version; `ReleaseCatalogVersion` flips
  status and recomputes `Editable=false` on its rows; QuestionSet create assigns the next
  free ID server-style.
- QUnit: formatters, validation mirror, ID-from-response handling. OPA5 journeys:
  add + edit + save a question; add an instruction text; blocked edit on Released
  version; copy → edit → release flow; dirty-guard on tab switch.
- Definition of done: works against mockserver, zero console errors, all strings in
  i18n, keyboard accessible, no APIs outside verified UI5 1.108.

## 11. Workflow

1. Plan before editing on multi-file tasks; confirm anything architectural.
2. Small, reviewable increments; prefer editing existing files.
3. Verify: lint + tests + boot `ui5 serve` and check the affected screen renders clean.
4. If requirements are ambiguous or conflict with `metadata.xml`, ask — do not guess.
