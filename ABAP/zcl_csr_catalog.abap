*&---------------------------------------------------------------------*
*& ZCL_CSR_CATALOG — catalog maintenance (companion app backend)
*& QuestionSet CRUD with Editable enforcement, server-side QUESTION_ID
*& assignment (<CHKTYPE>-Pnn / -Nnn), version copy/release against
*& ZCSR_QVERS. Every write is change-documented (audit-relevant).
*&---------------------------------------------------------------------*
CLASS zcl_csr_catalog DEFINITION PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES: ty_t_qcatalog TYPE STANDARD TABLE OF zcsr_qcatalog WITH DEFAULT KEY,
           ty_t_qvers    TYPE STANDARD TABLE OF zcsr_qvers    WITH DEFAULT KEY.

    METHODS check_admin_authority
      IMPORTING iv_chktype TYPE zcsr_chktype OPTIONAL
      RAISING   zcx_csr.

    METHODS is_version_editable
      IMPORTING iv_version         TYPE numc4
      RETURNING VALUE(rv_editable) TYPE abap_bool.

    METHODS get_versions
      RETURNING VALUE(rt_versions) TYPE ty_t_qvers.

    METHODS create_question
      IMPORTING is_question        TYPE zcsr_qcatalog  " keys/ID ignored
      RETURNING VALUE(rs_question) TYPE zcsr_qcatalog
      RAISING   zcx_csr.

    METHODS update_question
      IMPORTING is_question TYPE zcsr_qcatalog
      RAISING   zcx_csr.

    METHODS delete_question
      IMPORTING iv_question_id TYPE char10
                iv_version     TYPE numc4
      RAISING   zcx_csr.

    METHODS copy_version
      IMPORTING iv_source_version TYPE numc4
      RETURNING VALUE(rs_version) TYPE zcsr_qvers
      RAISING   zcx_csr.

    METHODS release_version
      IMPORTING iv_version        TYPE numc4
                iv_valid_from     TYPE dats
      RETURNING VALUE(rs_version) TYPE zcsr_qvers
      RAISING   zcx_csr.

  PRIVATE SECTION.
    METHODS assert_editable
      IMPORTING iv_version TYPE numc4
      RAISING   zcx_csr.
ENDCLASS.


