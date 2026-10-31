# Ironpath

A responsive 52-week gym tracker with an editable profile, personalized nutrition targets, workout logging, check-ins and a phase roadmap. Built with HTML, CSS and native JavaScript. No build or paid hosting required.

## Use

Open the website, choose **Your profile** (the top-right avatar on mobile) and enter your age, height, weight, activity level and goal. Nutrition targets preview instantly; save to apply. Profile age starts blank because it must not be guessed.

- **Workouts:** Monday–Thursday core programme with optional Friday, Saturday and Sunday. Add/delete warm-up and working sets (up to 20 per exercise); undo the last removal. RIR/Form are no longer collected. Per-set suggestions use previous actual records when available, otherwise clearly labelled starter examples. Actual fields start empty; suggestions never count as completed work. Next-load suggestions use all selected working sets, and remain conditional on controlled technique and recovery. The journal includes partial and completed sessions with date filters.
- **Nutrition:** estimated calories and macros update from profile details. Optional manual calorie override; optional whey planning at 24 g protein per scoop. Daily totals include meals and supplements.
- **Progress:** body weight, PBF, skeletal muscle mass, body protein mass (kg), basal metabolism and waist. Optional InBody readings include fat mass, total body water, BMI, ECW ratio, score, visceral fat and waist–hip ratio. Each metric has its own chart with custom dates, 30/90/365-day or all-time ranges, and daily readings or weekly/monthly averages. Missing readings are omitted, never treated as zero. Weeks begin Monday. A dated report and journal allow previous records to be reopened and edited. Updating current profile weight is opt-in.
- **Roadmap:** four adaptive 13-week phases, with a configurable start date.

### Programme review

Saturday now provides optional supported machine legs, calves, abs and easy cycling. Sunday provides easy elliptical conditioning and standing mobility, protecting Monday's upper-body work. Friday remains optional shoulders/arms/cardio. Rest remains valid; the goal is not seven hard lifting days. Previously saved weekend sessions reopen with their original exercise template.

The research review and full-week volume audit are in [the programme review](docs/programme-review-2026-10-30.md), with an evidence summary in the website's 52-week plan. The exact split and trial loads are programming choices, not a clinically validated personal prescription.

## Data privacy and backups

New workout, nutrition and body-composition entries default to today's local date. The date selectors load earlier entries; **Today** returns to the current date. The app refreshes its date at midnight or on returning to the tab. Dates are stored as ISO `YYYY-MM-DD` keys for device storage and private cloud records.

Version-1 backups remain compatible, including archived RIR/Form values. These old fields are retained in imported records but no longer affect progression. The public repository includes no personal readings from reference photos.

Signed-out records stay in browser storage. Google sign-in connects the approved owner's private Firestore account; other accounts have no database access. Account records save to a device cache/outbox first and then sync through revision-checked transactions. The status distinguishes pending, offline, conflicted and server-confirmed changes. Signing in does not upload existing device records: **Upload this device’s records** is a separate confirmation. Cloud imports keep existing cloud dates; device-only backup restore replaces device records. Source code and Firebase web identifiers are public; fitness records and administrative credentials are not in the repository. Export JSON backups regularly, especially before clearing browser data. Local-preview and live-site records are separate. There is no analytics or photo upload. See [Firebase setup and verification](docs/firebase-setup.md).

Google Fonts loads optional typography from Google; system font fallbacks work when offline. No user-entered information is included in font requests.

## Nutrition method

Mifflin–St Jeor: `10 × kg + 6.25 × cm − 5 × age + 5` for male, or `−161` for female. Multiply by selected activity factor (1.2, 1.375, 1.55 or 1.725); round maintenance to 10 kcal. Goal adjustments: −300 kcal cut, 0 maintenance, +150 lean gain. Protein follows the programme at 2.05 g/kg, fat at 0.9 g/kg, carbohydrates fill remaining energy. All are starting estimates for adults; assess actual two-to-three-week weight trends, performance and recovery. Macro rounding may cause a few calories of difference.

References: [Mifflin et al.](https://pubmed.ncbi.nlm.nih.gov/2305711/), [ISSN protein position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/). The programme's protein factor is a chosen starting target, not a universal requirement. This tracker is general fitness guidance, not individualized clinical advice.

## Local development

Requires Node 24.12+ for Firebase development tests (a local Node runtime is installed with dev dependencies), Java 21+ for the Firestore emulator, and Python 3 for a local server:

```sh
npm ci
npm test
npm run test:rules
npm start
```

Open `http://localhost:8766`. The published website needs no build; dependencies are for local testing only. Do not open `index.html` directly with `file://`; ES modules need HTTP.

## Hosting

GitHub repository **Settings → Pages → Deploy from a branch**, select the default branch and `/ (root)`, then save. `.nojekyll` serves the static assets directly. All application links are relative and compatible with a GitHub Pages project subpath.
