# Claude Code Prompts — Client Demo Mockup (acceptance before build)

**Goal:** a stunning, click-through interactive mockup of the CSR Auditing Application
for the client demo and acceptance meeting — built in hours, not weeks, and visually
honest about what the real freestyle UI5 1.108 / Horizon product will look like.

How to use: `mockup/CLAUDE.md` already governs that folder. Start Claude Code with
**`mockup/` as the working directory**, then run the phases below one at a time,
reviewing in a browser at each gate. This track is independent of
`PROMPT-build-frontend.md` — nothing here touches `checklist/`, the contract, or
the build plan.

**What actually wins acceptance (engineered into every phase):**
1. **Their own content** — procedure titles, requirement texts, worked examples, LOBs
   and market segments come from `../design/ZCSR_QCATALOG_seed_v0001.xlsx` and
   `../design/ZCSR_value_tables_seed.xlsx`, verbatim. The client must recognize their
   2021-3Q checklists on sight.
2. **Their pains visibly solved** — the demo dramatizes: no more chasing spreadsheets
   (worklist + due dates + progress), nothing incomplete slips through (blocked submit
   with itemized errors), signature + timestamp on submit, evidence attached to the
   question it proves, AI pre-review flags, returned-with-notes loop, and the annual
   question update as a governed version release.
3. **Fidelity ceiling** — nothing the real UI5 1.108 product cannot plausibly render.
   Horizon design language only; no glassmorphism, no parallax, no consumer-app
   flourishes we would later have to walk back.

---

## Phase M1 — Foundation + Worklist

```
Build the mockup foundation and the Worklist screen in mockup/ per mockup/CLAUDE.md.

Single-page vanilla stack: index.html + styles.css + app.js + data.js — no
framework, no build step, no network dependency; everything must work opened
from file:// (demo rooms have no reliable network). Hash-based screen routing.

Design system first, as CSS custom properties (Horizon-inspired tokens —
approximations are fine for a mockup): light surfaces (#F5F6F7 shell, #FFFFFF
cards), ink #1D2D3E, brand blue #0070F2, semantic green #188918 / orange
#E76500 / red #D20A0A / info #0057D2, '72' font stack with system-ui fallback
(no webfont fetch), 0.5rem card radius, soft layered shadows, 150ms ease
transitions, 8px spacing grid. Status chips and section labels always text +
color, never color alone.

data.js: generate it by reading the two seed workbooks in ../design/ with a
throwaway script (openpyxl or a node xlsx lib) — real CSRL + QCLL procedure
titles, requirement texts (600-1,600 chars), worked examples, attachment
modes, and the real LOB/segment lists. Build 7 demo checklist instances for
2026/Q3 covering statuses Not Started / In Progress / Submitted / Under
Review / Returned / Completed, with believable analyst names, due dates,
progress and AI-flag counts. Do NOT invent procedure wording — if a text is
in the workbook, use it verbatim.

Worklist screen: app shell (product header 'CSR Auditing', quarter context,
user chip), KPI strip (open / due this week / submitted / completed), filter
row (LOB → cascading Market Segment, status), and the checklist table — type,
LOB, segment ('ALL' shown as 'All'), period, analyst, due date, progress bar,
AI-flag badge, status chip. Row click routes to the detail screen (stub for
now). A subtle footer note on every screen: 'Interactive design mockup —
illustrative data'.

Gate: open index.html from file://, zero console errors, worklist renders
with the real seed content, filters cascade and filter, looks like a premium
Horizon application at 1920x1080 and on a 13-inch laptop. Screenshot for
review, then commit and push.
```

## Phase M2 — Checklist Detail: the procedure cards

