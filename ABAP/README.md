# abap/ — CSR Auditing Application reference sources

Review copies for SE80/ADT. These implement the components specified in
`CSR_Technical_Specification.docx` v0.3 §7. Classic ABAP OO, NW 7.50 syntax
(inline declarations, string templates, `VALUE`/`COND`) — valid on ECC8.

## 1. Files → repository objects

| File | Object | Type |
|---|---|---|
| `zcx_csr.abap` | `ZCX_CSR` | Exception class (message class ZCSR) |
| `zif_csr_attach_store.abap` | `ZIF_CSR_ATTACH_STORE`, `ZCL_CSR_ATTACH_DB`, `ZCL_CSR_ATTACH_AL` | Interface + 2 implementations |
| `zcl_csr_model.abap` | `ZCL_CSR_MODEL` | Persistence facade, transition matrix, locks |
| `zcl_csr_validation.abap` | `ZCL_CSR_VALIDATION` | Submission validation (full failure list) |
| `zcl_csr_catalog.abap` | `ZCL_CSR_CATALOG` | Catalog CRUD + versioning (companion app) |
| `zcl_csr_ai_client.abap` | `ZCL_CSR_AI_CLIENT` | LLM triage via SM59 `ZCSR_LLM` |
| `zcl_csr_notify.abap` | `ZCL_CSR_NOTIFY` | BCS reminder/escalation mails |
| `zcl_zcsr_checklist_dpc_ext.abap` | `ZCL_ZCSR_CHECKLIST_DPC_EXT` | Gateway DPC extension |
| `zcsr_reminder_job.abap` | `ZCSR_REMINDER_JOB` | Report, SM36 daily |
| `zcsr_ai_triage_job.abap` | `ZCSR_AI_TRIAGE_JOB` | Report, optional schedule |

Activation order: `ZCX_CSR` → attach interface/classes → `ZCL_CSR_VALIDATION` →
`ZCL_CSR_MODEL` → `ZCL_CSR_CATALOG` → `ZCL_CSR_AI_CLIENT` → `ZCL_CSR_NOTIFY` →
DPC_EXT (after SEGW generation) → reports. DDIC (Tech Spec §2–3) must exist first.

## 2. Deliberate open ends (do not "fix" silently)

- **`ZCL_CSR_MODEL->WRITE_CHANGE_DOCUMENT`** is a documented no-op until the
  SCDO object `ZCSR` is generated (build step 2). The generated update FM
  `ZCSR_WRITE_DOCUMENT` has per-table X/Y parameters whose exact names come
  from generation — wire them then. A representative call is in the method body.
- **`ZCL_CSR_ATTACH_AL`** is a skeleton by design: concrete ArchiveLink calls
  depend on OAC0/OAC2/OAC3 customizing that does not exist yet (feasibility
  pending). It raises immediately so accidental use is loud, not silent.
- **DPC method names** (`checklistheade_get_entityset` etc.) follow SEGW's
  truncation; align with what the generator produced in your system.
- **`checklistheade_get_entityset`** shows the row-level security join; add
  `$top`/`$skip` handling from `io_tech_request_context` per the comment.
- **`ExportEvidence`** bundles responses + attachments; the change-document
  history joins the ZIP once SCDO exists; the responses PDF (Smart Forms /
  Adobe) replaces `responses.txt` in production.

## 3. Message class ZCSR (SE91) — create before activating ZCX_CSR

| # | Text |
|---|---|
| 001 | Checklist &1 not found |
| 002 | Status change &1 -> &2 is not allowed |
| 003 | Response required for procedure &1 |
| 004 | Required evidence missing for procedure &1 |
| 005 | Not authorized for this operation |
| 006 | Checklist is currently being edited by &1 |
| 007 | Review notes are mandatory when returning a checklist |
| 008 | Catalog version &1 is not editable |
| 009 | Catalog row &1 / version &2 not found |
| 010 | Catalog version &1 not found |
| 011 | Catalog version &1 is already released |
| 012 | Release requires at least one procedure for checklist type &1 |
| 013 | Attachment &1 not found |
| 014 | Invalid attachment mode &1 |
| 015 | Valid-from date is required for release |

## 4. Non-code prerequisites

- Lock object `EZCSR_HEADER` (E_TABLE, mode E, arg HEADER_GUID) — generates
  `ENQUEUE_/DEQUEUE_EZCSR_HEADER` used by `ZCL_CSR_MODEL`.
- SM59 destination `ZCSR_LLM` (type G) to the in-house LLM platform; TLS cert
  in STRUST if HTTPS. Auth header, if any, configured on the destination.
- TVARVC parameter `ZCSR_FLP_URL` (launchpad base URL for e-mail deep links).
- SCOT/SOST operational for BCS mail.
- Authorization object `Z_CSR_CHK` (ACTVT, ZCHKTYPE, ZMSEG, ZLOB) + PFCG roles.

## 5. Verified-API notes (per project prime directive)

Standard APIs used and their contracts, verified against SAP documentation
conventions: `CL_SYSTEM_UUID=>CREATE_UUID_X16_STATIC` (raises `CX_UUID_ERROR`),
`CL_ABAP_MESSAGE_DIGEST=>CALCULATE_HASH_FOR_RAW` (SHA256 via `IF_ALGORITHM`),
`CL_HTTP_CLIENT=>CREATE_BY_DESTINATION` + `IF_HTTP_CLIENT` send/receive,
`/UI2/CL_JSON` serialize/deserialize, `CL_BCS` / `CL_DOCUMENT_BCS` /
`CL_CAM_ADDRESS_BCS` / `CL_BCS_CONVERT=>STRING_TO_SOLI`, `CL_ABAP_ZIP`,
`CL_ABAP_CODEPAGE=>CONVERT_TO`, `BAPI_USER_GET_DETAIL`.

Gateway error contract: business errors raise **`/IWBEP/CX_MGW_BUSI_EXCEPTION`**
with the message container from `mo_context->get_message_container( )`.
(Earlier document drafts named `/IWBEP/CX_MPC_BUSI_EXCEPTION` — that class does
not exist; corrected in Tech Spec v0.3, CLAUDE.md, and copilot-instructions.)

Anything ambiguous (generated FM signatures, SEGW method names, ArchiveLink
FMs) is marked TODO in-source rather than guessed.
