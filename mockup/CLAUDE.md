# CLAUDE.md — mockup/ (client-demo mockup, NOT the product)

You are building a **throwaway interactive mockup** of the CSR Auditing Application for
the client demo and acceptance meeting. Build order and phase gates:
`ClaudeCode/PROMPT-mockup-demo.md`. This folder is independent of the real build —
when in doubt, these rules override anything you'd carry over from the app prompts.

## What this is / is not

- **Is:** a static, self-contained, click-through demo — vanilla HTML + CSS + JS,
  no framework, no build step, no network calls; must run opened from `file://`.
- **Is not:** the product, a prototype to be upgraded, or UI5. Do not use SAPUI5 here;
  do not copy mockup code into `checklist/` later, and never touch `checklist/`,
  `catalog/`, `ABAP/`, or anything in `design/` from this folder (read `design/`
  seed workbooks, yes; modify, never).

## Hard rules

1. **Fidelity ceiling.** Horizon design language, executed beautifully — nothing the
   real freestyle UI5 1.108 app cannot plausibly render later. No glassmorphism, no
   parallax, no consumer-app flourishes. If the client falls in love with something
   unbuildable, the mockup has failed its purpose.
2. **Real content, verbatim.** Procedure titles, requirement texts, worked examples,
   LOBs and segments come from the `../design/` seed workbooks. Never invent or
   paraphrase procedure wording. Demo-only values (analyst names, dates, AI finding
   texts, NaAllowed flags) are allowed and should be believable.
3. **Confidential.** The mockup embeds real client checklist content. It is shown
   locally or on internal infrastructure only — never deployed to public hosting,
   never committed to any other repo, no analytics or external requests of any kind.
4. **Honest theater.** Interactions may be simulated (in-memory state, fake upload
   chips, scripted AI flags), but every screen carries the footer note
   "Interactive design mockup — illustrative data", and nothing claims a capability
   the design docs don't promise. The AI panel must say "advisory only".
5. **Status semantics match the product:** NS/IP/SB/UR/RT/CP texts, text + color
   (never color alone), Sign & Submit wording, itemized blocked-submit errors,
   notes-required return. The demo teaches the real workflow.
6. **Zero console errors**, keyboard-reachable interactions, crisp at 1920×1080
   (projector) and on a 13-inch laptop.
7. **Resettable.** One control restores the pristine demo state instantly; the
   presenter rail (keyboard ← / →) must survive a cold start.

## After acceptance

Tag the accepted state, record the outcome in `NOTES.md`, freeze this folder, and
proceed with the real build per `ClaudeCode/PROMPT-build-frontend.md`.