```
Build the checklist detail screen — the heart of the demo — for the In
Progress CSRL instance.

Header: scope + period, analyst, due date, catalog version, progress ring or
bar, status chip. Collapsed 'Instructions / Notes' panel above the cards
(expands; holds the real Section I texts).

One procedure card per Section P row, real content: numbered title bar with
completion indicator (answered ✓ / open / N/A); requirement text clamped to
3 lines with 'Show more' expanding inline; collapsed 'Worked example' panel
where the seed has one; green-tinted response textarea that enables a saved
state; 'N/A' toggle ONLY on rows flagged NaAllowed (demo values fine) which
disables the textarea and marks the card satisfied; yellow-tinted attachment
area where AttachMode is O or R — chips for 'uploaded' files (fake a
file-picker interaction that instantly adds a named chip, e.g.
LOB_MAO_consolidated.xlsx), labeled 'Optional Attachments' or 'Required
evidence'.

Autosave theater: on typing pause, a quiet 'Draft autosaved 14:32:08' pulse
in the footer. Footer also carries the primary 'Sign & Submit' button.
All interactions instant and smooth; state lives in JS memory with a visible
'Reset demo' control in a corner menu.

Gate: file:// open, zero console errors, every card interaction works
(expand, N/A, attach, autosave pulse), real texts throughout. Screenshot,
commit, push.
```

## Phase M3 — The governance drama + review with AI

```
Make the compliance story land in two beats.

Beat 1 — blocked submit: with required responses still empty, 'Sign &
Submit' opens an error panel listing EVERY unmet item ('Response required:
<title>', 'Required evidence missing: <title>'), each entry clickable and
scrolling to its card, which shows a red error state. Fix the entries (type,
or N/A, or attach) and submit again: a brief signing moment, then the header
flips to Submitted with 'Signed by J. Doe · Oct 26, 2026 14:41 (server
time)', the form locks read-only, and a success toast confirms. This beat is
the client's #1 pain (incomplete checklists) dying on stage — make it crisp.

Beat 2 — reviewer: a Review Queue screen (submitted checklists sorted by AI
flags) and the same detail screen in review mode: read-only, an expanded 'AI
pre-review' panel with 2-3 advisory flags (severity chips High/Medium, finding
text referencing real procedure IDs, and a visible 'advisory only — never
blocks submission' caption), footer with 'Complete Review' and 'Return to
Analyst'. Return opens a notes dialog (notes required), flips the checklist to
Returned, and the analyst view then shows the reviewer's note in a banner.
Complete Review flips to Completed and shows the locked, signed end state.

Gate: the full loop plays without a refresh — blocked → fixed → signed →
reviewed → returned → resubmitted → completed — zero console errors.
Walk-through recording or screenshots, commit, push.
```

## Phase M4 — Admin glimpse, catalog teaser, demo mode & polish

```
Finish the story and make it presentable by a human under pressure.

Admin screen: period status matrix (counts by status across LOBs/segments),
a reassign affordance, and a 'Generate Q4 checklists' button that visibly
creates next quarter's Not Started rows. Catalog teaser (one screen, not the
full app): the question catalog with version chips '0001 — Released' /
'0002 — Draft', an edit-in-draft affordance, and a 'Release version…' dialog
with a valid-from date — the annual audit update as a governed workflow.

Demo mode: a presenter rail — keyboard ← / → steps through a scripted tour
(worklist → open → fill → blocked → fixed → signed → review → AI → return →
complete → admin → catalog), each step optionally showing a one-line caption
of the talking point. 'Reset demo' restores the initial state instantly.

Polish pass: consistent focus states and keyboard reachability, no layout
shift between screens, print-friendly isn't needed, dark mode is NOT needed —
one impeccable light theme beats two average ones.

Write mockup/DEMO_SCRIPT.md: the 10-minute talk track mapped to the presenter
steps — pain, beat, what to say, what to click — plus a 5-item FAQ for likely
client questions (Where does evidence go? Who can see what? What happens on
the deadline? How do questions change yearly? What does the AI actually do?)
answered from the real design docs.

Gate: a cold run — open file://, press → through the whole tour without
touching the mouse, zero console errors, under 10 minutes. Commit, push.
```

---

After acceptance: the mockup folder is frozen as the acceptance record (tag it),
and the full build proceeds per `PROMPT-build-frontend.md` — the mockup is never
upgraded into the product.
