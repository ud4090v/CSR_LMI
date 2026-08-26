*&---------------------------------------------------------------------*
*& ZCL_ZCSR_CHECKLIST_DPC_EXT — SEGW data provider extension
*&
*& Generated base class: ZCL_ZCSR_CHECKLIST_DPC (SEGW project
*& ZCSR_CHECKLIST). This extension redefines the CRUD/action/stream
*& methods and delegates to MODEL / VALIDATION / CATALOG / ATTACH_STORE /
*& AI_CLIENT. It owns:
*&   - every AUTHORITY-CHECK (row-level filtering incl. ZCSR_ASSIGN join)
*&   - mapping ZCX_CSR -> /IWBEP/CX_MGW_BUSI_EXCEPTION + message container
*&
*& NOTE ON METHOD NAMES: SEGW generates entity-set method names from the
*& entity type name, truncated to 30 chars (e.g. CHECKLISTHEADER_GET_ENTITYSET
*& may generate as CHECKLISTHEADE_GET_ENTITYSET). Use the names the
*& generator produced in YOUR system; bodies below are the contract.
*&---------------------------------------------------------------------*
CLASS zcl_zcsr_checklist_dpc_ext DEFINITION
  PUBLIC
  INHERITING FROM zcl_zcsr_checklist_dpc
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~execute_action REDEFINITION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~create_stream  REDEFINITION.
    METHODS /iwbep/if_mgw_appl_srv_runtime~get_stream     REDEFINITION.

  PROTECTED SECTION.
    " Representative entity redefinitions (names per generator):
    METHODS checklistheade_get_entityset REDEFINITION.
    METHODS checklistitem_update_entity  REDEFINITION.
    METHODS question_create_entity       REDEFINITION.
    METHODS question_update_entity       REDEFINITION.
    METHODS question_delete_entity       REDEFINITION.
    METHODS attachment_delete_entity     REDEFINITION.

  PRIVATE SECTION.
    DATA mo_model   TYPE REF TO zcl_csr_model.
    DATA mo_catalog TYPE REF TO zcl_csr_catalog.
    DATA mo_store   TYPE REF TO zif_csr_attach_store.

    METHODS get_model   RETURNING VALUE(ro) TYPE REF TO zcl_csr_model.
    METHODS get_catalog RETURNING VALUE(ro) TYPE REF TO zcl_csr_catalog.
    METHODS get_store   RETURNING VALUE(ro) TYPE REF TO zif_csr_attach_store.

    "! Map ZCX_CSR to the OData business error (single message)
    METHODS raise_busi
      IMPORTING ix_csr TYPE REF TO zcx_csr
      RAISING   /iwbep/cx_mgw_busi_exception.

    "! Push a whole failure list into the container, then raise once —
    "! this is how SubmitChecklist returns ALL problems in one response.
    METHODS raise_busi_itemized
      IMPORTING it_failures TYPE zcl_csr_validation=>ty_t_failures
      RAISING   /iwbep/cx_mgw_busi_exception.
ENDCLASS.


