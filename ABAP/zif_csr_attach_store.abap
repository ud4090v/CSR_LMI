*&---------------------------------------------------------------------*
*& ZIF_CSR_ATTACH_STORE — storage abstraction for checklist evidence
*& Prototype impl: ZCL_CSR_ATTACH_DB (XSTRING in ZCSR_ATTACH).
*& Production candidate: ZCL_CSR_ATTACH_AL (ArchiveLink) — same interface,
*& swap point, no caller changes.
*&---------------------------------------------------------------------*
INTERFACE zif_csr_attach_store PUBLIC.

  METHODS save
    IMPORTING
      iv_header_guid   TYPE sysuuid_x16
      iv_question_id   TYPE char10
      iv_filename      TYPE char255
      iv_mimetype      TYPE char128
      iv_content       TYPE xstring
    RETURNING VALUE(rs_attach) TYPE zcsr_attach
    RAISING   zcx_csr.

  METHODS read
    IMPORTING
      iv_attach_guid TYPE sysuuid_x16
    EXPORTING
      es_meta        TYPE zcsr_attach   " CONTENT cleared
      ev_content     TYPE xstring
    RAISING zcx_csr.

  METHODS soft_delete
    IMPORTING
      iv_attach_guid TYPE sysuuid_x16
    RAISING zcx_csr.

  METHODS list
    IMPORTING
      iv_header_guid  TYPE sysuuid_x16
      iv_question_id  TYPE char10 OPTIONAL
      iv_with_deleted TYPE abap_bool DEFAULT abap_false
    RETURNING VALUE(rt_attach) TYPE STANDARD TABLE OF zcsr_attach WITH DEFAULT KEY " metadata only
    RAISING zcx_csr.

ENDINTERFACE.


*&---------------------------------------------------------------------*
*& ZCL_CSR_ATTACH_DB — prototype implementation (Z-table, XSTRING)
*& Bytes stored DIRECTLY in ZCSR_ATTACH-CONTENT (no EXPORT TO DATA
*& BUFFER) so the download round trip is byte-identical. SHA-256 is
*& computed here, server-side, on every save.
*&---------------------------------------------------------------------*
CLASS zcl_csr_attach_db DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES zif_csr_attach_store.
ENDCLASS.


CLASS zcl_csr_attach_db IMPLEMENTATION.

  METHOD zif_csr_attach_store~save.
    DATA lv_hash TYPE string.

    " Tamper-evidence hash — audit-relevant, never trusted from client
    cl_abap_message_digest=>calculate_hash_for_raw(
      EXPORTING if_algorithm  = 'SHA256'
                if_data       = iv_content
      IMPORTING ef_hashstring = lv_hash ).

    TRY.
        rs_attach-attach_guid = cl_system_uuid=>create_uuid_x16_static( ).
      CATCH cx_uuid_error.
        RAISE EXCEPTION TYPE zcx_csr
          EXPORTING textid = zcx_csr=>attachment_not_found.
    ENDTRY.

    rs_attach-header_guid = iv_header_guid.
    rs_attach-question_id = iv_question_id.
    rs_attach-filename    = iv_filename.
    rs_attach-mimetype    = iv_mimetype.
    rs_attach-filesize    = xstrlen( iv_content ).
    rs_attach-sha256      = lv_hash.
    rs_attach-content     = iv_content.
    rs_attach-uploaded_by = sy-uname.
    GET TIME STAMP FIELD rs_attach-uploaded_at.
    rs_attach-deleted     = abap_false.

    INSERT zcsr_attach FROM rs_attach.
    " Change document (metadata only — CONTENT excluded from SCDO capture)
    " is written by ZCL_CSR_MODEL->write_change_document( ) in the same LUW.

    CLEAR rs_attach-content.            " callers get metadata; stream via READ
  ENDMETHOD.

  METHOD zif_csr_attach_store~read.
    SELECT SINGLE * FROM zcsr_attach
      INTO @DATA(ls_attach)
      WHERE attach_guid = @iv_attach_guid
        AND deleted     = @abap_false.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>attachment_not_found
                  msgv1  = |{ iv_attach_guid }|.
    ENDIF.
    ev_content = ls_attach-content.
    CLEAR ls_attach-content.
    es_meta = ls_attach.
  ENDMETHOD.

  METHOD zif_csr_attach_store~soft_delete.
    " Row is retained — evidence history stays reconstructable for audit.
    UPDATE zcsr_attach SET deleted = @abap_true
      WHERE attach_guid = @iv_attach_guid.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>attachment_not_found
                  msgv1  = |{ iv_attach_guid }|.
    ENDIF.
  ENDMETHOD.

  METHOD zif_csr_attach_store~list.
    IF iv_question_id IS SUPPLIED AND iv_question_id IS NOT INITIAL.
      SELECT attach_guid header_guid question_id filename mimetype
             filesize sha256 uploaded_by uploaded_at deleted
        FROM zcsr_attach
        INTO CORRESPONDING FIELDS OF TABLE rt_attach
        WHERE header_guid = iv_header_guid
          AND question_id = iv_question_id.
    ELSE.
      SELECT attach_guid header_guid question_id filename mimetype
             filesize sha256 uploaded_by uploaded_at deleted
        FROM zcsr_attach
        INTO CORRESPONDING FIELDS OF TABLE rt_attach
        WHERE header_guid = iv_header_guid.
    ENDIF.
    IF iv_with_deleted = abap_false.
      DELETE rt_attach WHERE deleted = abap_true.
    ENDIF.
  ENDMETHOD.

ENDCLASS.


*&---------------------------------------------------------------------*
*& ZCL_CSR_ATTACH_AL — ArchiveLink implementation (PRODUCTION CANDIDATE)
*& Skeleton only: pending the ArchiveLink feasibility confirmation.
*& NOTE: the concrete ArchiveLink/CMS API calls (object type, document
*& class, SCMS/ARCHIV function modules) depend on the repository
*& customizing chosen in OAC0/OAC2/OAC3 — they are deliberately NOT
*& implemented here to avoid coding against unverified customizing.
*&---------------------------------------------------------------------*
CLASS zcl_csr_attach_al DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES zif_csr_attach_store.
ENDCLASS.

CLASS zcl_csr_attach_al IMPLEMENTATION.
  METHOD zif_csr_attach_store~save.
    " TODO(prod): store via ArchiveLink into the customized content
    " repository; keep ZCSR_ATTACH row as metadata + SHA-256 + ArchiveLink
    " document ID (add column ARC_DOC_ID), CONTENT left empty.
    RAISE EXCEPTION TYPE zcx_csr EXPORTING textid = zcx_csr=>not_authorized.
  ENDMETHOD.
  METHOD zif_csr_attach_store~read.
    RAISE EXCEPTION TYPE zcx_csr EXPORTING textid = zcx_csr=>not_authorized.
  ENDMETHOD.
  METHOD zif_csr_attach_store~soft_delete.
    RAISE EXCEPTION TYPE zcx_csr EXPORTING textid = zcx_csr=>not_authorized.
  ENDMETHOD.
  METHOD zif_csr_attach_store~list.
    RAISE EXCEPTION TYPE zcx_csr EXPORTING textid = zcx_csr=>not_authorized.
  ENDMETHOD.
ENDCLASS.