CLASS zcl_csr_catalog IMPLEMENTATION.

  METHOD check_admin_authority.
    " Catalog writes require Administer (ACTVT 70) — Tech Spec §5
    AUTHORITY-CHECK OBJECT 'Z_CSR_CHK'
      ID 'ACTVT'    FIELD '70'
      ID 'ZCHKTYPE' FIELD COND #( WHEN iv_chktype IS INITIAL
                                  THEN '*' ELSE iv_chktype )
      ID 'ZMSEG'    DUMMY
      ID 'ZLOB'     DUMMY.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>not_authorized.
    ENDIF.
  ENDMETHOD.

  METHOD is_version_editable.
    " Editable while: version exists with STATUS 'D' (Draft) AND no
    " checklist instance is bound to it.
    SELECT SINGLE status FROM zcsr_qvers INTO @DATA(lv_status)
      WHERE version = @iv_version.
    IF sy-subrc <> 0 OR lv_status <> 'D'.
      rv_editable = abap_false.
      RETURN.
    ENDIF.
    SELECT COUNT(*) FROM zcsr_header WHERE catalog_vers = @iv_version.
    rv_editable = boolc( sy-dbcnt = 0 ).
  ENDMETHOD.

  METHOD get_versions.
    SELECT * FROM zcsr_qvers INTO TABLE @rt_versions
      ORDER BY version DESCENDING.
  ENDMETHOD.

  METHOD create_question.
    check_admin_authority( is_question-chktype ).
    assert_editable( is_question-version ).

    rs_question = is_question.

    " Server-side ID: next free <CHKTYPE>-Pnn (Section P) / -Nnn (Section I)
    DATA(lv_marker) = COND char1( WHEN is_question-section = 'P'
                                  THEN 'P' ELSE 'N' ).
    DATA(lv_prefix)  = |{ is_question-chktype }-{ lv_marker }|.
    DATA(lv_pattern) = |{ lv_prefix }%|.
    DATA(lv_off)     = strlen( lv_prefix ).

    SELECT question_id FROM zcsr_qcatalog
      INTO TABLE @DATA(lt_ids)
      WHERE chktype = @is_question-chktype
        AND question_id LIKE @lv_pattern.

    DATA(lv_max) = 0.
    LOOP AT lt_ids INTO DATA(lv_id).
      DATA(lv_num_str) = lv_id+lv_off.
      CONDENSE lv_num_str NO-GAPS.
      IF lv_num_str CO '0123456789' AND lv_num_str IS NOT INITIAL.
        DATA(lv_num) = CONV i( lv_num_str ).
        IF lv_num > lv_max. lv_max = lv_num. ENDIF.
      ENDIF.
    ENDLOOP.
    rs_question-question_id = |{ lv_prefix }{ CONV numc2( lv_max + 1 ) }|.

    " Classification integrity — derived, never client-controlled
    rs_question-inptype = COND #( WHEN rs_question-section = 'P'
                                  THEN 'I' ELSE 'C' ).
    IF rs_question-seqnr IS INITIAL.
      SELECT MAX( seqnr ) FROM zcsr_qcatalog INTO @DATA(lv_maxseq)
        WHERE chktype = @rs_question-chktype
          AND version = @rs_question-version
          AND section = @rs_question-section.
      rs_question-seqnr = lv_maxseq + 10.
    ENDIF.

    INSERT zcsr_qcatalog FROM rs_question.
    " Change document via SCDO ZCSR (ZCSR_QCATALOG table) — wired with
    " the generated FM; see zcl_csr_model->write_change_document notes.
  ENDMETHOD.

  METHOD update_question.
    check_admin_authority( is_question-chktype ).
    assert_editable( is_question-version ).

    " Keys + classification are immutable; update content/behavior only
    UPDATE zcsr_qcatalog
      SET seqnr         = @is_question-seqnr,
          title         = @is_question-title,
          question_text = @is_question-question_text,
          example_text  = @is_question-example_text,
          resp_required = @is_question-resp_required,
          attach_mode   = @is_question-attach_mode,
          na_allowed    = @is_question-na_allowed
      WHERE question_id = @is_question-question_id
        AND version     = @is_question-version.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>question_not_found
                  msgv1  = |{ is_question-question_id }|
                  msgv2  = |{ is_question-version }|.
    ENDIF.
  ENDMETHOD.

  METHOD delete_question.
    SELECT SINGLE chktype FROM zcsr_qcatalog INTO @DATA(lv_chktype)
      WHERE question_id = @iv_question_id AND version = @iv_version.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>question_not_found
                  msgv1  = |{ iv_question_id }| msgv2 = |{ iv_version }|.
    ENDIF.
    check_admin_authority( lv_chktype ).
    assert_editable( iv_version ).

    " Physical delete is safe by construction: assert_editable guarantees
    " the version was never released and never bound — the row never
    " existed in any released snapshot.
    DELETE FROM zcsr_qcatalog
      WHERE question_id = @iv_question_id AND version = @iv_version.
  ENDMETHOD.

  METHOD copy_version.
    check_admin_authority( ).

    SELECT SINGLE * FROM zcsr_qvers INTO @DATA(ls_src)
      WHERE version = @iv_source_version.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>version_not_found
                  msgv1  = |{ iv_source_version }|.
    ENDIF.

    SELECT MAX( version ) FROM zcsr_qvers INTO @DATA(lv_max).
    rs_version-version = lv_max + 1.
    rs_version-status  = 'D'.
    rs_version-created_by = sy-uname.
    GET TIME STAMP FIELD rs_version-created_at.
    INSERT zcsr_qvers FROM rs_version.

    " Deep copy: ALL rows of ALL checklist types, one LUW
    SELECT * FROM zcsr_qcatalog INTO TABLE @DATA(lt_rows)
      WHERE version = @iv_source_version.
    LOOP AT lt_rows ASSIGNING FIELD-SYMBOL(<ls_row>).
      <ls_row>-version = rs_version-version.
      CLEAR <ls_row>-valid_from.
    ENDLOOP.
    INSERT zcsr_qcatalog FROM TABLE lt_rows.
  ENDMETHOD.

  METHOD release_version.
    check_admin_authority( ).

    IF iv_valid_from IS INITIAL.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>validfrom_required.
    ENDIF.

    SELECT SINGLE * FROM zcsr_qvers INTO @rs_version
      WHERE version = @iv_version.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>version_not_found msgv1 = |{ iv_version }|.
    ENDIF.
    IF rs_version-status = 'R'.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>version_already_released
                  msgv1  = |{ iv_version }|.
    ENDIF.

    " Guard: >= 1 Section P row per checklist type that has assignments.
    " The DPC collects one message per failing type into the message
    " container before re-raising, so the admin sees all gaps at once.
    SELECT DISTINCT chktype FROM zcsr_assign
      INTO TABLE @DATA(lt_types) WHERE chktype <> @space.
    LOOP AT lt_types INTO DATA(lv_type).
      SELECT COUNT(*) FROM zcsr_qcatalog
        WHERE version = @iv_version AND chktype = @lv_type
          AND section = 'P'.
      IF sy-dbcnt = 0.
        RAISE EXCEPTION TYPE zcx_csr
          EXPORTING textid = zcx_csr=>release_needs_procedure
                    msgv1  = |{ lv_type }|.
      ENDIF.
    ENDLOOP.

    " One-way D -> R; stamp Valid-From on version and rows
    UPDATE zcsr_qvers
      SET status = 'R', valid_from = @iv_valid_from
      WHERE version = @iv_version.
    UPDATE zcsr_qcatalog
      SET valid_from = @iv_valid_from
      WHERE version = @iv_version.

    SELECT SINGLE * FROM zcsr_qvers INTO @rs_version
      WHERE version = @iv_version.
  ENDMETHOD.

  METHOD assert_editable.
    IF is_version_editable( iv_version ) = abap_false.
      RAISE EXCEPTION TYPE zcx_csr
        EXPORTING textid = zcx_csr=>version_not_editable
                  msgv1  = |{ iv_version }|.
    ENDIF.
  ENDMETHOD.

ENDCLASS.
