*&---------------------------------------------------------------------*
*& ZCL_CSR_AI_CLIENT — advisory triage via in-house LLM platform
*& SM59 destination ZCSR_LLM (type G) -> POST /v1/chat/completions
*& (OpenAI-compatible). JSON-only contract; parsed with /UI2/CL_JSON.
*&
*& HARD RULE (FS FR-26 / Tech Spec §7.1): flags are ADVISORY. Any
*& failure — connection, timeout, HTTP error, malformed JSON — returns
*& ZERO flags and never raises to the caller. AI never blocks submission.
*&---------------------------------------------------------------------*
CLASS zcl_csr_ai_client DEFINITION PUBLIC FINAL CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES: ty_t_flags TYPE STANDARD TABLE OF zcsr_aiflag WITH DEFAULT KEY.

    METHODS triage_checklist
      IMPORTING iv_header_guid  TYPE sysuuid_x16
      RETURNING VALUE(rt_flags) TYPE ty_t_flags.   " empty on ANY failure

  PRIVATE SECTION.
    CONSTANTS c_destination TYPE rfcdest VALUE 'ZCSR_LLM'.
    CONSTANTS c_path        TYPE string  VALUE '/v1/chat/completions'.

    " --- request payload (OpenAI chat format) ---
    TYPES: BEGIN OF ty_message,
             role    TYPE string,
             content TYPE string,
           END OF ty_message,
           BEGIN OF ty_request,
             model       TYPE string,
             temperature TYPE p LENGTH 3 DECIMALS 1,
             messages    TYPE STANDARD TABLE OF ty_message WITH DEFAULT KEY,
           END OF ty_request.

    " --- response envelope (only the fields we read) ---
    TYPES: BEGIN OF ty_choice_msg,
             content TYPE string,
           END OF ty_choice_msg,
           BEGIN OF ty_choice,
             message TYPE ty_choice_msg,
           END OF ty_choice,
           BEGIN OF ty_response,
             model   TYPE string,
             choices TYPE STANDARD TABLE OF ty_choice WITH DEFAULT KEY,
           END OF ty_response.

    " --- inner advisory payload the system prompt mandates ---
    TYPES: BEGIN OF ty_finding,
             question_id TYPE string,
             severity    TYPE string,   " H / M / L
             finding     TYPE string,
           END OF ty_finding,
           ty_t_findings TYPE STANDARD TABLE OF ty_finding WITH DEFAULT KEY.

    METHODS build_prompt
      IMPORTING iv_header_guid   TYPE sysuuid_x16
      RETURNING VALUE(rv_prompt) TYPE string.

    METHODS call_llm
      IMPORTING iv_prompt          TYPE string
      EXPORTING ev_model_info      TYPE char64
      RETURNING VALUE(rt_findings) TYPE ty_t_findings.
ENDCLASS.


