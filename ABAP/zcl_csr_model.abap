*&---------------------------------------------------------------------*
*& ZCL_CSR_MODEL — persistence facade
*& CRUD on ZCSR_* tables, status-transition matrix, lock handling,
*& change-document calls. Single commit point: the DPC calls exactly one
*& public method per request; COMMIT WORK happens in the Gateway
*& framework after the method returns cleanly.
*&---------------------------------------------------------------------*
CLASS zcl_csr_model DEFINITION PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES: ty_t_items   TYPE STANDARD TABLE OF zcsr_item    WITH DEFAULT KEY,
           ty_t_headers TYPE STANDARD TABLE OF zcsr_header  WITH DEFAULT KEY.

    CONSTANTS:
      c_status_not_started  TYPE zcsr_status VALUE 'NS',
      c_status_in_progress  TYPE zcsr_status VALUE 'IP',
      c_status_submitted    TYPE zcsr_status VALUE 'SB',
      c_status_under_review TYPE zcsr_status VALUE 'UR',
      c_status_returned     TYPE zcsr_status VALUE 'RT',
      c_status_completed    TYPE zcsr_status VALUE 'CP'.

    METHODS constructor.

    METHODS get_header
      IMPORTING iv_header_guid   TYPE sysuuid_x16
      RETURNING VALUE(rs_header) TYPE zcsr_header
      RAISING   zcx_csr.

    METHODS get_items
      IMPORTING iv_header_guid  TYPE sysuuid_x16
      RETURNING VALUE(rt_items) TYPE ty_t_items.

    METHODS update_item
      IMPORTING iv_header_guid TYPE sysuuid_x16
                iv_question_id TYPE char10
                iv_response    TYPE string
                iv_na_flag     TYPE abap_bool
      RAISING   zcx_csr.

    METHODS submit_checklist
      IMPORTING iv_header_guid   TYPE sysuuid_x16
      RETURNING VALUE(rs_header) TYPE zcsr_header
      RAISING   zcx_csr.

    METHODS start_review
      IMPORTING iv_header_guid   TYPE sysuuid_x16
      RETURNING VALUE(rs_header) TYPE zcsr_header
      RAISING   zcx_csr.

    METHODS complete_review
      IMPORTING iv_header_guid   TYPE sysuuid_x16
                iv_outcome       TYPE zcsr_outcome
                iv_notes         TYPE string
      RETURNING VALUE(rs_header) TYPE zcsr_header
      RAISING   zcx_csr.

    METHODS reassign
      IMPORTING iv_header_guid   TYPE sysuuid_x16
                iv_new_analyst   TYPE xubname
      RETURNING VALUE(rs_header) TYPE zcsr_header
      RAISING   zcx_csr.

    METHODS generate_instances
      IMPORTING iv_chktype        TYPE zcsr_chktype
                iv_period_year    TYPE numc4
                iv_period_qtr     TYPE zcsr_qtr
      RETURNING VALUE(rt_headers) TYPE ty_t_headers
      RAISING   zcx_csr.

    METHODS enqueue
      IMPORTING iv_header_guid TYPE sysuuid_x16
      RAISING   zcx_csr.

    METHODS dequeue
      IMPORTING iv_header_guid TYPE sysuuid_x16.

  PRIVATE SECTION.
    DATA mo_validation TYPE REF TO zcl_csr_validation.

    METHODS check_transition
      IMPORTING iv_from TYPE zcsr_status
                iv_to   TYPE zcsr_status
      RAISING   zcx_csr.

    METHODS set_status
      IMPORTING iv_header_guid   TYPE sysuuid_x16
                iv_new_status    TYPE zcsr_status
                iv_sign          TYPE abap_bool DEFAULT abap_false
      RETURNING VALUE(rs_header) TYPE zcsr_header
      RAISING   zcx_csr.

    METHODS write_change_document
      IMPORTING iv_objectid TYPE cdobjectv
                iv_table    TYPE tabname.
ENDCLASS.


