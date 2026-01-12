# LaundryBrain-Hero
Laundry Business Financial Viability

## Recent changes (unreleased)
- Added import guards to `importJSON()` to prompt before importing empty `washerDefs`, `dryerDefs`, or `equipCosts` (prevents accidental data wipes).
- Added **Restore defaults** button to the Equipment section and `resetEquipmentDefaults()` to restore initial equipment and cost presets.
- Introduced testable UI helpers in `ui_helpers.js` and unit tests `test_ui_import_restore.js` covering import/restore behaviors.

## How to run tests
- Node-based tests (no test runner required):
  - `node test_core_unit.js`
  - `node test_snapshot.js`
  - `node test_ui_import_restore.js`

## Notes
- The import guard uses `confirm()` in the browser; `ui_helpers.applyImportedData` accepts a `confirmFn` for testing.
- If you want these changes pushed to a branch and a PR opened, run the included script or ask me to push them.
