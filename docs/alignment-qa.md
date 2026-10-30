# Alignment regression checks

The 2026-10-30 alignment audit covers all six routes at 320, 390, 640, 641, 650, 659, 768, 900, 901, 1024, 1250 and 1440 CSS pixels. Run the exported read-only function in `tests/alignment-check.js` through a browser's evaluate API after each route loads. On Progress, open the optional InBody fields before checking.

Assertions cover paired input positions/heights, date/Today-button edges, numeric card rows, report values, workout content containment, workout heading/input centres, native date style invariants and horizontal page overflow. Table scrolling is intentional. The check works with both blank and populated records.

Native Safari needs a separate visual check: compare empty and filled date inputs against text/number controls at the same size. An equal outer height alone does not prove the native date text is centred. Dates use a 50px border-box, 22px line-height and balanced 13px block padding; the selector must override the more specific shared input reset. Keep the native date editor and keyboard/picker behaviour.

Verified locally: 72 responsive cases passed with populated check-ins and expanded optional fields; Safari's filled/empty dates were compared visually with reference controls. Existing data/calculation tests are unchanged by the layout fix.
