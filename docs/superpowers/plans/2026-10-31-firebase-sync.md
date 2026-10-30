# Private Firebase Saving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy owner-only cloud saving without uploading existing guest records automatically or losing offline edits.

**Architecture:** Keep static GitHub Pages and the version-1 application model. A pure record store manages dated documents, local account caches, outbox and revision conflicts; a Firebase adapter handles authentication, listening and transactions; a small profile panel provides account and migration controls.

**Tech Stack:** ES modules, Firebase JavaScript SDK 13.1.0, Cloud Firestore Standard, Google Authentication, Node tests and Firestore emulator rules tests.

**Spec:** `docs/superpowers/specs/2026-10-31-firebase-sync-design.md`

## Global Constraints

- Firebase project `ironpath-f62d5`, Spark, no billing account, photos, analytics or admin credentials.
- Owner-only database access; anonymous/other users denied. Initial rules deny all until owner identity is established.
- Explicit migration of existing device records; unchanged website origin and JSON backup compatibility.
- Each document represents a profile, workout day/template, nutrition day or measurement day; tombstones represent deletions.
- Never show an unacknowledged write as synced. Preserve edits on auth changes, network errors and conflicts.

## Review Focus

- An edit made while an earlier write is in flight remains queued after its predecessor is acknowledged.
- A remote edit arriving during a form draft does not reset that draft or silently overwrite it on submit.
- Sign-out/account switching during a write cannot move or display one user's records in another account.
- Guest migration and backup imports cannot silently replace conflicting cloud dates or upload without a deliberate action.
- Malformed records, forged revisions and access by another authenticated account are rejected.

## Task 1: Record model and durable synchronization state

**Files:** Create `assets/cloud-records.js`, `tests/cloud-records.test.mjs`.

**Interfaces:** `stateToRecords(state) -> map`, `recordsToState(records,initial) -> state`, `RecordStore({storage,key,initial,uuid})` with `view()`, `edit(next,view)`, `receive(records)`, `begin(id)`, `ack(mutation,record)`, `resolve(id,choice)`, `mergeGuest(state)`, `pending()` and `status()`.

- [ ] Write failing tests for round-trip archived fields, invalid cloud records, persisted pending edits, acknowledging an older in-flight edit, cross-device revision conflict, tombstones and merge-only migration.
- [ ] Run `node --test tests/cloud-records.test.mjs`; verify missing module/behavior failures.
- [ ] Implement bounded record validation via the existing complete backup validator; persist before scheduling network activity. Keep remote and local revisions separate and expose explicit conflict choices.
- [ ] Run tests, then `npm test`; expect all pass. Commit this task.

## Task 2: Firebase adapter and security rules

**Files:** Create `assets/cloud-sync.js`, `assets/firebase-config.js`, `firestore.rules`, `firebase.json`, `.firebaserc`, `tests/rules/firestore.test.mjs`; modify `package.json`, `.gitignore` as needed.

**Interfaces:** `createCloudSync({initial,guestKey,onChange}) -> {ready,view,save,signIn,signOut,migrate,resolve,summary}`. Uses Task 1 store and Firebase Auth/Firestore transactions. Public configuration holds web app identifiers and approved owner UID; never administrative credentials.

- [ ] Add emulator tests first for deny-anonymous, deny-other-account, owner access, wrong path UID, invalid document shape, forbidden physical delete, correct next revision and revision conflict rejection. Run and observe failures against initial deny-all rules where owner success is expected.
- [ ] Implement rules and adapter. Revisions advance through transactions; listener errors and quota failures preserve outbox. SDK imports fail gracefully to device-only mode. Account-specific caches only load after identity verification. Backups in cloud mode merge rather than delete unrelated documents.
- [ ] Configure free Firestore in Singapore and Google provider/domain through authenticated Firebase Console. Register only the web app needed for this site. Keep deny-all rules until the owner signs in and its UID can be verified.
- [ ] Run unit and emulator suites. Commit implementation and rules without an unverified owner identity.

## Task 3: Account UI and application integration

**Files:** Create `assets/cloud-ui.js`, `assets/cloud.css`; modify `assets/app.js`, `index.html`, `README.md`.

**Interfaces:** Cloud UI receives escaped account/status data and invokes Task 2 methods; `persist()` passes version-1 state plus its rendered baseline to the adapter. At explicit render boundaries the application adopts the adapter's latest view. Asynchronous status changes update only the account/status elements while a form is active.

- [ ] Add behavioral adapter tests for reload after offline edits, auth changes during in-flight requests, refusal to upload guests on sign-in, migration duplicate counts, invalid import and local-only fallback.
- [ ] Implement Google sign-in/out, owner restrictions, meaningful sync states, explicit migration confirmation naming profile/workouts/nutrition/body-composition data and Firebase destination, conflict resolution and retained JSON exports. Change cloud backup restore to a merge with clear copy; keep local backup replacement behavior.
- [ ] Verify existing workout/date/measurement forms and charts remain functional. Browser test account panel, blocked/non-owner behavior, pending status and mobile layout with synthetic data only.
- [ ] Run the full suite. Commit this task.

## Task 4: Owner verification, review and publication

**Files:** Final verified configuration/rules and `docs/firebase-setup.md`.

- [ ] Complete the user's Google sign-in without collecting credentials; obtain its UID from visible account UI/Authentication console. If Google requires a user-only interaction, request only that step and continue independent tests/review meanwhile.
- [ ] Deploy owner-only rules and matching public owner UID configuration. Verify public rules deny guest/other-user access with emulator tests and an unauthenticated production request. Never upload existing fitness records during verification.
- [ ] Request one fresh-context whole-branch review on the most capable available model; address important findings with regression tests and run full suites.
- [ ] Publish through the existing GitHub repository and Pages source. Verify completed deployment and live account interface; preserve deployment history except a demonstrably stale failed record if repair is needed again.
- [ ] Save a live screenshot, document tested guarantees and any user-only sign-in/migration work, and stop owned local servers.