CLASS zcl_csr_model IMPLEMENTATION.

  METHOD constructor.
    mo_validation = NEW zcl_csr_validation( ).
  ENDMETHOD.

  METHOD get_header.
    SELECT SINGLE * FROM zcsr_header INTO @rs_header
      WHERE header_guid = @iv_header_guid.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>checklist_not_found
                  msgv1  = |{ iv_header_guid }|.
    ENDIF.
  ENDMETHOD.

  METHOD get_items.
    SELECT * FROM zcsr_item INTO TABLE @rt_items
      WHERE header_guid = @iv_header_guid.
  ENDMETHOD.

  METHOD update_item.
    DATA(ls_header) = get_header( iv_header_guid ).

    " Draft edits allowed in NS/IP/RT only; first edit moves NS/RT -> IP
    IF ls_header-status <> c_status_not_started AND
       ls_header-status <> c_status_in_progress AND
       ls_header-status <> c_status_returned.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>transition_not_allowed
                  msgv1  = |{ ls_header-status }|
                  msgv2  = |{ c_status_in_progress }|.
    ENDIF.

    enqueue( iv_header_guid ).

    DATA lv_ts TYPE timestampl.
    GET TIME STAMP FIELD lv_ts.
    UPDATE zcsr_item
      SET response    = @iv_response,
          na_flag     = @iv_na_flag,
          valid_state = @space,
          changed_by  = @sy-uname,
          changed_at  = @lv_ts
      WHERE header_guid = @iv_header_guid
        AND question_id = @iv_question_id.

    IF ls_header-status <> c_status_in_progress.
      set_status( iv_header_guid = iv_header_guid
                  iv_new_status  = c_status_in_progress ).
    ENDIF.

    write_change_document( iv_objectid = CONV #( iv_header_guid )
                           iv_table    = 'ZCSR_ITEM' ).
    dequeue( iv_header_guid ).
  ENDMETHOD.

  METHOD submit_checklist.
    DATA(ls_header) = get_header( iv_header_guid ).
    check_transition( iv_from = ls_header-status iv_to = c_status_submitted ).

    " Full validation — raises zcx_csr only for hard errors; itemized
    " failures are returned as a table and surfaced by the DPC through
    " the message container in ONE response.
    DATA(lt_failures) = mo_validation->validate_checklist( iv_header_guid ).
    IF lt_failures IS NOT INITIAL.
      " DPC reads the failure table via zcl_csr_validation->get_last_failures( )
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>response_required
                  msgv1  = |{ lines( lt_failures ) }|.
    ENDIF.

    rs_header = set_status( iv_header_guid = iv_header_guid
                            iv_new_status  = c_status_submitted
                            iv_sign        = abap_true ).
  ENDMETHOD.

  METHOD start_review.
    DATA(ls_header) = get_header( iv_header_guid ).
    check_transition( iv_from = ls_header-status iv_to = c_status_under_review ).
    rs_header = set_status( iv_header_guid = iv_header_guid
                            iv_new_status  = c_status_under_review ).
  ENDMETHOD.

  METHOD complete_review.
    DATA(ls_header) = get_header( iv_header_guid ).

    DATA(lv_target) = COND zcsr_status(
      WHEN iv_outcome = 'CP' THEN c_status_completed
      WHEN iv_outcome = 'RT' THEN c_status_returned ).
    check_transition( iv_from = ls_header-status iv_to = lv_target ).

    IF lv_target = c_status_returned AND iv_notes IS INITIAL.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>notes_mandatory.
    ENDIF.

    " persist review record
    DATA ls_review TYPE zcsr_review.
    TRY.
        ls_review-review_guid = cl_system_uuid=>create_uuid_x16_static( ).
      CATCH cx_uuid_error ##NO_HANDLER.
    ENDTRY.
    ls_review-header_guid = iv_header_guid.
    ls_review-reviewer    = sy-uname.
    ls_review-outcome     = iv_outcome.
    ls_review-notes       = iv_notes.
    GET TIME STAMP FIELD ls_review-reviewed_at.
    INSERT zcsr_review FROM ls_review.

    rs_header = set_status( iv_header_guid = iv_header_guid
                            iv_new_status  = lv_target ).
    write_change_document( iv_objectid = CONV #( iv_header_guid )
                           iv_table    = 'ZCSR_REVIEW' ).
  ENDMETHOD.

  METHOD reassign.
    DATA(ls_header) = get_header( iv_header_guid ).
    DATA lv_ts TYPE timestampl.
    GET TIME STAMP FIELD lv_ts.
    UPDATE zcsr_header
      SET analyst    = @iv_new_analyst,
          changed_by = @sy-uname,
          changed_at = @lv_ts
      WHERE header_guid = @iv_header_guid.
    write_change_document( iv_objectid = CONV #( iv_header_guid )
                           iv_table    = 'ZCSR_HEADER' ).
    rs_header = get_header( iv_header_guid ).
  ENDMETHOD.

  METHOD generate_instances.
    " Bound catalog version: newest RELEASED version whose VALID_FROM
    " lies on or before the period start (year/quarter -> first day).
    DATA(lv_month) = CONV numc2( ( iv_period_qtr - 1 ) * 3 + 1 ).
    DATA(lv_period_start) = CONV dats( |{ iv_period_year }{ lv_month }01| ).

    SELECT version FROM zcsr_qvers
      WHERE status = 'R' AND valid_from <= @lv_period_start
      ORDER BY valid_from DESCENDING, version DESCENDING
      INTO @DATA(lv_version) UP TO 1 ROWS.
    ENDSELECT.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>version_not_found msgv1 = 'released'.
    ENDIF.

    " Catalog rows for this checklist type at that version
    SELECT * FROM zcsr_qcatalog INTO TABLE @DATA(lt_catalog)
      WHERE chktype = @iv_chktype AND version = @lv_version.

    " All active analyst scope assignments for the type
    SELECT * FROM zcsr_assign INTO TABLE @DATA(lt_assign)
      WHERE role = 'AN'
        AND ( chktype = @iv_chktype OR chktype = @space )
        AND valid_from <= @sy-datum AND valid_to >= @sy-datum.

    DATA lv_ts TYPE timestampl.
    GET TIME STAMP FIELD lv_ts.

    LOOP AT lt_assign INTO DATA(ls_assign).
      " Segment-level types skip the 'ALL' pseudo-segment
      IF ( iv_chktype = 'CSRM' OR iv_chktype = 'QCLM' )
         AND ls_assign-market_seg = 'ALL'.
        CONTINUE.
      ENDIF.

      " One instance per scope per period — DB unique index is the
      " safety net; check first for clean idempotent behavior.
      SELECT COUNT(*) FROM zcsr_header
        WHERE chktype = @iv_chktype AND period_year = @iv_period_year
          AND period_qtr = @iv_period_qtr
          AND market_seg = @ls_assign-market_seg AND lob = @ls_assign-lob.
      IF sy-dbcnt > 0.
        CONTINUE.
      ENDIF.

      DATA ls_header TYPE zcsr_header.
      CLEAR ls_header.
      TRY.
          ls_header-header_guid = cl_system_uuid=>create_uuid_x16_static( ).
        CATCH cx_uuid_error ##NO_HANDLER.
      ENDTRY.
      ls_header-chktype      = iv_chktype.
      ls_header-period_year  = iv_period_year.
      ls_header-period_qtr   = iv_period_qtr.
      ls_header-market_seg   = ls_assign-market_seg.
      ls_header-lob          = ls_assign-lob.
      ls_header-analyst      = ls_assign-uname.
      ls_header-status       = c_status_not_started.
      ls_header-catalog_vers = lv_version.
      ls_header-created_by   = sy-uname.
      ls_header-created_at   = lv_ts.
      INSERT zcsr_header FROM ls_header.
      APPEND ls_header TO rt_headers.

      LOOP AT lt_catalog INTO DATA(ls_cat) WHERE inptype = 'I'.
        DATA ls_item TYPE zcsr_item.
        CLEAR ls_item.
        ls_item-header_guid = ls_header-header_guid.
        ls_item-question_id = ls_cat-question_id.
        INSERT zcsr_item FROM ls_item.
      ENDLOOP.

      write_change_document( iv_objectid = CONV #( ls_header-header_guid )
                             iv_table    = 'ZCSR_HEADER' ).
    ENDLOOP.
  ENDMETHOD.

  METHOD enqueue.
    CALL FUNCTION 'ENQUEUE_EZCSR_HEADER'
      EXPORTING
        header_guid    = iv_header_guid
      EXCEPTIONS
        foreign_lock   = 1
        system_failure = 2
        OTHERS         = 3.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>locked_by_user
                  msgv1  = CONV #( sy-msgv1 ).
    ENDIF.
  ENDMETHOD.

  METHOD dequeue.
    CALL FUNCTION 'DEQUEUE_EZCSR_HEADER'
      EXPORTING header_guid = iv_header_guid.
  ENDMETHOD.

  METHOD check_transition.
    " Allowed-transition matrix (FS §4.1 / Tech Spec §6.4)
    DATA(lv_ok) = abap_false.
    CASE iv_from.
      WHEN c_status_not_started.
        lv_ok = boolc( iv_to = c_status_in_progress ).
      WHEN c_status_in_progress.
        lv_ok = boolc( iv_to = c_status_in_progress OR iv_to = c_status_submitted ).
      WHEN c_status_submitted.
        lv_ok = boolc( iv_to = c_status_under_review ).
      WHEN c_status_under_review.
        lv_ok = boolc( iv_to = c_status_completed OR iv_to = c_status_returned ).
      WHEN c_status_returned.
        lv_ok = boolc( iv_to = c_status_in_progress OR iv_to = c_status_submitted ).
      WHEN c_status_completed.
        lv_ok = abap_false.                      " locked forever
    ENDCASE.
    IF lv_ok = abap_false.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>transition_not_allowed
                  msgv1  = |{ iv_from }| msgv2 = |{ iv_to }|.
    ENDIF.
  ENDMETHOD.

  METHOD set_status.
    enqueue( iv_header_guid ).
    DATA lv_ts TYPE timestampl.
    GET TIME STAMP FIELD lv_ts.

    IF iv_sign = abap_true.
      " Electronic signature: user + server timestamp, never client data
      UPDATE zcsr_header
        SET status = @iv_new_status, signed_by = @sy-uname,
            signed_at = @lv_ts, changed_by = @sy-uname, changed_at = @lv_ts
        WHERE header_guid = @iv_header_guid.
    ELSE.
      UPDATE zcsr_header
        SET status = @iv_new_status,
            changed_by = @sy-uname, changed_at = @lv_ts
        WHERE header_guid = @iv_header_guid.
    ENDIF.

    write_change_document( iv_objectid = CONV #( iv_header_guid )
                           iv_table    = 'ZCSR_HEADER' ).
    dequeue( iv_header_guid ).
    rs_header = get_header( iv_header_guid ).
  ENDMETHOD.

  METHOD write_change_document.
    " Generated by SCDO for object ZCSR (build step 2). The generated
    " update FM is ZCSR_WRITE_DOCUMENT with per-table X/Y parameters.
    " Wire it here once generated; representative call:
    "
    " CALL FUNCTION 'ZCSR_WRITE_DOCUMENT' IN UPDATE TASK
    "   EXPORTING objectid      = iv_objectid
    "             tcode         = sy-tcode
    "             utime         = sy-uzeit
    "             udate         = sy-datum
    "             username      = sy-uname
    "             upd_zcsr_header = 'U'     " per touched table
    "   TABLES    icdtxt_zcsr   = lt_cdtxt
    "             xzcsr_header  = lt_new
    "             yzcsr_header  = lt_old.
    "
    " Until SCDO generation, this method is a deliberate no-op.
    RETURN.
  ENDMETHOD.

ENDCLASS.
