## NewsBreak Verified Filter (Chrome Extension)

Hide posts created by verified publishers on `newsbreak.com`, while keeping ads visible.

### Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode (top-right).
3. Click "Load unpacked" and select this folder.
4. Visit `https://www.newsbreak.com/` and refresh.

### How it works

- The content script hides cards that include labels like "verified" or "verified publisher".
- Heuristics avoid hiding ads/sponsored elements.

### Notes

- If site markup changes, update selectors/keywords in `content.js`.