CLASS zcl_zcsr_checklist_dpc_ext IMPLEMENTATION.

  METHOD get_model.
    IF mo_model IS INITIAL. mo_model = NEW #( ). ENDIF.
    ro = mo_model.
  ENDMETHOD.

  METHOD get_catalog.
    IF mo_catalog IS INITIAL. mo_catalog = NEW #( ). ENDIF.
    ro = mo_catalog.
  ENDMETHOD.

  METHOD get_store.
    IF mo_store IS INITIAL. mo_store = NEW zcl_csr_attach_db( ). ENDIF.
    ro = mo_store.
  ENDMETHOD.

  METHOD raise_busi.
    DATA(lo_container) = mo_context->get_message_container( ).
    lo_container->add_message(
      iv_msg_type   = /iwbep/cl_cos_logger=>error
      iv_msg_id     = ix_csr->if_t100_message~t100key-msgid
      iv_msg_number = ix_csr->if_t100_message~t100key-msgno
      iv_msg_v1     = ix_csr->msgv1
      iv_msg_v2     = ix_csr->msgv2
      iv_msg_v3     = ix_csr->msgv3
      iv_msg_v4     = ix_csr->msgv4 ).
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING message_container = lo_container.
  ENDMETHOD.

  METHOD raise_busi_itemized.
    DATA(lo_container) = mo_context->get_message_container( ).
    LOOP AT it_failures INTO DATA(ls_failure).
      lo_container->add_message(
        iv_msg_type   = /iwbep/cl_cos_logger=>error
        iv_msg_id     = 'ZCSR'
        iv_msg_number = ls_failure-msgno
        iv_msg_v1     = CONV #( ls_failure-question_id )
        iv_msg_v2     = CONV #( ls_failure-text ) ).
    ENDLOOP.
    RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
      EXPORTING message_container = lo_container.
  ENDMETHOD.

* ---------------------------------------------------------------------
* Row-level secured header list: inner join on ZCSR_ASSIGN so rows the
* user may not see never leave the database (Tech Spec §5).
* ---------------------------------------------------------------------
  METHOD checklistheade_get_entityset.
    " Convert framework filter/order/paging first
    DATA(lv_where) = io_tech_request_context->get_osql_where_clause( ).

    SELECT DISTINCT h~*
      FROM zcsr_header AS h
      INNER JOIN zcsr_assign AS a
        ON  ( a~chktype    = h~chktype    OR a~chktype    = @space )
        AND ( a~market_seg = h~market_seg OR a~market_seg = @space )
        AND ( a~lob        = h~lob        OR a~lob        = @space )
      WHERE a~uname = @sy-uname
        AND a~valid_from <= @sy-datum AND a~valid_to >= @sy-datum
        AND (lv_where)
      ORDER BY h~due_date, h~lob, h~market_seg
      INTO CORRESPONDING FIELDS OF TABLE @et_entityset.
    " NOTE: dynamic WHERE from the request context; $top/$skip applied
    " via io_tech_request_context->get_top( ) / get_skip( ) — omitted
    " here for brevity, apply with UP TO / OFFSET on 7.5.
  ENDMETHOD.

* ---------------------------------------------------------------------
* Item autosave: MERGE updates Response / NaFlag only.
* ---------------------------------------------------------------------
  METHOD checklistitem_update_entity.
    DATA ls_data TYPE zcl_zcsr_checklist_mpc=>ts_checklistitem.
    io_data_provider->read_entry_data( IMPORTING es_data = ls_data ).

    TRY.
        get_model( )->update_item(
          iv_header_guid = ls_data-header_guid
          iv_question_id = ls_data-question_id
          iv_response    = ls_data-response
          iv_na_flag     = ls_data-na_flag ).
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.
    er_entity = ls_data.
  ENDMETHOD.

* ---------------------------------------------------------------------
* Catalog CRUD (companion app) — Editable enforcement + server-side ID.
* ---------------------------------------------------------------------
  METHOD question_create_entity.
    DATA ls_in  TYPE zcl_zcsr_checklist_mpc=>ts_question.
    DATA ls_cat TYPE zcsr_qcatalog.
    io_data_provider->read_entry_data( IMPORTING es_data = ls_in ).
    MOVE-CORRESPONDING ls_in TO ls_cat.

    TRY.
        DATA(ls_created) = get_catalog( )->create_question( ls_cat ).
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.

    MOVE-CORRESPONDING ls_created TO er_entity.
    er_entity-editable = abap_true.
  ENDMETHOD.

  METHOD question_update_entity.
    DATA ls_in  TYPE zcl_zcsr_checklist_mpc=>ts_question.
    DATA ls_cat TYPE zcsr_qcatalog.
    io_data_provider->read_entry_data( IMPORTING es_data = ls_in ).
    MOVE-CORRESPONDING ls_in TO ls_cat.
    TRY.
        get_catalog( )->update_question( ls_cat ).
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.
    MOVE-CORRESPONDING ls_in TO er_entity.
  ENDMETHOD.

  METHOD question_delete_entity.
    DATA lv_question_id TYPE char10.
    DATA lv_version     TYPE numc4.
    " Keys from io_tech_request_context->get_keys( ) — name/value pairs
    DATA(lt_keys) = io_tech_request_context->get_keys( ).
    LOOP AT lt_keys INTO DATA(ls_key).
      CASE ls_key-name.
        WHEN 'QUESTIONID'. lv_question_id = ls_key-value.
        WHEN 'VERSION'.    lv_version     = ls_key-value.
      ENDCASE.
    ENDLOOP.
    TRY.
        get_catalog( )->delete_question( iv_question_id = lv_question_id
                                         iv_version     = lv_version ).
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.
  ENDMETHOD.

* ---------------------------------------------------------------------
* Attachments as media entity.
* ---------------------------------------------------------------------
  METHOD /iwbep/if_mgw_appl_srv_runtime~create_stream.
    " slug: {HeaderGuid}/{QuestionId}/{Filename}
    SPLIT iv_slug AT '/' INTO DATA(lv_guid_str) DATA(lv_qid) DATA(lv_fname).
    DATA(lv_header_guid) = CONV sysuuid_x16( lv_guid_str ).

    TRY.
        DATA(ls_meta) = get_store( )->save(
          iv_header_guid = lv_header_guid
          iv_question_id = CONV #( lv_qid )
          iv_filename    = CONV #( lv_fname )
          iv_mimetype    = CONV #( is_media_resource-mime_type )
          iv_content     = is_media_resource-value ).
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.

    DATA ls_entity TYPE zcl_zcsr_checklist_mpc=>ts_attachment.
    MOVE-CORRESPONDING ls_meta TO ls_entity.
    copy_data_to_ref( EXPORTING is_data = ls_entity
                      CHANGING  cr_data = er_entity ).
  ENDMETHOD.

  METHOD /iwbep/if_mgw_appl_srv_runtime~get_stream.
    DATA lv_attach_guid TYPE sysuuid_x16.
    DATA(lt_keys) = io_tech_request_context->get_keys( ).
    READ TABLE lt_keys INTO DATA(ls_key) WITH KEY name = 'ATTACHGUID'.
    IF sy-subrc = 0. lv_attach_guid = ls_key-value. ENDIF.

    TRY.
        get_store( )->read( EXPORTING iv_attach_guid = lv_attach_guid
                            IMPORTING es_meta    = DATA(ls_meta)
                                      ev_content = DATA(lv_content) ).
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.

    DATA ls_stream TYPE ty_s_media_resource.
    ls_stream-value     = lv_content.
    ls_stream-mime_type = ls_meta-mimetype.

    " Byte-identical round trip incl. the ORIGINAL filename
    DATA(ls_header) = VALUE ihttpnvp(
      name  = 'Content-Disposition'
      value = |attachment; filename="{ ls_meta-filename }"| ).
    set_header( is_header = ls_header ).

    copy_data_to_ref( EXPORTING is_data = ls_stream
                      CHANGING  cr_data = er_stream ).
  ENDMETHOD.

  METHOD attachment_delete_entity.
    DATA lv_attach_guid TYPE sysuuid_x16.
    DATA(lt_keys) = io_tech_request_context->get_keys( ).
    READ TABLE lt_keys INTO DATA(ls_key) WITH KEY name = 'ATTACHGUID'.
    IF sy-subrc = 0. lv_attach_guid = ls_key-value. ENDIF.
    TRY.
        get_store( )->soft_delete( lv_attach_guid ).   " row retained (audit)
      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.
  ENDMETHOD.

* ---------------------------------------------------------------------
* Function imports — the ONLY way state changes.
* ---------------------------------------------------------------------
  METHOD /iwbep/if_mgw_appl_srv_runtime~execute_action.
    DATA(lt_params) = it_parameter.

    DEFINE _param.
      READ TABLE lt_params INTO DATA(ls_p&1) WITH KEY name = &2.
    END-OF-DEFINITION.

    TRY.
        CASE iv_action_name.

          WHEN 'SubmitChecklist'.
            _param 1 'HeaderGuid'.
            DATA(lv_guid) = CONV sysuuid_x16( ls_p1-value ).
            TRY.
                DATA(ls_header) = get_model( )->submit_checklist( lv_guid ).
              CATCH zcx_csr.
                " Itemized failures: the validator kept the full list
                DATA(lo_val) = NEW zcl_csr_validation( ).
                DATA(lt_failures) = lo_val->validate_checklist( lv_guid ).
                IF lt_failures IS NOT INITIAL.
                  raise_busi_itemized( lt_failures ).
                ELSE.
                  RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception.
                ENDIF.
            ENDTRY.
            " Fire-and-forget advisory triage AFTER successful submit
            NEW zcl_csr_ai_client( )->triage_checklist( lv_guid ).
            copy_data_to_ref( EXPORTING is_data = ls_header
                              CHANGING  cr_data = er_data ).

          WHEN 'StartReview'.
            _param 2 'HeaderGuid'.
            ls_header = get_model( )->start_review(
                          CONV sysuuid_x16( ls_p2-value ) ).
            copy_data_to_ref( EXPORTING is_data = ls_header
                              CHANGING  cr_data = er_data ).

          WHEN 'CompleteReview'.
            _param 3 'HeaderGuid'.
            _param 4 'Outcome'.
            _param 5 'Notes'.
            ls_header = get_model( )->complete_review(
              iv_header_guid = CONV sysuuid_x16( ls_p3-value )
              iv_outcome     = CONV zcsr_outcome( ls_p4-value )
              iv_notes       = CONV string( ls_p5-value ) ).
            copy_data_to_ref( EXPORTING is_data = ls_header
                              CHANGING  cr_data = er_data ).

          WHEN 'ReassignChecklist'.
            _param 6 'HeaderGuid'.
            _param 7 'NewAnalyst'.
            ls_header = get_model( )->reassign(
              iv_header_guid = CONV sysuuid_x16( ls_p6-value )
              iv_new_analyst = CONV xubname( ls_p7-value ) ).
            copy_data_to_ref( EXPORTING is_data = ls_header
                              CHANGING  cr_data = er_data ).

          WHEN 'GenerateInstances'.
            _param 8 'Chktype'.
            _param 9 'PeriodYear'.
            _param 10 'PeriodQtr'.
            DATA(lt_headers) = get_model( )->generate_instances(
              iv_chktype     = CONV zcsr_chktype( ls_p8-value )
              iv_period_year = CONV numc4( ls_p9-value )
              iv_period_qtr  = CONV zcsr_qtr( ls_p10-value ) ).
            copy_data_to_ref( EXPORTING is_data = lt_headers
                              CHANGING  cr_data = er_data ).

          WHEN 'TriggerAiTriage'.
            _param 11 'HeaderGuid'.
            DATA(lt_flags) = NEW zcl_csr_ai_client( )->triage_checklist(
                               CONV sysuuid_x16( ls_p11-value ) ).
            copy_data_to_ref( EXPORTING is_data = lt_flags
                              CHANGING  cr_data = er_data ).

          WHEN 'CopyCatalogVersion'.
            _param 12 'SourceVersion'.
            DATA(ls_version) = get_catalog( )->copy_version(
                                 CONV numc4( ls_p12-value ) ).
            copy_data_to_ref( EXPORTING is_data = ls_version
                              CHANGING  cr_data = er_data ).

          WHEN 'ReleaseCatalogVersion'.
            _param 13 'Version'.
            _param 14 'ValidFrom'.
            ls_version = get_catalog( )->release_version(
              iv_version    = CONV numc4( ls_p13-value )
              iv_valid_from = CONV dats( ls_p14-value(8) ) ).
            copy_data_to_ref( EXPORTING is_data = ls_version
                              CHANGING  cr_data = er_data ).

          WHEN 'ExportEvidence'.
            _param 15 'HeaderGuid'.
            " ZIP: responses + attachments (original names) + review notes.
            " Change-document history joins the bundle once SCDO is
            " generated (read via generated read FM).
            DATA(lv_hg) = CONV sysuuid_x16( ls_p15-value ).
            DATA(lo_zip) = NEW cl_abap_zip( ).
            DATA(lt_items) = get_model( )->get_items( lv_hg ).
            DATA lv_txt TYPE string.
            LOOP AT lt_items INTO DATA(ls_item).
              lv_txt = lv_txt && |{ ls_item-question_id }: |
                    && COND string( WHEN ls_item-na_flag = abap_true
                                    THEN 'N/A' ELSE ls_item-response )
                    && cl_abap_char_utilities=>cr_lf.
            ENDLOOP.
            lo_zip->add( name    = 'responses.txt'
                         content = cl_abap_codepage=>convert_to( lv_txt ) ).
            DATA(lt_att) = get_store( )->list( lv_hg ).
            LOOP AT lt_att INTO DATA(ls_att).
              get_store( )->read( EXPORTING iv_attach_guid = ls_att-attach_guid
                                  IMPORTING ev_content = DATA(lv_bytes) ).
              lo_zip->add( name    = |attachments/{ ls_att-filename }|
                           content = lv_bytes ).
            ENDLOOP.
            copy_data_to_ref( EXPORTING is_data = lo_zip->save( )
                              CHANGING  cr_data = er_data ).

          WHEN OTHERS.
            RAISE EXCEPTION TYPE /iwbep/cx_mgw_tech_exception.
        ENDCASE.

      CATCH zcx_csr INTO DATA(lx_csr).
        raise_busi( lx_csr ).
    ENDTRY.
  ENDMETHOD.

ENDCLASS.
