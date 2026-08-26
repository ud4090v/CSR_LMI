*&---------------------------------------------------------------------*
*& ZCL_CSR_NOTIFY — BCS e-mail assembly (reminders + escalations)
*& Deep links carry the Fiori hash #/checklist/{HeaderGuid} so a click
*& lands directly on the analyst's checklist (guarded route).
*&---------------------------------------------------------------------*
CLASS zcl_csr_notify DEFINITION PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    " Launchpad base URL, e.g. https://fes.example.corp/sap/bc/ui2/flp
    " Prototype: set from the job variant. Production: TVARVC entry
    " ZCSR_FLP_URL read in the constructor.
    METHODS constructor
      IMPORTING iv_base_url TYPE string OPTIONAL.

    METHODS send_reminder
      IMPORTING is_header    TYPE zcsr_header
                iv_days_left TYPE i
      RAISING   cx_send_req_bcs cx_address_bcs cx_document_bcs.

    METHODS send_escalation
      IMPORTING is_header      TYPE zcsr_header
                iv_completion  TYPE i
                iv_admin_email TYPE ad_smtpadr
      RAISING   cx_send_req_bcs cx_address_bcs cx_document_bcs.

  PRIVATE SECTION.
    DATA mv_base_url TYPE string.

    METHODS get_user_email
      IMPORTING iv_uname        TYPE xubname
      RETURNING VALUE(rv_email) TYPE ad_smtpadr.

    METHODS send_mail
      IMPORTING iv_to      TYPE ad_smtpadr
                iv_subject TYPE so_obj_des
                iv_html    TYPE string
      RAISING   cx_send_req_bcs cx_address_bcs cx_document_bcs.
ENDCLASS.


CLASS zcl_csr_notify IMPLEMENTATION.

  METHOD constructor.
    mv_base_url = iv_base_url.
    IF mv_base_url IS INITIAL.
      SELECT SINGLE low FROM tvarvc INTO @mv_base_url
        WHERE name = 'ZCSR_FLP_URL' AND type = 'P'.
    ENDIF.
  ENDMETHOD.

  METHOD send_reminder.
    DATA(lv_email) = get_user_email( is_header-analyst ).
    IF lv_email IS INITIAL. RETURN. ENDIF.

    DATA(lv_link) = |{ mv_base_url }#/checklist/{ is_header-header_guid }|.
    DATA(lv_scope) = COND string(
      WHEN is_header-market_seg = 'ALL' OR is_header-market_seg IS INITIAL
      THEN |LOB { is_header-lob }|
      ELSE |{ is_header-lob } / { is_header-market_seg }| ).

    DATA(lv_html) =
      |<p>Reminder: your CSR checklist for <b>{ lv_scope }</b>, |
   && |period { is_header-period_year }/Q{ is_header-period_qtr }, |
   && |is due in <b>{ iv_days_left }</b> day(s).</p>|
   && |<p><a href="{ lv_link }">Open the checklist</a></p>|
   && |<p>This is an automated notice from the CSR Auditing Application.</p>|.

    send_mail( iv_to      = lv_email
               iv_subject = CONV #( |CSR checklist due in { iv_days_left } day(s)| )
               iv_html    = lv_html ).
  ENDMETHOD.

  METHOD send_escalation.
    IF iv_admin_email IS INITIAL. RETURN. ENDIF.
    DATA(lv_link) = |{ mv_base_url }#/checklist/{ is_header-header_guid }|.
    DATA(lv_html) =
      |<p>Escalation: checklist { is_header-lob } / { is_header-market_seg } |
   && |({ is_header-period_year }/Q{ is_header-period_qtr }) is at |
   && |<b>{ iv_completion }%</b> completion with the deadline approaching. |
   && |Assigned analyst: { is_header-analyst }.</p>|
   && |<p><a href="{ lv_link }">Open the checklist</a></p>|.
    send_mail( iv_to      = iv_admin_email
               iv_subject = 'CSR checklist escalation'
               iv_html    = lv_html ).
  ENDMETHOD.

  METHOD get_user_email.
    " Standard user master read; BAPI keeps it release-safe on ECC
    DATA ls_address TYPE bapiaddr3.
    DATA lt_return  TYPE STANDARD TABLE OF bapiret2.
    CALL FUNCTION 'BAPI_USER_GET_DETAIL'
      EXPORTING username = iv_uname
      IMPORTING address  = ls_address
      TABLES    return   = lt_return.
    rv_email = ls_address-e_mail.
  ENDMETHOD.

  METHOD send_mail.
    DATA(lo_bcs) = cl_bcs=>create_persistent( ).

    " HTML body -> soli table
    DATA(lt_soli) = cl_bcs_convert=>string_to_soli( iv_html ).
    DATA(lo_doc) = cl_document_bcs=>create_document(
      i_type    = 'HTM'
      i_text    = lt_soli
      i_subject = iv_subject ).
    lo_bcs->set_document( lo_doc ).

    DATA(lo_recipient) = cl_cam_address_bcs=>create_internet_address( iv_to ).
    lo_bcs->add_recipient( i_recipient = lo_recipient ).

    lo_bcs->set_send_immediately( abap_true ).
    lo_bcs->send( ).
    " COMMIT WORK is issued by the calling report (one commit per run
    " section), not per mail.
  ENDMETHOD.

ENDCLASS.
