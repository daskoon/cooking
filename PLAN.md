# Plan: Improve Sync Feature, Refine Data & Overhaul Navigation UI

## Overview
This plan addresses the issue of roundup articles being added as recipes, brings synced data to parity with static data, and overhauls the app's navigation and filtering UI based on specific user feedback for a "form follows function" experience.

## Proposed Changes

### 1. Data Hardening & Parity (App.jsx)
- **Stricter Recipe Identification**:
    - Update `syncFromWebsite` to skip URLs containingKeywords (`-ideas/`, `-recipes/`, `-treats/`, etc.).
    - Modify `scrapeRecipeFull` to require a `Recipe` type JSON-LD.
- **Port "Smart Instructions" Logic**:
    - Add JS function `injectIngredientsIntoInstructions` to bold ingredients (`**ingredient**`) in steps.
- **Robust Time Parsing**:
    - Add JS utility `parseISODuration` for accurate `total_minutes`.
- **Automatic Cleanup**:
    - Implement a `cleanupSyncedArticles` function to run once or during sync to remove previously stored non-recipe articles from `localStorage`.

### 2. UI/UX: Sync & Navigation Overhaul (App.jsx)
- **Professional Sync Progress**:
    - Create a `SyncModal` with a real-time progress bar, item counters, and summary of added/skipped items.
    - Remove all `alert()` and `window.location.reload()` calls in favor of state updates.
- **Tag Search & Suggestion (Autocomplete)**:
    - Create a `TagsWindow` modal.
    - Features: Large search field, "popular" tag chips, and a dynamic autocomplete/suggestion list that appears below the search field as the user types.
- **Retail-Style Filter Drawer**:
    - Create a `FiltersDrawer` (sidebar or overlay) that mimics a professional retail site (e.g., Amazon/Wayfair).
    - Features: Categorized sections (Macros, Cook Time, Sort Order), clean toggles, and clear "Clear All" / "Apply" actions.
- **"New" Indicator**:
    - Add a technical "Session New" badge to recipes archived in the current session.

### 3. Visual Polish (index.css & App.jsx)
- **Form Follows Function**: Ensure high-density, technical ledger look across all new windows.
- **Mobile Safe Areas**: Ensure modals and drawers respect device safe-area insets.
- **Transitions**: Use Framer Motion for professional, smooth opening/closing of drawers and modals.

## Step-by-Step Implementation

1. **Step 1: Utility & Cleanup Logic**
    - Implement `parseISODuration`, `injectIngredientsIntoInstructions`, and `cleanupSyncedArticles`.
2. **Step 2: Sync UI Overhaul**
    - Build the `SyncModal` component.
    - Refactor `syncFromWebsite` to drive the modal state and perform the cleanup.
3. **Step 3: Tags Overhaul**
    - Build the `TagsWindow` with search and autocomplete logic.
    - Move existing tag selection into this window.
4. **Step 4: Filters Overhaul**
    - Build the `FiltersDrawer` with categorization and retail-style UI.
    - Move sort and macro toggles into this drawer.
5. **Step 5: Integration & Polish**
    - Wire up the new Header buttons (Tags, Filters, Sync).
    - Apply final polish via `index.css` for the "Archival Ledger" theme consistency.
6. **Step 6: Verification**
    - Verify article filtering.
    - Verify bolding parity.
    - Verify safe-area compatibility on mobile hardware.

## Approved Feedback Points
- Progress shown nicely/professionally.
- Cleanup of existing articles.
- Tags behind a button with search/autocomplete.
- Filters behind a button with retail-site layout.
- "Form follows function" and "Polish" applied throughout.
