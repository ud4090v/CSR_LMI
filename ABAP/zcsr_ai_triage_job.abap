*&---------------------------------------------------------------------*
*& Report ZCSR_AI_TRIAGE_JOB — batch advisory triage
*& Optional schedule (e.g. hourly during close week). Triages checklists
*& in SB status that have no flags yet. AI failures are silent by
*& contract — the job never errors a checklist.
*&---------------------------------------------------------------------*
REPORT zcsr_ai_triage_job.

START-OF-SELECTION.
  PERFORM main.

FORM main.
  DATA(lo_ai) = NEW zcl_csr_ai_client( ).

  " Submitted checklists without any existing AI flags
  SELECT h~header_guid
    FROM zcsr_header AS h
    WHERE h~status = 'SB'
      AND NOT EXISTS ( SELECT * FROM zcsr_aiflag AS f
                       WHERE f~header_guid = h~header_guid )
    INTO TABLE @DATA(lt_guids).

  LOOP AT lt_guids INTO DATA(lv_guid).
    DATA(lt_flags) = lo_ai->triage_checklist( lv_guid ).
    WRITE: / |{ lv_guid }: { lines( lt_flags ) } flag(s)|.
  ENDLOOP.

  COMMIT WORK.
ENDFORM.
