# Keto Recipe App Recovery & Progress

## Status at Sudden Close

We were in **Phase 2 (Architecture)** and moving into **Phase 3 (Sub-Subsystem Generation)**.

- **Scraper (index.js)**: Basic structure implemented using Playwright. Mimics human behavior (scrolling, expanding "See more").
- **Parser (parser.js)**: Basic regex-based parsing for ingredients, instructions, and nutrition.

- **Data (data/)**:

  - `raw_posts.json` exists but currently contains minimal data (likely from a pilot run).
  - `recipes.json` is empty.

## Immediate Recovery Steps

1. [ ] **Verify Scraper**: Run `node scraper/index.js` to ensure it still navigates and extracts correctly.
2. [ ] **Verify Parser**: Run `node scraper/parser.js` to see if it processes existing raw data.
3. [ ] **Identify Gaps**: The scraper needs to be more robust with Facebook's dynamic selectors.

## Notes for Future Recovery

- **Checkpointing**: In `index.js`, we should save progress incrementally (e.g., every 5-10 posts) instead of only at the end.
- **State File**: Create a `scraper_state.json` to store the last scrolled position or last timestamp processed.
- **Error Handling**: Add `process.on('SIGINT')` or `process.on('exit')` hooks to save whatever is in memory before the process dies.

