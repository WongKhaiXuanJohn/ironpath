# Ironpath

A responsive 52-week gym tracker with an editable profile, personalized nutrition targets, workout logging, check-ins and a phase roadmap. Built with HTML, CSS and native JavaScript. No build or paid hosting required.

## Use

Open the website, choose **Your profile** (the top-right avatar on mobile) and enter your age, height, weight, activity level and goal. Nutrition targets preview instantly; save to apply. Profile age starts blank because it must not be guessed.

- **Workouts:** fixed Monday–Thursday core programme, optional Friday, weekends off. Log actual load, reps and RIR; warm-ups are separate. Mark good form and completion per set. Double progression suggestions require all prescribed working sets at the rep ceiling, consistent load, good form and at least two RIR. Trial loads are examples, not verified prescriptions.
- **Nutrition:** estimated calories and macros update from profile details. Optional manual calorie override; optional whey planning at 24 g protein per scoop. Daily totals include meals and supplements.
- **Progress:** body-weight, waist and optional body-fat check-ins; actual weight chart, recent workout history and seven-day average. Weight check-ins can update the profile and targets.
- **Roadmap:** four adaptive 13-week phases, with a configurable start date.

## Data privacy and backups

All entered data lives in `localStorage` in the current browser on the current origin. There is no cloud sync, login, analytics or server database. Source code and the standard exercise programme are public; your logged records are not committed or uploaded. Export JSON backups from **Your profile** regularly. Import on another device to transfer data. Local-preview data and the live site's data are separate. Clearing browser data can erase entries. Keep exported backups private.

Google Fonts loads optional typography from Google; system font fallbacks work when offline. No user-entered information is included in font requests.

## Nutrition method

Mifflin–St Jeor: `10 × kg + 6.25 × cm − 5 × age + 5` for male, or `−161` for female. Multiply by selected activity factor (1.2, 1.375, 1.55 or 1.725); round maintenance to 10 kcal. Goal adjustments: −300 kcal cut, 0 maintenance, +150 lean gain. Protein follows the programme at 2.05 g/kg, fat at 0.9 g/kg, carbohydrates fill remaining energy. All are starting estimates for adults; assess actual two-to-three-week weight trends, performance and recovery. Macro rounding may cause a few calories of difference.

References: [Mifflin et al.](https://pubmed.ncbi.nlm.nih.gov/2305711/), [ISSN protein position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/). The programme's protein factor is a chosen starting target, not a universal requirement. This tracker is general fitness guidance, not individualized clinical advice.

## Local development

Requires Node 18+ for tests and Python 3 for a local server:

```sh
npm test
npm start
```

Open `http://localhost:8766`. No dependency installation needed. Do not open `index.html` directly with `file://`; ES modules need HTTP.

## Hosting

GitHub repository **Settings → Pages → Deploy from a branch**, select the default branch and `/ (root)`, then save. `.nojekyll` serves the static assets directly. All application links are relative and compatible with a GitHub Pages project subpath.
