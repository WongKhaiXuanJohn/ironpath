# Private Firebase saving

## Configuration and release gate

Project: `ironpath-f62d5`, Spark. Firestore Standard `(default)` is in `asia-southeast1` (Singapore). GitHub Pages remains the website host; no Firebase Hosting, Storage, Functions or billing account is needed.

The source implementation supports the behavior below. **Do not consider setup complete or release this feature until Google sign-in, authorized domains, verified owner UID and matching production rules are configured and verified.** At preparation time the public web configuration is registered, but the owner UID is deliberately null and production database access remains deny-all.

`assets/firebase-config.js` holds only Firebase's public web identifiers and the approved Firebase Auth UID. These are not administrative credentials. Never add service-account JSON, admin tokens, passwords or personal fitness readings to source.

Enable only the Google sign-in provider. Set the public name to Ironpath and use a support email explicitly approved by its owner because Google presents that address during authentication. Authorize `wongkhaixuanjohn.github.io`. Any localhost authorization used to establish identity is development-only and should be removed after verification.

Establish the owner through their Google sign-in and verify the visible identity/UID. Set exactly that UID in both `assets/firebase-config.js` and `firestore.rules`. Do not guess it or temporarily open all database access. Other authenticated accounts may exist in Firebase Authentication, but the database rules deny all of their access, even under their own UID paths.

## Records and privacy

- Signed-out records remain under the existing browser key `ironpath-v1`.
- The approved account uses a separate UID-keyed device cache/outbox; a different account cannot load or write it through the app.
- Firestore documents live under `users/{uid}/records/{recordId}`. Profile, workout session, nutrition day and body-composition day are separate documents.
- Changes persist locally before upload. Transactions compare revisions; remote edits do not silently replace unsent edits. Conflicts offer explicit device/cloud choices.
- Physical client deletes are denied. Tombstones propagate removed dated records while preserving synchronization identity.
- Account confirmation and a server-confirmed initial snapshot precede cloud writes. Never label pending, failed or offline writes as synced.
- Existing guest records upload only through the explicit migration confirmation. Copying or importing preserves existing cloud dates; imports do not silently erase unrelated remote records. The original guest copy remains after sign-out.
- All values are validated by the application. Rules additionally enforce owner/path UID, allowed document kinds/fields, revision increments, timestamp integrity and practical profile/nutrition/measurement bounds. Session rules validate shape and map bounds; complete dynamic set validation runs in the application.
- No personal fitness records should be uploaded during setup or tests. Use synthetic records only in the local emulator. The user controls any migration of their actual readings.

## Verification

```sh
npm ci
npm test
npm run test:rules
```

Use Java 21+ (`JAVA_HOME` may point to a locally installed runtime). The rules command runs a local **demo-ironpath** emulator on `127.0.0.1:8086`; it does not use production data. The emulator fixtures use the UID literal from the rule template so both the prepared and final owner rules can be exercised.

Test anonymous access, another account (including its own path), correct owner access, malformed writes, forged revisions/timestamps, full readings, maximum supported workouts, tombstones and forbidden physical deletes. Check offline reloads, late write acknowledgements (including undo while writing), account changes during confirmation, drafts retained across chart renders, storage failure recovery and explicit migration. Supported legacy backups normalize numeric strings and missing defaults before queueing; unsupported fields are rejected without removing the original device copy. Migration shows add/keep counts before upload. In a browser verify the sign-in interface and sync status on phone/tablet/desktop sizes.

The development dependency overrides select patched compatible transitive versions of gRPC, OpenTelemetry Core and gaxios's UUID dependency. They are not bundled into the browser application. Verify tests after updating them; do not apply a forced downgrade to an obsolete Firebase SDK just to change audit output.

## Safe operation

Keep the project on Spark to remain within its no-cost limits. Quota exhaustion can pause cloud operations; pending changes must stay in the device outbox and the UI must report the failure. Export JSON backups as an additional copy. Clearing browser data before pending writes reach the server can remove the only persistent copy of those pending edits.

The owner-only restriction protects database data, not the secrecy of the website source or public Firebase configuration. It is not a promise that the sign-in endpoint cannot receive other registrations or that service limits cannot be exhausted.
