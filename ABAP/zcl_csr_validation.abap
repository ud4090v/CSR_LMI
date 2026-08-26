*&---------------------------------------------------------------------*
*& ZCL_CSR_VALIDATION — submission validation
*& RESP_REQUIRED vs NA_ALLOWED logic + attachment presence for
*& ATTACH_MODE = 'R'. Returns the FULL failure list so the DPC can
*& answer one submit with every problem itemized (message container).
*&---------------------------------------------------------------------*
CLASS zcl_csr_validation DEFINITION PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES: BEGIN OF ty_failure,
             question_id TYPE char10,
             msgno       TYPE symsgno,   " ZCSR 003 / 004
             text        TYPE bapi_msg,
           END OF ty_failure,
           ty_t_failures TYPE STANDARD TABLE OF ty_failure WITH DEFAULT KEY.

    METHODS validate_checklist
      IMPORTING iv_header_guid     TYPE sysuuid_x16
      RETURNING VALUE(rt_failures) TYPE ty_t_failures
      RAISING   zcx_csr.

    METHODS get_last_failures
      RETURNING VALUE(rt_failures) TYPE ty_t_failures.

  PRIVATE SECTION.
    DATA mt_last_failures TYPE ty_t_failures.
ENDCLASS.


CLASS zcl_csr_validation IMPLEMENTATION.

  METHOD validate_checklist.
    CLEAR mt_last_failures.

    SELECT SINGLE catalog_vers FROM zcsr_header
      INTO @DATA(lv_version)
      WHERE header_guid = @iv_header_guid.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>checklist_not_found
                  msgv1  = |{ iv_header_guid }|.
    ENDIF.

    " Items joined with their bound catalog rows (response items only)
    SELECT i~question_id, i~response, i~na_flag,
           c~title, c~resp_required, c~attach_mode, c~na_allowed
      FROM zcsr_item AS i
      INNER JOIN zcsr_qcatalog AS c
        ON  c~question_id = i~question_id
        AND c~version     = @lv_version
      WHERE i~header_guid = @iv_header_guid
        AND c~inptype     = 'I'
      INTO TABLE @DATA(lt_check).

    " Non-deleted attachments per question, counted in one pass
    SELECT question_id, COUNT(*) AS cnt
      FROM zcsr_attach
      WHERE header_guid = @iv_header_guid AND deleted = @abap_false
      GROUP BY question_id
      INTO TABLE @DATA(lt_attcnt).

    LOOP AT lt_check INTO DATA(ls_check).

      " Rule 1: response (or explicit, permitted N/A) required
      IF ls_check-resp_required = abap_true.
        DATA(lv_satisfied) = boolc(
          ls_check-response IS NOT INITIAL OR
          ( ls_check-na_allowed = abap_true AND ls_check-na_flag = abap_true ) ).
        IF lv_satisfied = abap_false.
          APPEND VALUE ty_failure(
            question_id = ls_check-question_id
            msgno       = '003'
            text        = |Response required: { ls_check-title }| )
            TO rt_failures.
        ENDIF.
      ENDIF.

      " Rule 2: required evidence present (ATTACH_MODE 'R' only; 'O' never blocks)
      IF ls_check-attach_mode = 'R'.
        READ TABLE lt_attcnt INTO DATA(ls_cnt)
          WITH KEY question_id = ls_check-question_id.
        IF sy-subrc <> 0 OR ls_cnt-cnt = 0.
          APPEND VALUE ty_failure(
            question_id = ls_check-question_id
            msgno       = '004'
            text        = |Required evidence missing: { ls_check-title }| )
            TO rt_failures.
        ENDIF.
      ENDIF.

    ENDLOOP.

    mt_last_failures = rt_failures.
  ENDMETHOD.

  METHOD get_last_failures.
    rt_failures = mt_last_failures.
  ENDMETHOD.

ENDCLASS.
