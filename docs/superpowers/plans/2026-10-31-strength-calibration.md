# Strength Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish private strength calibration, experienced starting-weight trials and gradual performance-based progression.

**Architecture:** Extend the optional profile schema with private training settings. A pure recommendation module supplies experienced-mode suggestions to the existing tracker; a separate profile form saves settings through the existing revision-controlled cloud adapter. Cloud serialization uses a separate `users/{uid}/settings/training` document and joins both initial server snapshots; legacy profile records remain unchanged. Existing users retain starter behaviour until they select experienced mode.

**Tech Stack:** Existing buildless JavaScript/CSS, Node tests, owner-only Firestore rules/emulator, GitHub Pages. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-31-strength-calibration-design.md` (approved).

## Global Constraints

- No actual personal strength numbers in public code, defaults, docs, URLs or test fixtures.
- Preserve old profiles/backups, optional sets, historical records, private owner identity, API-key restrictions and nutrition settings.
- Suggestions do not populate actual logs or mark sets complete. Do not estimate accessory strength from main lifts or claim measured 1RM.
- Experienced accessory weights are clearly labelled practical trials; machine/cable conventions remain explicit.
- Keep ordinary programme set counts, bench6–8, squat4–6, deadlift3–5 and existing recovery guidance.

## Review Focus

- A new calibration supersedes older history, but future calibration/history must not influence past session dates.
- Mixed loads, incomplete sets, added/removed sets and below-range performance cannot trigger blanket load/rep increases.
- Training saves must work with blank nutrition age, and ordinary nutrition saves must preserve training settings.
- Old clients/profiles/backups must remain valid with the independent Firestore settings document.
- Genuine fitness baselines must be saved only in the intended owner account, with production tests using synthetic values.

### Task 1: Schema and recommendation engine

**Files:** `assets/core.js`, `assets/strength.js` (new), `assets/tracking.js`, `assets/cloud-records.js`, `firestore.rules`, `tests/strength.test.mjs` (new), `tests/rules/firestore.test.mjs`.

**Interfaces:** Optional `profile.training={mode:'starter'|'experienced',baselines:{bench?:{kg,reps,sets,date},squat?:...,deadlift?:...}}`. `validateTraining(value)->boolean` accepts only bounded known fields (kg1–1000, reps3–12, sets1–20, ISO date). `experiencedRecommendation(ex,prior,date,index,type,training)->{kg,reps,source,date?,range?,note?}` returns source-labelled suggestions. Extend `recommendSet(ex,sessions,date,index,type,training?)`; omitted training preserves current behaviour.

- [x] Write failing tests: synthetic calibration80kg heavy working reference produces buffered bench suggestion; dated source priority; experienced accessory ranges; default novice compatibility; mixed/incomplete/additional rows; one total extra rep per fully completed uniform session; top-of-range load increment; invalid training schema; backup/cloud round trip.
- [x] Run targeted tests; observe failures before implementation.
- [x] Implement pure experienced trials (complete per-exercise table), main-lift factors0.90/0.90/0.85 rounded down to existing increments, date/source selection, and progressive reps/load. Do not add source defaults for the real user.
- [x] Extend profile canonical normalization and separate owner-only settings-document rule validation for the identical training schema; validate every baseline explicitly.
- [x] Run unit and emulator suites; synthetic calibrated profiles must create/update while invalid/unknown/missing-required nested fields fail and old profiles still pass. Commit.

### Task 2: Private settings and workout integration

**Files:** `assets/strength-ui.js` (new), `assets/app.js`, `assets/tracker.css`, `index.html`, `tests/strength-ui.test.mjs` (new).

**Interfaces:** `trainingPanel(profile,today)->HTML`, `readTraining(formData)->training`. Uses Task1 validator and existing `persist()` with the current rendered baseline. A separate form changes only profile.training. Recommendations consume state.profile.training; display optional range/source/note without changing actual inputs.

- [x] Write failing tests for escaped/bounded form values, incomplete baseline rejection, date/weight units, blank-age independence, and loaded settings round trips.
- [x] Add aligned responsive training form and source/guide presentation; adjust recommendation UI so experienced starter ranges are visible. Preserve optional set controls and actual input values.
- [x] Keep ordinary profile saves/training saves separate; restore dirty-state handling and prevent false saved notices on persistence failure. Bump changed asset query versions consistently.
- [x] Run unit tests and syntax/diff checks. Browser-check form/save and all workout days using synthetic device-only preview data; no production personal uploads during QA. Commit.

### Task 3: Review, configuration and release

**Files:** README, programme/recommendation evidence doc, setup notes, local handoff/ledger.

- [x] Document scientific principles separately from trial-weight heuristics, exact generic accessory table and date/progression rules.
- [x] Obtain one fresh-context whole-branch review using the most capable reviewer per execution skill; address important findings with regressions. No repeated final review.
- [ ] Publish additive owner-only rules (same owner/access boundary), verify unchanged public denial, integrate/push master and verify Pages success plus live assets/UI.
- [ ] Enter the user's confirmed calibration through their private live form, preserving current account profile and other data. Verify account identity before saving; no public-source hardcoding. This private configuration is authorized by the approved design and the supplied working sets.
- [ ] Verify live source-labelled recommendations, private settings persistence after reload and Cloud synced. Save screenshot and stop the preview server. Record evidence locally.
