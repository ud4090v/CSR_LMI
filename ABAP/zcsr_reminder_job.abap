*&---------------------------------------------------------------------*
*& Report ZCSR_REMINDER_JOB — daily reminder & escalation dispatcher
*& Schedule via SM36 (daily, early morning). Evaluates ZCSR_DEADLINE
*& against sy-datum, sends reminder waves and escalations via
*& ZCL_CSR_NOTIFY.
*&---------------------------------------------------------------------*
REPORT zcsr_reminder_job.

PARAMETERS: p_url   TYPE string LOWER CASE,          " FLP base URL override
            p_admin TYPE ad_smtpadr LOWER CASE.      " escalation recipient

START-OF-SELECTION.
  PERFORM main.

FORM main.
  DATA(lo_notify) = NEW zcl_csr_notify( p_url ).

  SELECT * FROM zcsr_deadline INTO TABLE @DATA(lt_deadlines)
    WHERE due_date >= @sy-datum.

  LOOP AT lt_deadlines INTO DATA(ls_dl).
    DATA(lv_days_left) = CONV i( ls_dl-due_date - sy-datum ).

    " Is today a reminder wave day for this deadline?
    IF lv_days_left <> ls_dl-remind_days_1 AND
       lv_days_left <> ls_dl-remind_days_2 AND
       lv_days_left <> ls_dl-remind_days_3.
      CONTINUE.
    ENDIF.

    " All open checklists of the period
    SELECT * FROM zcsr_header INTO TABLE @DATA(lt_headers)
      WHERE chktype     = @ls_dl-chktype
        AND period_year = @ls_dl-period_year
        AND period_qtr  = @ls_dl-period_qtr
        AND status IN ('NS','IP','RT').

    LOOP AT lt_headers INTO DATA(ls_header).
      TRY.
          lo_notify->send_reminder( is_header    = ls_header
                                    iv_days_left = lv_days_left ).
        CATCH cx_bcs INTO DATA(lx_bcs).
          MESSAGE lx_bcs->get_text( ) TYPE 'S' DISPLAY LIKE 'W'.
      ENDTRY.

      " Escalation: completion below threshold on the LAST wave
      IF lv_days_left = ls_dl-remind_days_3 AND ls_dl-escalate_pct > 0.
        SELECT COUNT(*) FROM zcsr_item
          WHERE header_guid = @ls_header-header_guid.
        DATA(lv_total) = sy-dbcnt.
        SELECT COUNT(*) FROM zcsr_item
          WHERE header_guid = @ls_header-header_guid
            AND ( response <> @space OR na_flag = @abap_true ).
        DATA(lv_done) = sy-dbcnt.
        DATA(lv_pct) = COND i( WHEN lv_total = 0 THEN 0
                               ELSE lv_done * 100 / lv_total ).
        IF lv_pct < ls_dl-escalate_pct.
          TRY.
              lo_notify->send_escalation( is_header      = ls_header
                                          iv_completion  = lv_pct
                                          iv_admin_email = p_admin ).
            CATCH cx_bcs ##NO_HANDLER.
          ENDTRY.
        ENDIF.
      ENDIF.
    ENDLOOP.
  ENDLOOP.

  COMMIT WORK.                                    " releases BCS send requests
ENDFORM.


