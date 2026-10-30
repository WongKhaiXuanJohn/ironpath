# Ironpath: private Firebase saving

## Purpose and existing decisions

The user wants free, persistent records that can be retrieved by date across devices, with a public GitHub repository and no photo storage. Firebase project `ironpath-f62d5` now exists on Spark. The live site remains GitHub Pages. Today's application stores a version-1 profile, dated workouts, nutrition totals and dated body-composition readings in browser storage, with JSON export/import.

This document proposes the next implementation stage; project creation alone has not connected any records to Firebase.

## Approach

Use Firebase Authentication with Google sign-in and Cloud Firestore Standard edition. This extends the existing static JavaScript application without requiring an additional application server. Firebase is the service selected in the conversation. Retaining browser-only storage would not provide automatic cross-device retrieval. A separate backend adds another service to manage and is unnecessary for the proposed per-account database access.

Keep the free Spark plan and existing website address. No billing account, photo upload, analytics, Gemini feature, SMS login or administrative credentials in the public repository.

## User experience

- Add a sign-in and storage section to Your profile. The header shows device-only, connecting, pending changes, synced, offline or an actionable error. Never label unacknowledged writes as synced.
- Signed-out use continues to save on the device. Signing in loads the selected account's saved data and enables automatic saving for changes made in that account.
- Existing guest records stay separate and are never uploaded merely because sign-in succeeded. Offer an explicit migration action explaining that profile, workouts, nutrition and body-composition values will be copied to this user's Ironpath Firebase account. Show counts and preserve cloud records on date conflicts unless the user explicitly chooses replacement.
- A first sign-in to an empty account should clearly explain how to copy existing device records. The device copy remains available and exportable.
- Sign-out returns to device-only data. Another account must never display or upload the previous account's records. Account caches and unsent changes are keyed by UID.
- Dates keep their current defaults and selection behavior. Previous workouts and readings, graphs, recommendations, variable sets, archived weekend logs and existing JSON backup compatibility remain functional.

## Storage and synchronization

Use per-user paths such as `users/{uid}/records/{recordId}`, with separate documents for profile, dated workout sessions, nutrition days and body-composition days. Avoid one ever-growing document for all history. Preserve the existing in-memory version-1 model through a storage adapter.

Persist local account changes before network writes. Debounce typing and upload only changed records. Retain a durable account-specific outbox for failed/offline writes. Distinguish queued local changes from server-confirmed completion. Retry after reconnection and the correct account's sign-in; never retry an old account's writes using a new account.

Apply cloud updates without resetting a focused draft or overwriting unsent edits. Resolve concurrent edits at record granularity with a visible conflict/review state; do not silently discard unsent local edits. Cloud deletion or a backup restore must propagate deliberately, without deleting unrelated remote records. The implementation should offer an explicit account-wide restore confirmation if restore replaces cloud data.

The builder chooses SDK version, document IDs, revision markers, batching, client validation, cache representation and details of conflict UI, while preserving these guarantees. Start with one reading per local date, matching the current measurement editor. Preserve legacy imported fields even if hidden in current UI. Reject malformed cloud data rather than interpreting it as HTML or partially overwriting valid local records.

## Security

Approved by the user on 31 October 2026: cloud saving is restricted to the owner's account. Database rules must additionally require the approved owner UID; anonymous and other authenticated accounts are denied. Establish the owner through the user's own Google sign-in rather than publishing a personal email address or guessing an identity. Other sign-ins may still create Firebase Authentication accounts unless separately blocked; the protection promised here is database access restriction. The shared-account alternative was not selected.

Create Firestore with deny-by-default rules, in an appropriate nearby region (Singapore is the proposed choice for this Malaysia-based user). Client access requires Firebase Authentication and an exact path UID match. Validate allowed document shape, identifiers, field types and sensible sizes/ranges in rules where supported, with stricter complete application validation on read and import. Users cannot list or access another user's records. Unauthenticated requests are denied.

Add the actual GitHub Pages hostname as an authorized Firebase Auth domain. Use the normal Firebase web SDK and popup login suitable for a static host; do not collect passwords in Ironpath. Keep service-account keys and admin tokens out of source, deployment and browser code. Firebase's public web configuration may be committed; it does not authorize database access.

Do not upload any existing personal readings or browser records while configuring or testing. Use synthetic fixtures and emulator accounts for automated tests. User-driven migration remains the point at which existing personal records are sent to Firebase.

## Verification and release

Test storage conversion and round trips, account isolation, offline persistence/retry, migration and duplicate-date handling, concurrent edits, restore/delete behavior and truthful status indicators. Use Firestore rules tests to verify anonymous access and other-user access fail, own valid access succeeds and malformed writes fail. Verify the existing suite still passes.

Check sign-in UI and storage status on desktop/mobile in a browser. Actual Google account consent may require the user's own sign-in action; report any portion that cannot be exercised. Deploy only the integrated implementation with correct production rules, and verify the GitHub Pages release and Firebase configuration. Preserve the current live version until the replacement is ready.

## Completion

Complete means a correctly configured free Firebase database and authentication provider, private tested rules, deployed account-aware syncing, explicit optional migration, retained backups and clear verification results. Merely registering an app or adding configuration does not count as connected cloud saving.