CLASS zcl_csr_ai_client IMPLEMENTATION.

  METHOD triage_checklist.
    " Everything inside one TRY: an AI problem is a non-event for the
    " business process (log only, zero flags).
    TRY.
        DATA(lv_prompt) = build_prompt( iv_header_guid ).
        IF lv_prompt IS INITIAL.
          RETURN.
        ENDIF.

        DATA lv_model TYPE char64.
        DATA(lt_findings) = call_llm( EXPORTING iv_prompt = lv_prompt
                                      IMPORTING ev_model_info = lv_model ).

        DATA lv_ts TYPE timestampl.
        GET TIME STAMP FIELD lv_ts.

        LOOP AT lt_findings INTO DATA(ls_finding).
          " Defensive mapping — never trust model output blindly
          DATA(lv_sev) = CONV zcsr_aisev( ls_finding-severity(1) ).
          IF lv_sev <> 'H' AND lv_sev <> 'M' AND lv_sev <> 'L'.
            lv_sev = 'L'.
          ENDIF.
          DATA ls_flag TYPE zcsr_aiflag.
          CLEAR ls_flag.
          TRY.
              ls_flag-flag_guid = cl_system_uuid=>create_uuid_x16_static( ).
            CATCH cx_uuid_error.
              CONTINUE.
          ENDTRY.
          ls_flag-header_guid = iv_header_guid.
          ls_flag-question_id = ls_finding-question_id.
          ls_flag-severity    = lv_sev.
          ls_flag-flag_text   = ls_finding-finding.
          ls_flag-model_info  = lv_model.
          ls_flag-created_at  = lv_ts.
          APPEND ls_flag TO rt_flags.
        ENDLOOP.

        IF rt_flags IS NOT INITIAL.
          INSERT zcsr_aiflag FROM TABLE rt_flags.
        ENDIF.

      CATCH cx_root INTO DATA(lx_any).
        " Log via application log / checkpoint and swallow
        CLEAR rt_flags.
    ENDTRY.
  ENDMETHOD.

  METHOD build_prompt.
    " Prompt contains only responses and question texts — no attachments
    " in the prototype (Tech Spec §7.1).
    SELECT SINGLE catalog_vers FROM zcsr_header INTO @DATA(lv_version)
      WHERE header_guid = @iv_header_guid.
    IF sy-subrc <> 0. RETURN. ENDIF.

    SELECT i~question_id, i~response, i~na_flag, c~title, c~question_text
      FROM zcsr_item AS i
      INNER JOIN zcsr_qcatalog AS c
        ON c~question_id = i~question_id AND c~version = @lv_version
      WHERE i~header_guid = @iv_header_guid AND c~inptype = 'I'
      ORDER BY c~seqnr
      INTO TABLE @DATA(lt_qa).
    IF lt_qa IS INITIAL. RETURN. ENDIF.

    rv_prompt = `Review the following compliance checklist responses. `
             && `For each problem found return an entry. Respond ONLY with a JSON array `
             && `of objects: {"question_id":"...","severity":"H|M|L","finding":"..."}. `
             && `Flag: empty or evasive narratives, internal inconsistencies, `
             && `responses that do not address the stated requirement. No prose.`
             && cl_abap_char_utilities=>newline.

    LOOP AT lt_qa INTO DATA(ls_qa).
      rv_prompt = rv_prompt && cl_abap_char_utilities=>newline
        && |QUESTION { ls_qa-question_id } — { ls_qa-title }:|
        && cl_abap_char_utilities=>newline
        && |REQUIREMENT: { ls_qa-question_text }|
        && cl_abap_char_utilities=>newline
        && |RESPONSE: { COND string( WHEN ls_qa-na_flag = abap_true
                                     THEN 'N/A (explicitly marked)'
                                     ELSE ls_qa-response ) }|
        && cl_abap_char_utilities=>newline.
    ENDLOOP.
  ENDMETHOD.

  METHOD call_llm.
    DATA lo_client TYPE REF TO if_http_client.

    cl_http_client=>create_by_destination(
      EXPORTING destination = c_destination
      IMPORTING client      = lo_client
      EXCEPTIONS argument_not_found = 1 destination_not_found = 2
                 destination_no_authority = 3 plugin_not_active = 4
                 internal_error = 5 OTHERS = 6 ).
    IF sy-subrc <> 0.
      RETURN.                                     " zero flags
    ENDIF.

    lo_client->request->set_method( if_http_request=>co_request_method_post ).
    cl_http_utility=>set_request_uri( request = lo_client->request
                                      uri     = c_path ).
    lo_client->request->set_header_field( name  = 'Content-Type'
                                          value = 'application/json' ).
    " Auth header, if the platform requires one, comes from the SM59
    " destination configuration — never hardcoded here.

    DATA(ls_request) = VALUE ty_request(
      model       = 'default'
      temperature = '0.0'
      messages    = VALUE #(
        ( role = 'system'
          content = 'You are a compliance review assistant. Output JSON only.' )
        ( role = 'user' content = iv_prompt ) ) ).

    DATA(lv_body) = /ui2/cl_json=>serialize(
      data        = ls_request
      compress    = abap_true
      pretty_name = /ui2/cl_json=>pretty_mode-low_case ).
    lo_client->request->set_cdata( lv_body ).

    lo_client->send( EXCEPTIONS http_communication_failure = 1
                                http_invalid_state = 2
                                http_processing_failed = 3 OTHERS = 4 ).
    IF sy-subrc = 0.
      lo_client->receive( EXCEPTIONS http_communication_failure = 1
                                     http_invalid_state = 2
                                     http_processing_failed = 3 OTHERS = 4 ).
    ENDIF.
    IF sy-subrc <> 0.
      lo_client->close( EXCEPTIONS OTHERS = 0 ).
      RETURN.
    ENDIF.

    DATA lv_code TYPE i.
    lo_client->response->get_status( IMPORTING code = lv_code ).
    DATA(lv_payload) = lo_client->response->get_cdata( ).
    lo_client->close( EXCEPTIONS OTHERS = 0 ).
    IF lv_code <> 200 OR lv_payload IS INITIAL.
      RETURN.
    ENDIF.

    " Envelope, then the JSON array inside choices[1].message.content
    DATA ls_response TYPE ty_response.
    /ui2/cl_json=>deserialize( EXPORTING json = lv_payload
                               CHANGING  data = ls_response ).
    ev_model_info = ls_response-model.

    READ TABLE ls_response-choices INDEX 1 INTO DATA(ls_choice).
    IF sy-subrc <> 0 OR ls_choice-message-content IS INITIAL.
      RETURN.
    ENDIF.

    /ui2/cl_json=>deserialize( EXPORTING json = ls_choice-message-content
                               CHANGING  data = rt_findings ).
    " Malformed inner JSON simply leaves rt_findings empty — by design.
  ENDMETHOD.

ENDCLASS.
