# Research: Sync Now Issues & Polish

## Overview
The "Sync Now" feature in the Keto Vault application is currently importing roundup articles/listicles as recipes and lacks the data formatting parity found in the pre-processed static dataset. Additionally, the user experience during and after syncing is minimal.

## Findings

### 1. Articles vs. Recipes (Roundup Imports)
- **RSS Source**: The feed `https://www.lowcarb-nocarb.com/feed/` contains both individual recipes (e.g., "Creamy Chocolate Pie") and roundup articles (e.g., "9 Casserole Ideas...").
- **Current Filtering**: The existing logic in `App.jsx` only rejects a page if it finds fewer than 3 ingredients.
- **Root Cause**: Roundup articles often contain lists of names, tips, or short descriptions that the generic scraper (`[class*="ingredient"]`) misidentifies as ingredients.
- **Identification Patterns**:
    - **URL Patterns**: Roundup articles consistently use plural or generic terms: `-ideas/`, `-recipes/`, `-treats/`, `-hacks/`.
    - **Schema Pattern**: Real recipes always contain a `Recipe` JSON-LD object. Roundups typically do not, or they contain multiple `ListItem` objects without a main `Recipe` schema.
    - **Content Pattern**: Roundups contain phrases like "Get the Recipe:" and multiple level-2 headers (`##`) for different items.

### 2. Data Parity (Pre-processing Gaps)
- **Smart Instructions**: The Python preprocessor (`preprocess_recipes.py`) injects full ingredient names into the instructions using Regex and bolds them (`**ingredient**`). The on-device JS sync does not perform this step, leading to inconsistent instruction quality.
- **Time Parsing**: The static dataset includes a `total_minutes` integer field derived from ISO 8601 durations (e.g., `PT30M` -> `30`). The synced data relies on a simple string replacement which may fail for complex durations (e.g., `PT1H30M`).
- **Nutrition Data**: Synced data might miss nutrition fields if the JSON-LD structure slightly differs from the expected path.

### 3. UI/UX Polish
- **Feedback Mechanism**: Current feedback is via browser `alert()`, which stops the app execution and feels unpolished.
- **Progress Visibility**: There is no progress indicator showing which recipes are being processed or why certain ones were skipped.
- **Reloading**: The app performs a full `window.location.reload()` after sync, which is a harsh transition.

## Recommendations

### Short-Term (Fixes)
- Implement a URL-based exclusion filter in `syncFromWebsite` to skip common roundup patterns.
- Make the `Recipe` JSON-LD requirement stricter in `scrapeRecipeFull`; if no `Recipe` schema is found, it should likely be rejected unless a very high-confidence fallback is matched.
- Add a title check: Recipes are usually singular, roundups are plural.

### Mid-Term (Polish)
- **Logic Port**: Port the ingredient injection logic from `preprocess_recipes.py` to a JS utility function.
- **Better Time Utility**: Create a robust ISO 8601 duration parser in JS to ensure `total_minutes` is always accurate.
- **Sync UI**: Implement a "Sync Status" modal that shows:
    - Total items found in RSS.
    - Progress bar for the 10-item processing limit.
    - List of added recipe titles.
    - Summary of skipped items (e.g., "3 articles skipped").

### Data Integrity
- Ensure `localStorage` keys for synced recipes are merged correctly with the static `recipesData` to avoid UI flickering or duplication.

## Conclusion
The core of the "articles" issue is a loose identification logic that can be fixed with pattern matching and stricter schema validation. The "polish" requires bringing the JS scraping logic up to speed with the Python preprocessor and improving the mobile feedback loops.
