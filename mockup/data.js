// data.js — seed content extracted verbatim from design/ZCSR_QCATALOG_seed_v0001.xlsx
//            and design/ZCSR_value_tables_seed.xlsx

const DATA = (() => {

// === Value Tables ===

const LOBS = [
  { lob: 'MIC2', description: 'MIC2' },
  { lob: 'SEMS', description: 'SEMS' },
  { lob: 'SAC',  description: 'SAC' },
  { lob: 'TLS',  description: 'TLS' }
];

const MARKET_SEGMENTS = [
  { seg: 'ALL',  lob: '',     description: 'All Market Segments (LOB-level checklist)' },
  { seg: 'MDCS', lob: 'MIC2', description: 'Multi Doman Combat Systems (MDCS)' },
  { seg: 'UMS',  lob: 'MIC2', description: 'Undersea Mission Systems (UMS)' },
  { seg: 'EMC2', lob: 'MIC2', description: 'Enterprise Mission C2 (EMC2)' },
  { seg: 'REAS', lob: 'SEMS', description: 'Radars, EW & Acoustic Systems (REAS)' },
  { seg: 'MSW',  lob: 'SEMS', description: 'Mission Systems & Weapons (MSW)' },
  { seg: 'AIMS', lob: 'SEMS', description: 'Autonomy, Intel & Martime Sol (AIMS)' },
  { seg: 'GCMS', lob: 'SAC',  description: 'Global Commercial & Military Systens (GCMS)' },
  { seg: 'MS',   lob: 'SAC',  description: 'Maritime Systems (MS)' },
  { seg: 'MCS',  lob: 'SAC',  description: 'Marine Corps Systems (MCS)' },
  { seg: 'AP',   lob: 'SAC',  description: 'Advanced Programs' },
  { seg: 'AAFS', lob: 'SAC',  description: 'Army & Airforce Systems  (AAFS)' },
  { seg: 'LMS',  lob: 'TLS',  description: 'Land & Maritime Solutions (LMS)' },
  { seg: 'ACS',  lob: 'TLS',  description: 'Air & Commercial Solutions (ACS)' }
];

const CHKTYPE_LABELS = {
  CSRL: 'LOB CSR',
  QCLL: 'LOB Quarter Close'
};

const STATUS_META = {
  NS: { label: 'Not Started',   semantic: 'neutral',  color: '#6A6D70' },
  IP: { label: 'In Progress',   semantic: 'info',     color: '#0057D2' },
  SB: { label: 'Submitted',     semantic: 'warning',  color: '#E76500' },
  UR: { label: 'Under Review',  semantic: 'warning',  color: '#A45D00' },
  RT: { label: 'Returned',      semantic: 'error',    color: '#D20A0A' },
  CP: { label: 'Completed',     semantic: 'success',  color: '#188918' }
};

// === Question Catalog (version 0001) — verbatim from seed workbook ===

const CATALOG = [
  {
    id: 'CSRL-P01', version: '0001', chktype: 'CSRL', section: 'Procedures', seqnr: 10,
    title: 'Contract Data Properly Aggregated on Mission Area Overview (MAO) Charts',
    text: 'If you aggregated editable files (e.g., Excel files or PowerPoint charts containing editable tables) provided by the Market Segments into the LOB CSR charts that will be provided to RMS FP&A for the CSR review with the RMS VP, F&BO (or their designee), you are required to judgmentally select a sample of no less than 10% of the line items included in the consolidated MAO charts for the LOB, and to agree the EAC at Sell, Profit $ - Current, and Profit % - Current back to the source documentation provided to you by the Market Segments.  You must document the line items reviewed in this checklists.\n\nIf you simply aggregated non-editable files (e.g., PowerPoint charts with screenshots of the MAOs) provided by the Market Segments into the consolidated LOB CSR charts, you should indicate that in the "Description of Procedures Performed" column and attach or retain the files provided by all the Market Segments in the LOB.',
    example: 'Example 1 - I combined editable files from the Market Segments to prepare the MAO charts for the LOB CSR review with the RMS VP, F&BO.  I judgmentally selected a sample of 10% of the line items.  I have attached the consolidated LOB MAO charts and highlighted each line item reviewed.  I have also attached the source files provided by all the Market Segments in the LOB. \nExample 2 - All of the Market Segments provided me PowerPoint charts containing non-editable screenshots of the MAO charts.  I simply aggregated those charts into the LOB CSR presentation.  I have attached the source files provided by all the Market Segments in the LOB.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  {
    id: 'CSRL-P02', version: '0001', chktype: 'CSRL', section: 'Procedures', seqnr: 20,
    title: 'Data Properly Aggregated on EBIT Step-up Chart(s)',
    text: 'You are required to have the individuals within your LOB who are responsible to prepare the final Market Segment charts for the CSR Review with the RMS VP, F&BO send you an email with the final lists of EBIT Step-ups, De-books, and Losses that will be presented during the CSR Review with the RMS VP, F&BO (or their designee) attached to the email.\n\nAfter you aggregate the inputs from all the Market Segments in the LOB into the non-editable PowerPoint slide(s) that will be presented to the RMS VP, F&BO (or their designee), you are required to judgmentally select a sample population of at least 10% of all line items with anticipated EBIT Step-ups exceeding $150K in the Excel file or PowerPoint chart(s) that were attached to the emails from the Market Segments and to agree the "To ROS%" reflected in those attachments to the non-editable PowerPoint slide(s) that will be presented to the RMS VP, F&BO (or their designee). \n\nYou must document the line items reviewed in this checklist.  Indicate "N/A" in the "Description of Procedures Performed" column if there are no anticipated EBIT Step-ups exceeding $150K for the current quarter.',
    example: 'I have attached the emails that I received from the individuals within my LOB who are responsible to prepare the final Market Segment charts for the CSR Review with the RMS VP, F&BO with the final lists of Market Segment EBIT Step-ups, De-books, and Losses attached to the emails.\n\nI judgmentally selected 10% of the line items with EBIT Step-ups exceeding $150K in the files attached to the emails from the Market Segments and agreed the "To ROS%" to the attached non-editable PowerPoint slides included in the LOB presentation to the RMS, VP F&BO.\n\nI have highlighted the line items reviewed in the attached non-editable PowerPoint slides.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  {
    id: 'CSRL-P03', version: '0001', chktype: 'CSRL', section: 'Procedures', seqnr: 30,
    title: 'EBIT De-books Data Properly Aggregated',
    text: 'You are required to have the individuals within your LOB who are responsible to prepare the final Market Segment charts for the CSR Review with the RMS VP, F&BO send you an email with the final lists of EBIT Step-ups, De-books, and Losses that will be presented during the CSR Review with the RMS VP, F&BO (or their designee) attached to the email.\n\nAfter you aggregate the inputs from all the Market Segments in the LOB into the non-editable PowerPoint slide(s) that will be presented to the RMS VP, F&BO (or their designee), you are required to judgmentally select a sample population of at least 10% of all line items with anticipated EBIT De-books exceeding ($150K) in the Excel file or PowerPoint chart(s) that were attached to the emails from the Market Segments and to agree the "Booking Rate Reduction Current CSR" reflected in those attachments to the non-editable PowerPoint slide(s) that will be presented to the RMS VP, F&BO (or their designee).\n\nYou must document the line items reviewed in this checklist.  Indicate "N/A" in the "Description of Procedures Performed" column if there are no anticipated EBIT De-books exceeding ($150K) for the current quarter.',
    example: 'I have attached the emails that I received from the individuals within my LOB who are responsible to prepare the final Market Segment charts for the CSR Review with the RMS VP, F&BO with the final lists of Market Segment EBIT Step-ups, De-books, and Losses attached to the emails.\n\nI judgmentally selected 10% of the line items with EBIT De-books exceeding ($150K) in the files attached to the emails from the Market Segments and agreed the "Booking Rate Reduction Current CSR" to the attached non-editable PowerPoint slides included in the LOB presentation to the RMS, VP F&BO.\n\nI have highlighted the line items reviewed in the attached non-editable PowerPoint slides.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  {
    id: 'CSRL-P04', version: '0001', chktype: 'CSRL', section: 'Procedures', seqnr: 40,
    title: 'EBIT Losses Data Properly Aggregated',
    text: 'You are required to have the individuals within your LOB who are responsible to prepare the final Market Segment charts for the CSR Review with the RMS VP, F&BO send you an email with the final lists of EBIT Step-ups, De-books, and Losses that will be presented during the CSR Review with the RMS VP, F&BO (or their designee) attached to the email.\n\nAfter you aggregate the inputs from all the Market Segments in the LOB into the non-editable PowerPoint slide(s) that will be presented to the RMS VP, F&BO (or their designee), you are required to judgmentally select a sample population of at least 10% of all line items with anticipated EBIT Losses exceeding  ($150K) in the Excel file or PowerPoint chart(s) that were attached to the emails from the Market Segments and to agree the "ITD Sum Loss" reflected in those attachments to the non-editable PowerPoint slide(s) that will be presented to the RMS VP, F&BO (or their designee).\n\nYou must document the line items reviewed in this checklist.  Indicate "N/A" in the "Description of Procedures Performed" column if there are no anticipated EBIT Losses exceeding ($150K) for the current quarter.',
    example: 'I have attached the emails that I received from the individuals within my LOB who are responsible to prepare the final Market Segment charts for the CSR Review with the RMS VP, F&BO with the final lists of Market Segment EBIT Step-ups, De-books, and Losses attached to the emails.\n\nI judgmentally selected 10% of the line items with EBIT Losses exceeding ($150K) in the files attached to the emails from the Market Segments and agreed the "ITD Sum Loss" to the attached non-editable PowerPoint slides included in the LOB presentation to the RMS, VP F&BO.\n\nI have highlighted the line items reviewed in the attached non-editable PowerPoint slides.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  {
    id: 'QCLL-P01', version: '0001', chktype: 'QCLL', section: 'Procedures', seqnr: 10,
    title: 'Sample Validation of Current Quarter EBIT Step-ups',
    text: 'You are required to randomly select 1 EBIT Step-up exceeding $150K and judgmentally select additional EBIT Step-ups exceeding $150K to achieve a total sample selection of no less than 10% of the current quarter Complete (vs. Redlines) list of EBIT Step-ups exceeding $150K that was submitted to RMS FP&A on the quarter close LOB FP&A Template, to agree the "To ROS%" for the sample selections to what was recorded in the ledger (e.g., CES-SAP) as of the current quarter close, and to recalculate the EBIT Step-up amount based on what was recorded in the ledger to verify that it agrees to the amount reported in the quarter close LOB FP&A Template.  \nYou must document the line items reviewed in this checklist, as well as the name of the report or transaction (e.g., KKA2) that was used to validate the data in the ledger, and to document the actions taken to address any deltas between the EBIT Step-up amount you calculated based on the data in the Ledger and the amount reported on the quarter close LOB FP&A Template that were not simply due to rounding of the ROS%s to 1 decimal place on the quarter close LOB FP&A Template (i.e., you would not need to take any action if there was a delta because the Ledger calculation was based on 8.5494% and the quarter close LOB FP&A Template was based on 8.5%).\nIndicate "N/A" in the "Description of Procedures Performed" column if there are no EBIT Step-ups exceeding $150K for the current quarter.\nNote: The "Random Selection Example" tab provides examples of some acceptable approaches to demonstrate that a selection was random.',
    example: 'I have attached the quarter close LOB FP&A Template submitted to RMS FP&A.  In that attachment I have highlighted the EBIT Step-ups that I reviewed on the "Complete Step-Up List" tab.  I have also attached screenshots from transaction KKA2 and required calculations to evidence that the "To ROS%" reflected in the quarter close LOB FP&A Template agreed to the ROS% recorded in the ledger as of quarter close and that the EBIT Step-up amount reflected on the quarter close LOB FP&A Template was accurate while allowing for deltas simply driven by calculations beyond 1 level of decimal precision in the ROS%.  The random selection was determined using "True Random Number Generator" at www.random.org.  I have attached a screenshot demonstrating the random selection result.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  {
    id: 'QCLL-P02', version: '0001', chktype: 'QCLL', section: 'Procedures', seqnr: 20,
    title: 'Sample Validation of Current Quarter EBIT De-Books & Losses',
    text: 'You are required to verify that the single largest EBIT De-book or Loss amount on the Complete (vs. Redlines) list of EBIT De-books and EBIT Losses that was submitted to RMS FP&A on the quarter close LOB FP&A Template agreed to what was recorded in the ledger (e.g., CES-SAP) as of the current quarter close.  In the case of a De-book, you must validate that the "Booking Rate Current CSR" and the Current Quarter De-book Amount agree, and in the case of a Loss, you must validate that the "ITD Sum Loss" agrees.  You must document the line item reviewed in this checklist, as well as the name of the report or transaction (e.g., KKA2) that was used to validate the data in the ledger, and to document the actions taken to address any deltas between the EBIT De-book or Loss amount you calculated based on the data in the Ledger and the amount reported on the quarter close LOB FP&A Template that were not simply due to rounding of the ROS%s to 1 decimal place on the quarter close LOB FP&A Template (i.e., you would not need to take any action if there was a delta because the Ledger calculation was based on 8.5494% and the quarter close LOB FP&A Template was based on 8.5%)..  Indicate "N/A" in the "Description of Procedures Performed" column if there are no EBIT De-books or Losses for the current quarter.',
    example: 'I have attached the quarter close LOB FP&A Template submitted to RMS FP&A.  In that attachment I have highlighted the single largest EBIT De-book or Loss that I reviewed on the "Complete Debooks Losses" tab.  I have also attached screenshots from transaction KKA2 and any required calculations evidencing that in the case of a De-book the "Booking Rate Current CSR" and the Current Quarter De-book Amount agree, while allowing for deltas simply driven by calculations beyond 1 level of decimal precision in the ROS%, or that in the case of a Loss the "ITD Sum Loss" reflected in the quarter close LOB FP&A Template agreed to what was recorded in the ledger as of quarter close.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  {
    id: 'QCLL-P03', version: '0001', chktype: 'QCLL', section: 'Procedures', seqnr: 30,
    title: 'Validation that Control Totals from Market Segment FP&A Template submittals agreed to LOB Submittal to RMS FP&A',
    text: 'You are required to verify that the total amount of EBIT Step-ups, De-books, and Losses included in the individual submittals from each Market Segment in the LOB agreed to the total amount of complete EBIT Step-ups, De-books, and Losses for the quarter included in the final LOB FP&A Template submitted to RMS FP&A for the quarter.  If there are any reconciling items, you need to obtain documented objective evidence from the respective Market Segment Leads who submitted the Market Segment files to LOB FP&A to affirm their concurrence with any adjustments made at the LOB level after they submitted the Market Segment files.',
    example: 'I have attached copies of the FP&A Template files from each of  the Market Segment Leads in the LOB that were submitted to LOB FP&A and the file submitted by LOB FP&A to RMS FP&A.  I agreed the controls totals for the Complete list of EBIT Step-ups, De-books and Losses tabs from each of the Market Segment submittals to the LOB submittal to RMS FP&A.  I noted a reconciling item for the XYZ Market Segment, and obtained the attached confirmation from the Market Segment Lead affirming their concurrence with the adjustment in the LOB file submitted to RMS FP&A.',
    inptype: 'I', respRequired: true, attachMode: 'O'
  },
  // CSRL instruction/note rows
  { id: 'CSRL-N01', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 910, title: '', text: 'This checklist is to be completed by the LOB FP&A Lead or their delegate once each quarter prior to quarter close to ensure that any exceptions identified were either resolved prior to the CSR review with the Business Area VP, F&BO, or were properly reported to Business Area F&BO management subsequent to the review but prior to quarter close.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'CSRL-N02', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 920, title: '', text: 'It is recommended that 1 checklist is prepared for the entire LOB by a single independent individual, however, separate checklists can be prepared for each Market Segment in the LOB as long as the preparer of this checklist for a given Market Segment is not the same individual who completed the Market Segment CSR Checklist for that Market Segment.\n-  If the checklist is prepared by a single individual at the LOB level, it must be prepared by someone who did not prepare any of the Market Segment CSR Checklists for that LOB (e.g., If Jane Smith is preparing a single LOB CSR Checklist for the LOB, she can\'t have been the preparer of the Market Segment CSR Checklist for any Market Segment within the LOB).  \n-  If the checklist is prepared at the Market Segment level, it must be prepared by someone who did  not prepare the Market Segment CSR Checklist for the Market Segment for which they are completing the LOB CSR Checklist (e.g., If Jane Smith prepared the Market Segment CSR Checklist for the XYZ Market Segment, she prepare can\'t prepare the LOB CSR Checklist for that Market Segment).', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'CSRL-N03', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 930, title: '', text: 'When determining sample sizes, always round up to the nearest whole number.  For example, if the population is 1 and the required sample size is 10% of the population, then the sample size is 1.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'CSRL-N04', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 940, title: '', text: 'The preparer must populate the cells shaded in green in this worksheet.  The cells shaded in yellow can be used for optional comments and attachments.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'CSRL-N05', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 950, title: '', text: 'This checklist is to be electronically signed and dated via the macro button in this worksheet.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'CSRL-N06', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 960, title: '', text: 'This checklist and supporting objective evidence that would enable an auditor to re-perform the procedures performed are to be retained by the preparer for a minimum of two years to support audits.  You can optionally use the yellow shaded cells in the "Optional Attachments & Supporting Objective Evidence" column to facilitate retention of the supporting objective evidence.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'CSRL-N07', version: '0001', chktype: 'CSRL', section: 'Instructions / Notes', seqnr: 970, title: '', text: 'Make sure you save the final version completed each quarter with a unique file name.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  // QCLL instruction/note rows
  { id: 'QCLL-N01', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 910, title: '', text: 'The purpose of this checklist is to ensure that EBIT Step-ups, De-books, and Losses were accurately recorded and reported by the LOB at quarter close by performing a sample validation of the EBIT Step-ups, De-books, & Losses reported on the LOB FP&A Template submitted to RMS FP&A for the current quarter.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N02', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 920, title: '', text: 'This checklist should be prepared by someone who is independent and not directly involved in the preparation of the Market Segment data that was consolidated into the LOB FP&A template submitted to RMS FP&A each quarter.  Ideally the checklist would be prepared by someone in an independent function such as the Controller organization, but it can be prepared by the LOB FP&A Lead or their delegate if they only consolidated data provided by individuals representing the Market Segments within the LOB onto the LOB FP&A Template.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N03', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 930, title: '', text: 'When determining sample sizes, always round up to the nearest whole number.  For example, if the population is 1 and the required sample size is 10% of the population, then the sample size is 1.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N04', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 940, title: '', text: 'This checklist is completed once per quarter per LOB after immediately after quarter close, concurrent with submittal of the LOB FP&A Template to RMS FP&A.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N05', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 950, title: '', text: 'The preparer must populate the cells shaded in green in this worksheet.  The cells shaded in yellow can be used for optional attachments.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N06', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 960, title: '', text: 'This checklist is to be electronically signed and dated via the macro button in this worksheet.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N07', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 970, title: '', text: 'This checklist and supporting objective evidence that would enable an auditor to re-perform the procedures performed are to be retained by the preparer for a minimum of two years to support audits.  You can optionally use the yellow shaded cells in the "Optional Attachments" column to facilitate retention of the supporting objective evidence.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N08', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 980, title: '', text: 'Make sure you save the final version completed each quarter with a unique file name.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N98', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 998, title: 'Random Selection Guidance', text: 'Random selection may be demonstrated using a random number generator (e.g., www.random.org) or the RAND() function in Excel. Retain evidence of the random selection method used.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' },
  { id: 'QCLL-N99', version: '0001', chktype: 'QCLL', section: 'Instructions / Notes', seqnr: 999, title: 'Example EBIT Sample Selection', text: 'Example EBIT Sample Selection:\n- The LOB has 100 individual EBIT Step-ups in the quarter.\n- 41 of the individual step-ups exceeded $150K.\n- As part of the quarter close process the checklist preparer randomly selects 1 individual EBIT Step-up from the population of 41 EBIT Step-ups exceeding $150K.\n- Then they judgmentally select the 4 largest individual EBIT step-ups from the remaining population of EBIT Step-ups exceeding $150K to get to a total sample selection of 10% (41 X 10% = 5 total sample selections).\n- They would then complete the checklist by documenting the procedures performed to validate the 5 sample selections and post support, including the ledger (e.g., CES-SAP) screenshots, to the MD&A SharePoint for those 5 selections.', example: '', inptype: 'C', respRequired: false, attachMode: 'N' }
];

// === 7 Demo Checklist Instances (2026/Q3) ===

function buildItems(chktype, overrides) {
  const procedures = CATALOG.filter(c => c.chktype === chktype && c.inptype === 'I');
  return procedures.map((proc, i) => {
    const ov = overrides[i] || {};
    return {
      questionId: proc.id,
      title: proc.title,
      text: proc.text,
      example: proc.example,
      respRequired: proc.respRequired,
      attachMode: proc.attachMode,
      naAllowed: ov.naAllowed || false,
      response: ov.response || '',
      naFlag: ov.naFlag || false,
      attachments: ov.attachments || [],
      status: ov.response ? 'answered' : (ov.naFlag ? 'na' : 'open')
    };
  });
}

const CHECKLISTS = [
  {
    id: 'CL001',
    chktype: 'CSRL',
    lob: 'MIC2',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'Sarah Chen',
    reviewer: '',
    dueDate: '2026-11-05',
    status: 'NS',
    catalogVersion: '0001',
    signedBy: '',
    signedAt: '',
    reviewNotes: '',
    aiFlags: [],
    items: buildItems('CSRL', [
      { naAllowed: false },
      { naAllowed: true },
      { naAllowed: true },
      { naAllowed: true }
    ])
  },
  {
    id: 'CL002',
    chktype: 'CSRL',
    lob: 'SEMS',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'Michael Torres',
    reviewer: '',
    dueDate: '2026-11-01',
    status: 'IP',
    catalogVersion: '0001',
    signedBy: '',
    signedAt: '',
    reviewNotes: '',
    aiFlags: [
      { id: 'AF001', questionId: 'CSRL-P02', severity: 'Medium', text: 'Procedure CSRL-P02: Response mentions 8% sample but requirement is 10% minimum. Verify sample size meets the threshold.', advisory: true }
    ],
    items: buildItems('CSRL', [
      { response: 'I combined editable files from REAS, MSW, and AIMS Market Segments to prepare the MAO charts for the SEMS LOB CSR review.  I judgmentally selected a sample of 12% of the 47 line items (6 items).  I have attached the consolidated LOB MAO charts with the reviewed line items highlighted and the source files from each Market Segment.', attachments: ['LOB_SEMS_MAO_consolidated.xlsx', 'REAS_MAO_source.pptx', 'MSW_MAO_source.pptx'] },
      { response: 'I received emails from all three Market Segment leads with final EBIT Step-up lists attached. I aggregated the inputs into the non-editable presentation slides. I judgmentally selected 8% of step-ups exceeding $150K (3 of 38 items) and agreed the "To ROS%" to the consolidated slides. Reviewed items are highlighted in the attached slides.', attachments: ['SEMS_EBIT_Stepups_consolidated.pptx'] },
      { naAllowed: true },
      { naAllowed: true }
    ])
  },
  {
    id: 'CL003',
    chktype: 'QCLL',
    lob: 'SAC',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'Jennifer Park',
    reviewer: '',
    dueDate: '2026-11-01',
    status: 'IP',
    catalogVersion: '0001',
    signedBy: '',
    signedAt: '',
    reviewNotes: '',
    aiFlags: [],
    items: buildItems('QCLL', [
      { response: 'I randomly selected 1 EBIT Step-up using random.org from the population of 29 step-ups exceeding $150K across the SAC LOB.  I then judgmentally selected the 2 largest remaining step-ups for a total sample of 3 (10% of 29 = 3).  I verified the "To ROS%" for each sample selection against transaction KKA2 in CES-SAP and confirmed agreement.  I have attached the LOB FP&A Template with highlighted selections, KKA2 screenshots, and the random.org evidence.', attachments: ['SAC_LOB_FPA_Template_Q3.xlsx', 'KKA2_screenshots_stepups.pdf', 'randomorg_selection.png'] },
      {},
      {}
    ])
  },
  {
    id: 'CL004',
    chktype: 'CSRL',
    lob: 'SAC',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'David Williams',
    reviewer: 'Patricia Knowles',
    dueDate: '2026-10-28',
    status: 'SB',
    catalogVersion: '0001',
    signedBy: 'David Williams',
    signedAt: '2026-10-22T14:41:00Z',
    reviewNotes: '',
    aiFlags: [
      { id: 'AF002', questionId: 'CSRL-P01', severity: 'High', text: 'Procedure CSRL-P01: Response states 4 line items reviewed from 52 total (7.7%). Requirement is no less than 10% — expected sample size is 6. Evidence may be insufficient.', advisory: true },
      { id: 'AF003', questionId: 'CSRL-P03', severity: 'Medium', text: 'Procedure CSRL-P03: De-book validation references "previous quarter" comparison file. Confirm the attachment is for the current Q3 period, not a carryover from Q2.', advisory: true }
    ],
    items: buildItems('CSRL', [
      { response: 'I combined editable files from GCMS, MS, MCS, AP, and AAFS Market Segments to prepare the MAO charts for the SAC LOB CSR review with the RMS VP, F&BO.  I judgmentally selected a sample of 4 line items from the 52 total line items included in the consolidated MAO charts.  I have attached the consolidated LOB MAO charts with reviewed items highlighted and all Market Segment source files.', attachments: ['SAC_MAO_consolidated.xlsx', 'GCMS_source.xlsx', 'MS_source.xlsx', 'MCS_source.pptx', 'AP_source.pptx', 'AAFS_source.xlsx'] },
      { response: 'I received final EBIT Step-up, De-book, and Loss lists via email from each Market Segment lead.  After aggregation, I judgmentally selected 10% (4 of 41) of line items with EBIT Step-ups exceeding $150K and agreed the "To ROS%" to the non-editable slides.  Reviewed items are highlighted in the attached presentation.', attachments: ['SAC_EBIT_Stepups_slides.pptx', 'MktSeg_emails_archive.zip'] },
      { response: 'I received final lists from all Market Segment leads.  After aggregation, I selected 10% (2 of 18) EBIT De-books exceeding ($150K) and agreed the "Booking Rate Reduction Current CSR" to the presentation slides.  Reviewed items highlighted in attached.', attachments: ['SAC_EBIT_Debooks_Q3.pptx'] },
      { naAllowed: true, naFlag: true }
    ])
  },
  {
    id: 'CL005',
    chktype: 'QCLL',
    lob: 'TLS',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'Emily Rodriguez',
    reviewer: 'Patricia Knowles',
    dueDate: '2026-10-25',
    status: 'UR',
    catalogVersion: '0001',
    signedBy: 'Emily Rodriguez',
    signedAt: '2026-10-20T16:22:00Z',
    reviewNotes: '',
    aiFlags: [
      { id: 'AF004', questionId: 'QCLL-P02', severity: 'High', text: 'Procedure QCLL-P02: Response indicates "no EBIT De-books or Losses" but attached LOB FP&A Template shows 2 line items on the "Complete Debooks Losses" tab. Verify whether N/A designation is appropriate.', advisory: true }
    ],
    items: buildItems('QCLL', [
      { response: 'I randomly selected 1 EBIT Step-up using the RAND() function in Excel from the population of 15 step-ups exceeding $150K for the TLS LOB.  I then judgmentally selected the single largest remaining step-up for a total sample of 2 (10% of 15 = 2).  I verified the "To ROS%" against transaction KKA2 and confirmed the EBIT Step-up amounts agreed to the LOB FP&A Template.  Screenshots and the RAND() evidence are attached.', attachments: ['TLS_FPA_Template_Q3.xlsx', 'KKA2_stepups_TLS.pdf', 'RAND_selection_evidence.xlsx'] },
      { naAllowed: true, naFlag: true },
      { response: 'I verified that total EBIT Step-ups, De-books, and Losses from the LMS and ACS Market Segment submittals agreed to the totals in the final TLS LOB FP&A Template submitted to RMS FP&A.  No reconciling items were identified.  Market Segment files and the LOB submittal are attached.', attachments: ['LMS_FPA_Template.xlsx', 'ACS_FPA_Template.xlsx', 'TLS_LOB_FPA_final.xlsx'] }
    ])
  },
  {
    id: 'CL006',
    chktype: 'CSRL',
    lob: 'TLS',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'James Morrison',
    reviewer: 'Patricia Knowles',
    dueDate: '2026-11-01',
    status: 'RT',
    catalogVersion: '0001',
    signedBy: 'James Morrison',
    signedAt: '2026-10-21T10:15:00Z',
    reviewNotes: 'Procedure 1 (CSRL-P01): The sample size calculation appears to be based on 8% rather than the required 10%. Please re-verify the sample count and document any additional line items reviewed, or provide justification if the current sample meets the threshold after rounding.\n\nProcedure 3 (CSRL-P03): The attached De-books file is dated Q2. Please replace with the current Q3 file and re-verify the figures.',
    aiFlags: [],
    items: buildItems('CSRL', [
      { response: 'I combined editable Market Segment files from LMS and ACS to prepare the MAO charts for the TLS LOB CSR review.  I selected 2 of 25 line items (8%) for review and agreed the EAC at Sell, Profit $ and Profit % back to Market Segment source files.  Highlighted items and sources attached.', attachments: ['TLS_MAO_consolidated.xlsx', 'LMS_MAO_source.xlsx', 'ACS_MAO_source.xlsx'] },
      { response: 'I received final EBIT Step-up lists from LMS and ACS leads via email.  After aggregation, I selected 10% (2 of 19) step-ups exceeding $150K and agreed the "To ROS%" to the presentation.  Reviewed items highlighted in the attached slides.', attachments: ['TLS_Stepups_slides.pptx'] },
      { response: 'I selected 10% (1 of 8) De-books exceeding ($150K) and agreed the "Booking Rate Reduction Current CSR" to the slides.  Reviewed item highlighted.', attachments: ['TLS_Debooks_Q2.pptx'] },
      { naAllowed: true, naFlag: true }
    ])
  },
  {
    id: 'CL007',
    chktype: 'QCLL',
    lob: 'SEMS',
    marketSeg: 'ALL',
    period: '2026/Q3',
    analyst: 'Rachel Kim',
    reviewer: 'Patricia Knowles',
    dueDate: '2026-10-20',
    status: 'CP',
    catalogVersion: '0001',
    signedBy: 'Rachel Kim',
    signedAt: '2026-10-15T09:33:00Z',
    completedBy: 'Patricia Knowles',
    completedAt: '2026-10-18T11:47:00Z',
    reviewNotes: '',
    aiFlags: [],
    items: buildItems('QCLL', [
      { response: 'I randomly selected 1 EBIT Step-up using random.org from the population of 33 step-ups exceeding $150K for the SEMS LOB.  I then judgmentally selected the 3 largest remaining step-ups for a total sample of 4 (10% of 33 = 4, rounded up).  I verified the "To ROS%" for all 4 selections against transaction KKA2 in CES-SAP and confirmed agreement.  All supporting evidence is attached.', attachments: ['SEMS_FPA_Template_Q3.xlsx', 'KKA2_screenshots_SEMS.pdf', 'randomorg_evidence.png'] },
      { response: 'I verified the single largest EBIT De-book on the Complete Debooks Losses tab.  The "Booking Rate Current CSR" and Current Quarter De-book Amount agreed to what was recorded in CES-SAP via KKA2.  Screenshot evidence is attached.', attachments: ['KKA2_debook_largest_SEMS.pdf'] },
      { response: 'I verified that total EBIT Step-ups, De-books, and Losses from REAS, MSW, and AIMS Market Segment submittals agreed to the SEMS LOB FP&A Template totals submitted to RMS FP&A.  No reconciling items were found.  All Market Segment files and the final LOB submittal are attached.', attachments: ['REAS_FPA.xlsx', 'MSW_FPA.xlsx', 'AIMS_FPA.xlsx', 'SEMS_LOB_FPA_final.xlsx'] }
    ])
  }
];

// === Catalog versions (for admin/catalog teaser) ===

const CATALOG_VERSIONS = [
  { version: '0001', status: 'Released', validFrom: '2025-01-01', releasedBy: 'Admin', releasedAt: '2024-12-15', questionCount: 24 },
  { version: '0002', status: 'Draft', validFrom: '', releasedBy: '', releasedAt: '', questionCount: 26 }
];

// === Presenter rail tour steps ===

const TOUR_STEPS = [
  { screen: 'worklist',  caption: 'The worklist replaces chasing spreadsheets — every checklist, its status, who owns it, and when it’s due.' },
  { screen: 'detail',    target: 'CL002', caption: 'Open an In Progress checklist — real procedure text from the client’s 2021-3Q template.' },
  { screen: 'detail',    target: 'CL002', action: 'fill', caption: 'Fill in responses and attach evidence — green fields for input, yellow for optional attachments.' },
  { screen: 'detail',    target: 'CL002', action: 'blocked-submit', caption: 'Try to submit incomplete — every gap is itemized. Nothing slips through.' },
  { screen: 'detail',    target: 'CL002', action: 'fix-and-submit', caption: 'Fix the gaps, sign and submit — electronic signature with server timestamp.' },
  { screen: 'review-queue', caption: 'Reviewer sees submitted checklists sorted by AI flag count — highest risk first.' },
  { screen: 'review-detail', target: 'CL004', caption: 'Review mode: read-only procedures, expanded AI pre-review panel with advisory flags.' },
  { screen: 'review-detail', target: 'CL004', action: 'return', caption: 'Return to analyst with required notes — the returned checklist shows the reviewer’s feedback.' },
  { screen: 'detail',    target: 'CL006', caption: 'Analyst sees the return banner and reviewer notes — fix and resubmit.' },
  { screen: 'review-detail', target: 'CL005', action: 'complete', caption: 'Complete a review — locked, signed, auditable end state.' },
  { screen: 'admin',     caption: 'Admin: period matrix, reassign, generate next quarter’s checklists.' },
  { screen: 'catalog',   caption: 'Catalog: versioned question sets — the annual update as a governed release.' }
];

// helper
function getCatalogItems(chktype) {
  return CATALOG.filter(c => c.chktype === chktype);
}

function getProcedures(chktype) {
  return CATALOG.filter(c => c.chktype === chktype && c.inptype === 'I');
}

function getNotes(chktype) {
  return CATALOG.filter(c => c.chktype === chktype && c.inptype === 'C');
}

function getSegmentsForLob(lob) {
  return MARKET_SEGMENTS.filter(s => s.lob === lob || s.seg === 'ALL');
}

return {
  LOBS, MARKET_SEGMENTS, CHKTYPE_LABELS, STATUS_META, CATALOG,
  CHECKLISTS, CATALOG_VERSIONS, TOUR_STEPS,
  getCatalogItems, getProcedures, getNotes, getSegmentsForLob
};

})();
