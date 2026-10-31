# Private strength calibration and adaptive recommendations

## Intent

Replace novice-only fallback suggestions for experienced lifters with their own confirmed working-set capability and subsequent exercise-specific performance. Preserve the existing physique goal, nutrition calculations, workout schedule, editable sets, backups and owner-only Firebase access.

## Chosen approach

The user selected **private strength settings plus adaptive recommendations**. Generic higher starter examples would remain guesses; scaling every accessory from a compound lift is not a validated personal prescription. Continue using the existing static JavaScript application and private Firestore profile, without a new service or dependency.

## Behaviour

- Add a separate training-settings form under Your profile, independent of whether nutrition-profile age has been entered. Training experience selects starter examples or experienced calibration.
- Let the user record a current working-set load, reps, number of sets and effective date for bench press, squat and conventional deadlift. Barbell weights mean total weight including the bar. Preserve blank/unconfigured baselines.
- Store actual personal calibration values only in the private account/device state. Do not put the user's strength numbers in public source, defaults, documentation, fixtures or URLs. Saving the form is the deliberate action that syncs these settings.
- Use completed exercise-specific sessions as the primary source after calibration; a more recent explicit calibration replaces older history. Ignore future-dated history/calibration when viewing past workout dates. A date with no applicable calibration remains uncalibrated.
- Experienced lifters receive no invented accessory load when that exercise has no usable history. Show an actionable request to log an appropriate working load within the rep guide. Bodyweight, assistance, cardio and mobility keep clear load conventions.
- Main-lift recommendations begin at the confirmed working load/reps when these fit the programme range. Bench uses 5–8 reps; squat retains 4–6 and deadlift 3–5. The normal programme set counts stay editable; reported capability does not automatically add sets or prescribe maximal effort.
- For a usable, fully completed same-load session, suggest adding at most one total rep across its existing working sets. Once all selected working sets reach the top of the guide, suggest the existing small equipment-appropriate load increment and restart at the lower rep target. Mixed-load/incomplete sessions do not trigger a blanket increase. Suggestions never populate actual logs or mark work complete.
- For a baseline whose reps fall outside the guide, explain that a load needs calibration for that range rather than presenting an unsupported exact load conversion. Historical PRs do not set training loads.
- Warm-up suggestions use the applicable working load; remain optional, editable and clearly labelled. Keep the Tuesday squat/deadlift fatigue/emphasis guidance; do not automatically increase weekly volume.
- Label the recommendation source, such as private calibration, recent completed session, or needs calibration, so the user can assess the basis.

## Data and security

Add an optional, strictly validated training-settings object to the existing profile schema. Old profiles/backups with no training object remain valid and retain current behaviour. Extend canonical conversion and owner-only Firestore field validation together. Numeric limits, supported lift IDs, ISO dates and safe defaults are validated before saving. Nutrition-form saves must preserve training settings. Existing documents are not overwritten or migrated automatically by deployment.

## Scientific basis and limits

ACSM's 2026 overview supports individualized progressive resistance training; heavier loading is useful for maximal strength, while hypertrophy can occur across loading ranges with sufficient training stimulus. Retain multiple sets and the existing balanced programme. The gradual rep-then-load rule is a practical implementation, not a claim that research validates a unique algorithm or machine-weight ratio. Training years alone do not determine a suitable isolation load. No RIR/Form logging is reintroduced.

Sources:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
- https://pubmed.ncbi.nlm.nih.gov/37414459/

## Verification and release

Test old-profile compatibility, private settings round trips, actual calibrated recommendations, source/date priority, gradual rep progression, added/deleted/mixed/incomplete sets, unknown accessories and invalid values. Test the final Firestore rules in the emulator with synthetic settings. Browser-check the new form and recommendations on desktop/mobile. Publish through the existing GitHub Pages repository after verification. Personal settings remain a separate private save action; no real fitness data is uploaded during tests.
