# CSR Auditing Application — Demo Script (10 minutes)

**Setup:** Open `mockup/index.html` from file://. Press **P** to activate presenter mode. Use **Right arrow** to advance, **Left arrow** to go back. The rail shows each step's talking point.

---

## Talk Track (mapped to presenter steps)

### Step 1 — Worklist (0:00–1:00)
**Pain:** "Today, tracking quarterly checklists means chasing emails and spreadsheets. Who's done? Who's late? Nobody knows without asking."

**Beat:** "The Worklist replaces that. Every checklist for the quarter — its type, LOB, analyst, due date, progress, and status — in one place. The KPI strip at top gives you an instant read: how many are open, due this week, submitted, or completed."

**Click:** Point out the filters (LOB, Status, Type). Demonstrate filtering by LOB or status. Note that 'All' in the Segment column means it's a LOB-level checklist covering all Market Segments.

---

### Step 2 — Open a Checklist (1:00–2:00)
**Beat:** "Let's open an In Progress checklist. These are the real procedure texts from your 2021-3Q template — verbatim. Nothing was invented or paraphrased."

**Click:** The detail screen opens showing the SEMS LOB CSR checklist. Point out: progress ring, procedure cards with real requirement text, the collapsed Instructions/Notes panel, the 'Show more' toggle on long text, and the 'Worked example' panel.

---

### Step 3 — Fill In Responses (2:00–3:00)
**Beat:** "Green fields are for the Description of Procedures Performed. Yellow areas are for optional attachments. The N/A toggle appears only on procedures that allow it — not everywhere."

**Click:** Show typing in a response (autosave pulse appears in the footer), attaching a file (instant chip appears), and toggling N/A on an allowed procedure.

---

### Step 4 — Blocked Submit (3:00–4:30)
**Pain:** "The number one problem today: incomplete checklists get submitted and nobody catches it until audit season."

**Beat:** "Sign & Submit runs a completeness check. Every gap — missing responses, missing required evidence — is listed in one error panel. Each item is clickable and scrolls to the offending card, which lights up red."

**Click:** The blocked-submit error panel appears. Click one of the error items to scroll to its card. Note: "This is the client-side mirror. The server runs the same check — nothing slips through even if someone bypasses the UI."

---

### Step 5 — Fix and Sign (4:30–5:30)
**Beat:** "Fix the gaps — fill in the response, attach the evidence — and submit again. This time it goes through: a brief signing moment, then the header shows the electronic signature with the server timestamp."

**Click:** The signing spinner appears briefly, then the checklist flips to Submitted. The header shows "Signed by J. Doe · [timestamp] (server time)". The form locks read-only. Success toast confirms.

**Say:** "That timestamp is captured on the server, not the browser — no way to backdate."

---

### Step 6 — Review Queue (5:30–6:00)
**Beat:** "Reviewers see submitted checklists sorted by AI flag count — highest risk first. No more guessing which one to look at next."

**Click:** The Review Queue shows the submitted/under-review checklists. Note the AI flag badges.

---

### Step 7 — Review with AI Flags (6:00–7:00)
**Beat:** "The review screen is read-only. The AI pre-review panel shows advisory findings — things the machine noticed. Critical word: advisory. These never block submission and never auto-approve."

**Click:** Point out the AI flag severity chips (High/Medium), the finding text referencing specific procedure IDs, and the 'advisory only — never blocks submission' disclaimer.

---

### Step 8 — Return to Analyst (7:00–7:30)
**Beat:** "If something needs correction, the reviewer returns the checklist with notes — notes are required, not optional."

**Click:** The return dialog appears. Notes are entered. The checklist flips to Returned and disappears from the review queue. Switch to the analyst view — the return banner shows the reviewer's notes.

---

### Step 9 — Analyst Sees Return (7:30–8:00)
**Beat:** "The analyst sees exactly what needs to be fixed — it's right there in the red banner. Fix it, resubmit, and the loop continues until the reviewer completes the review."

---

### Step 10 — Complete Review (8:00–8:30)
**Beat:** "When everything checks out, Complete Review locks the checklist in its final state — signed, reviewed, auditable."

**Click:** The Completed state shows both the analyst's signature and the reviewer's completion timestamp.

---

### Step 11 — Admin (8:30–9:00)
**Beat:** "Admins see the big picture: a period status matrix showing counts by LOB and status. They can reassign checklists and generate next quarter's instances with one button."

**Click:** Show the status matrix. Click 'Generate Q4 Checklists' — new Not Started rows appear. Show the reassign table.

---

### Step 12 — Catalog (9:00–10:00)
**Beat:** "The annual question update — today a risky manual edit of the master spreadsheet. In the app, it's a governed workflow: Draft a new version, edit questions, release with a valid-from date. Released versions are immutable — the audit trail is unbreakable."

**Click:** Show the two version cards (0001 Released, 0002 Draft). Click 'Release version…' to show the dialog. Show the question catalog preview.

**Close:** "That's the CSR Auditing Application. Every pain point from the spreadsheet process — incomplete checklists, missing evidence, undated signatures, chasing status, risky question edits — solved with governance built in."

---

## FAQ (for Q&A)

**Q: Where does the evidence actually go?**
A: Attachments are stored as media entities in SAP with a SHA-256 tamper-evidence hash. The file bytes are retained in the system — no external storage dependency. Soft delete ensures nothing is permanently lost.

**Q: Who can see what?**
A: Role-based access: Analysts see their assigned checklists, Reviewers see submitted items in their scope, Admins see everything and can manage assignments, Auditors get read-only access. All authorization is enforced server-side — the UI reflects it but doesn't control it.

**Q: What happens when a deadline passes?**
A: The system tracks due dates and can send automated reminders via BCS (SAP email). Overdue checklists are visible in the Worklist and Admin views. Nothing blocks after the deadline — it's a visibility and escalation tool, not a lockout.

**Q: How do the questions change year to year?**
A: Through the catalog versioning system. A new draft version is created, questions are added/modified/removed, and the version is released with a valid-from date. Existing checklists keep their original version — they're never retroactively changed. New checklists pick up the latest released version.

**Q: What does the AI actually do?**
A: An in-house LLM reviews submitted responses against the procedure requirements and flags potential issues — sample size shortfalls, mismatched attachments, referenced periods that don't match the current quarter. It's advisory only: flags never block submission, never auto-approve, and an AI outage produces zero flags (not an error). The reviewer sees the flags as suggestions, not decisions.
