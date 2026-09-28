# TODO: Sync Hardening & Navigation Overhaul

## 🛠️ Phase 1: Logic & Data Parity [backend/logic]
- [x] Implement technical utility functions in `App.jsx`
  - [x] `parseISODuration(duration)`: ISO 8601 to minutes parser.
  - [x] `injectIngredientsIntoInstructions(ingredients, instructions)`: Port bolding logic from Python.
  - [x] `cleanupSyncedArticles()`: Logic to purge non-recipe entries from `localStorage`.
- [x] Refactor `scrapeRecipeFull`
  - [x] Enforce strict JSON-LD `Recipe` type requirement.
  - [x] Integrate `injectIngredientsIntoInstructions` for data parity.
- [x] Refactor `syncFromWebsite` logic
  - [x] Implement URL-based exclusion filter (`-ideas/`, `-recipes/`, etc.).
  - [x] Transition from `alert()`/`reload` to state-driven updates.

## 📱 Phase 2: Professional Sync UI [frontend]
- [x] Create `SyncModal` component
  - [x] High-density "Ledger" aesthetic using JetBrains Mono.
  - [x] Real-time progress bar and status indicator.
  - [x] Results summary (Added vs. Skipped lists).
- [x] Implement "Session New" badge logic
  - [x] Track URLs added in the current session.
  - [x] Add visual indicator to `Card` component for these items.

## 🔍 Phase 3: Navigation & Filtering Overhaul [frontend]
- [x] Create `TagsWindow` (Attribute Index)
  - [x] Large search field with auto-focus.
  - [x] Dynamic autocomplete/suggestion list below search.
  - [x] High-density grid of available tag chips.
- [x] Create `FiltersDrawer` (Retail-Style Sidebar)
  - [x] Move Sort, Macros (Ultra-Low), and Time filters here.
  - [x] Amazon/Retail style layout with clear sections.
  - [x] "Apply" and "Clear All" actions.
- [x] Update Header Component
  - [x] Add "Tags" and "Filters" trigger buttons.
  - [x] Clean up redundant inline parameter chips.

## ✨ Phase 4: Final Polish & Safety [test/ui]
- [x] Apply `safe-area-inset` compatibility across all new modals/drawers.
- [x] Ensure `index.css` global styles (JetBrains Mono, dense tracking) are respected.
- [x] Verify functionality on actual Android hardware (no crashes, smooth transitions).
