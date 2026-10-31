# Private strength calibration and adaptive recommendations

## Intent

Replace novice-only fallback suggestions for experienced lifters with their own confirmed working-set capability and subsequent exercise-specific performance. Preserve the existing physique goal, nutrition calculations, workout schedule, editable sets, backups and owner-only Firebase access.

## Chosen approach

The user selected **private strength settings plus adaptive recommendations**. The user also requested explicit starting-weight recommendations for unfamiliar exercises. Provide clearly labelled experienced-lifter trial guides; scaling every accessory from a compound lift is not a validated personal prescription. Continue using the existing static JavaScript application and private Firestore account, without a new service or dependency.

## Behaviour

- Add a separate training-settings form under Your profile, independent of whether nutrition-profile age has been entered. Training experience selects starter examples or experienced calibration.
- Let the user record a current working-set load, reps, number of sets and effective date for bench press, squat and conventional deadlift. Barbell weights mean total weight including the bar. Preserve blank/unconfigured baselines.
- Store actual personal calibration values only in the private account/device state. Do not put the user's strength numbers in public source, defaults, documentation, fixtures or URLs. Saving the form is the deliberate action that syncs these settings.
- Use completed exercise-specific sessions as the primary source after calibration; a more recent explicit calibration replaces older history. Ignore future-dated history/calibration when viewing past workout dates. A date with no applicable calibration remains uncalibrated.
- Experienced lifters receive explicit, clearly labelled starting trial weights/ranges for accessories with no usable history, plus a short calibration instruction. These are coaching defaults, not scientific predictions from the main lifts. Use equipment-specific conventions: dumbbells per hand, cables per side, and machine/stack resistance as displayed. Machine values need calibration on the actual equipment. Bodyweight, assistance, cardio and mobility retain clear conventions.
- For heavy main-lift baselines, begin with a modest buffer: approximately 90% of the reported working load for bench/squat and 85% for deadlift, rounded to a practical barbell increment. These factors are conservative coaching starting rules, not percentages of a measured 1RM. Bench retains 6–8 reps, squat 4–6 and deadlift 3–5. Start at the lower rep target and show the full guide. Preserve normal editable programme set counts; reported capability does not automatically add sets or prescribe maximal effort.
- For a usable, fully completed same-load session, suggest adding at most one total rep across its existing working sets. Once all selected working sets reach the top of the guide, suggest the existing small equipment-appropriate load increment and restart at the lower rep target. Mixed-load/incomplete sessions do not trigger a blanket increase. Suggestions never populate actual logs or mark work complete.
- Baselines must describe repeatable working sets, not historical PRs. Do not convert them into a claimed measured 1RM. When the recorded rep count is incompatible with a useful heavy-set reference, request calibration rather than presenting an unsupported exact conversion. Show the basis and make all actual loads/reps editable.
- Warm-up suggestions use the applicable working load; remain optional, editable and clearly labelled. Keep the Tuesday squat/deadlift fatigue/emphasis guidance; do not automatically increase weekly volume.
- Label the recommendation source, such as private calibration, recent completed session, or needs calibration, so the user can assess the basis.

## Experienced starter guides

Use modest explicit ranges for each loaded exercise, with equipment rounding and no forced increase just because the user is experienced. Illustrative generic defaults: incline dumbbell press 20–24 kg per hand, lateral raises 6–8 kg per hand. Record the complete per-exercise table and the practical nature of these choices in implementation documentation. Current/past completed sessions supersede applicable starting trials, so the website learns the actual machine and exercise.

## Data and security

Add an optional, strictly validated training-settings object to the existing profile schema. Old profiles/backups with no training object remain valid and retain current behaviour. Canonical conversion stores training separately at `users/{uid}/settings/training` with an independent revision. The legacy profile/records collection keeps its original schema so older clients remain compatible. Account initialization waits for both initial server snapshots. Extend owner-only Firestore validation for the separate document, including valid calendar dates. Numeric limits, supported lift IDs, ISO dates and safe defaults are validated before saving. Nutrition-form saves must preserve training settings. Existing documents are not overwritten or migrated automatically by deployment.

## Scientific basis and limits

ACSM's 2026 overview supports individualized progressive resistance training; heavier loading is useful for maximal strength, while hypertrophy can occur across loading ranges with sufficient training stimulus. Retain multiple sets and the existing balanced programme. The gradual rep-then-load rule is a practical implementation, not a claim that research validates a unique algorithm or machine-weight ratio. Training years alone do not determine a suitable isolation load. No RIR/Form logging is reintroduced.

Sources:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
- https://pubmed.ncbi.nlm.nih.gov/37414459/

## Verification and release

Test old-profile compatibility, private settings round trips, actual calibrated recommendations, source/date priority, gradual rep progression, added/deleted/mixed/incomplete sets, experienced accessory trials, absence of unsupported cross-exercise scaling and invalid values. Test the final Firestore rules in the emulator with synthetic settings. Browser-check the new form and recommendations on desktop/mobile. Publish through the existing GitHub Pages repository after verification. Personal settings remain a separate private save action; no real fitness data is uploaded during tests.
