# Ironpath tracking upgrade

Goal: implement the user's seven requested enhancements on the existing GitHub Pages app.

Architecture: retain dependency-free ES modules, version-1 browser records and JSON backup compatibility. No database is connected yet. Store records by ISO date so the same data can later be synchronised to Firebase.

- [x] Update core validation and progression for variable sets, optional weekends, legacy RIR/Form fields and optional machine measurements. Verify old and new backups and all-removed sets.
- [x] Add `tracking.js`: measurement definitions, dated aggregation, exercise recommendations from prior actual records with labelled starter examples as fallback. Test missing/zero values, sparse dates, week/month boundaries, variable sets and non-mutation.
- [x] Update workouts: add/remove either set type, undo removal, recommendations per row, seven days, dated session retrieval including partial records. Preserve entered records.
- [x] Update nutrition date retrieval and progress: metric selector, period and aggregation controls, real-date chart, summary changes and accessible table; dated editable machine measurements with explicit units. Separate dietary protein from machine protein.
- [x] Polish responsive controls, cards, navigation and copy across all routes. Update documentation and asset versions.
- [ ] Run unit tests and desktop/mobile browser checks, publish to the existing public repo, verify Pages deployment and live UI.

Review focus: legacy imports remain valid; empty set arrays do not regenerate defaults; missing readings are not plotted as zero; changing dates never overwrites another date; no generated data is counted as actual progress.
