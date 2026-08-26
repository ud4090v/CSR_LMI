*&---------------------------------------------------------------------*
*& ZCX_CSR — central business exception, message class ZCSR
*& All CSR components raise this; the DPC maps it to the OData error
*& response (/IWBEP/CX_MGW_BUSI_EXCEPTION + message container).
*&---------------------------------------------------------------------*
CLASS zcx_csr DEFINITION
  PUBLIC
  INHERITING FROM cx_static_check
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_t100_message.

    " Message constants (message class ZCSR — see abap/README.md §3)
    CONSTANTS:
      BEGIN OF checklist_not_found,          " 001 Checklist &1 not found
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '001',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF checklist_not_found,
      BEGIN OF transition_not_allowed,       " 002 Status change &1 -> &2 not allowed
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '002',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE 'MSGV2',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF transition_not_allowed,
      BEGIN OF response_required,            " 003 Response required for procedure &1
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '003',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF response_required,
      BEGIN OF evidence_required,            " 004 Required evidence missing for procedure &1
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '004',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF evidence_required,
      BEGIN OF not_authorized,               " 005 Not authorized for this operation
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '005',
        attr1 TYPE scx_attrname VALUE '',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF not_authorized,
      BEGIN OF locked_by_user,               " 006 Checklist is being edited by &1
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '006',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF locked_by_user,
      BEGIN OF notes_mandatory,              " 007 Review notes are mandatory when returning
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '007',
        attr1 TYPE scx_attrname VALUE '',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF notes_mandatory,
      BEGIN OF version_not_editable,         " 008 Catalog version &1 is not editable
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '008',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF version_not_editable,
      BEGIN OF question_not_found,           " 009 Catalog row &1 / version &2 not found
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '009',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE 'MSGV2',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF question_not_found,
      BEGIN OF version_not_found,            " 010 Catalog version &1 not found
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '010',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF version_not_found,
      BEGIN OF version_already_released,     " 011 Catalog version &1 is already released
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '011',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF version_already_released,
      BEGIN OF release_needs_procedure,      " 012 Release requires >=1 procedure for type &1
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '012',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF release_needs_procedure,
      BEGIN OF attachment_not_found,         " 013 Attachment &1 not found
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '013',
        attr1 TYPE scx_attrname VALUE 'MSGV1',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF attachment_not_found,
      BEGIN OF validfrom_required,           " 015 Valid-from date is required for release
        msgid TYPE symsgid VALUE 'ZCSR',
        msgno TYPE symsgno VALUE '015',
        attr1 TYPE scx_attrname VALUE '',
        attr2 TYPE scx_attrname VALUE '',
        attr3 TYPE scx_attrname VALUE '',
        attr4 TYPE scx_attrname VALUE '',
      END OF validfrom_required.

    DATA: msgv1 TYPE symsgv READ-ONLY,
          msgv2 TYPE symsgv READ-ONLY,
          msgv3 TYPE symsgv READ-ONLY,
          msgv4 TYPE symsgv READ-ONLY.

    METHODS constructor
      IMPORTING
        textid   LIKE if_t100_message=>t100key OPTIONAL
        previous LIKE previous OPTIONAL
        msgv1    TYPE symsgv OPTIONAL
        msgv2    TYPE symsgv OPTIONAL
        msgv3    TYPE symsgv OPTIONAL
        msgv4    TYPE symsgv OPTIONAL.
ENDCLASS.


CLASS zcx_csr IMPLEMENTATION.

  METHOD constructor ##ADT_SUPPRESS_GENERATION.
    super->constructor( previous = previous ).
    me->msgv1 = msgv1.
    me->msgv2 = msgv2.
    me->msgv3 = msgv3.
    me->msgv4 = msgv4.
    CLEAR me->textid.
    IF textid IS INITIAL.
      if_t100_message~t100key = if_t100_message=>default_textid.
    ELSE.
      if_t100_message~t100key = textid.
    ENDIF.
  ENDMETHOD.

ENDCLASS.
