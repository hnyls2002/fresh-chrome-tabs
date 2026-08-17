# Fresh Tabs

Personal Chrome extension. Tab housekeeping from a small panel.

## What it does

Closes duplicate tabs. Two tabs are duplicates when their URLs match after
normalization: `#hash` ignored, tracking params (`utm_*`, `fbclid`, ...)
stripped, param order and trailing slash ignored.

Click the toolbar icon to open the panel. It lists what would close before you
close anything:

- **Close N duplicates** -- current window
- **All windows (+N)** -- also the duplicates in every other window

Of each duplicate group one tab survives: pinned first, then active, then
leftmost. Pinned tabs are skipped entirely unless you opt in, and `chrome://` /
`file://` / `about:blank` never take part.

**Settings** (top-right of the panel, or right-click the icon -> Options) holds
the matching rules -- global switches plus per-site overrides, picked from the
sites you have open rather than typed. That page previews a run too, live as you
edit the rules.

## Install

No build step -- the repo is the extension.

1. Open `chrome://extensions` (paste it in the address bar; chrome:// links are
   not clickable).
2. Turn on **Developer mode**.
3. **Load unpacked** -> select this directory.

After editing any file, hit the reload icon on the extension card.
