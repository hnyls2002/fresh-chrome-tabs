# Fresh Tabs

Personal Chrome extension. Keyboard-first tab housekeeping, no popup to open.

## What it does

Closes duplicate tabs. Two tabs are duplicates when their URLs match after
normalization: `#hash` ignored, tracking params (`utm_*`, `fbclid`, ...)
stripped, param order and trailing slash ignored.

| Key | Action |
| --- | --- |
| `Alt+Shift+D` | Close duplicates in the current window |
| `Alt+Shift+A` | Close duplicates across all windows |
| `Alt+Shift+Z` | Undo the last run |

`Alt` is `Option` on macOS. Clicking the toolbar icon does the same as
`Alt+Shift+D`. Rebind at `chrome://extensions/shortcuts`.

Of each duplicate group one tab survives: pinned first, then active, then
leftmost. Pinned tabs are skipped entirely unless you opt in, and `chrome://` /
`file://` / `about:blank` never take part.

Right-click the icon -> **Options** for the matching rules -- global switches
plus per-site overrides, picked from the sites you have open rather than typed.
The page previews exactly what a run would close, live as you edit.

## Install

No build step -- the repo is the extension.

1. Open `chrome://extensions` (paste it in the address bar; chrome:// links are
   not clickable).
2. Turn on **Developer mode**.
3. **Load unpacked** -> select this directory.

After editing any file, hit the reload icon on the extension card.
