# Fresh Tabs

Keyboard-first tab housekeeping for Chrome. Keeps a working set of tabs tidy
without a panel to manage, and without ever touching page contents.

## Features

- **Close duplicate tabs** -- `Alt+Shift+D`, with per-site URL matching rules
  and one-key undo. This is the whole of v0.1.

More to come; the layout below has the seam they plug into.

## Design

Four decisions drive the whole thing:

- **The shortcut is the interface.** There is no popup. `Alt+Shift+D` closes the
  duplicates in the current window; clicking the toolbar icon does the same. No
  menu to open, no button to find.
- **No content script.** Everything runs off `chrome.tabs`, so the extension
  never gets injected into a page and never sees page contents. Permissions are
  `tabs` and `storage`, nothing else -- no `<all_urls>`, no host permissions.
  This also means it works on tabs that were already open, with no reload.
- **Rules are per-origin and picked, not typed.** The options page lists the
  origins you currently have open; you add a rule by selecting one. Global rules
  cover the common case, per-site rules override them where the URL shape is
  unusual (`youtube.com` -> only `?v=` identifies the page).
- **Every destructive run is undoable.** `Alt+Shift+Z` reopens exactly what the
  last run closed, back in the same windows and roughly the same positions.

## Install

No build step -- the repo is the extension.

1. Open `chrome://extensions` (paste it in the address bar; chrome:// links are
   not clickable).
2. Turn on **Developer mode**.
3. **Load unpacked** -> select this directory.

After editing any file, hit the reload icon on the extension card.

## Shortcuts

| Key | Action |
| --- | --- |
| `Alt+Shift+D` | Close duplicates in the current window |
| `Alt+Shift+A` | Close duplicates across all windows |
| `Alt+Shift+Z` | Undo the last run |

`Alt` is `Option` on macOS. Rebind at `chrome://extensions/shortcuts`.

## How duplicates are decided

Two tabs are duplicates when their **normalized URLs** are equal. Normalization
is configurable; the defaults are:

| Rule | Default | Effect |
| --- | --- | --- |
| `ignoreHash` | on | `/x#a` and `/x#b` are the same page |
| `stripTracking` | on | `utm_*`, `fbclid`, `gclid`, ... are dropped |
| `sortParams` | on | `?a=1&b=2` equals `?b=2&a=1` |
| `ignoreTrailingSlash` | on | `/docs/` equals `/docs` |
| `queryMode` | `keep` | any other param difference means a different page |
| `ignorePathname` | off | -- |
| `ignoreWww` | off | -- |

`queryMode` can be set to `drop` (ignore the query entirely) or `allowlist`
(only the named params identify the page) globally or per origin.

Tracking-param stripping is deliberately conservative: params like `ref` and
`source` are real routing params on some sites, so they are never stripped.

Of each duplicate group, one tab survives, in this priority: **pinned**, then
**active**, then **leftmost**. Pinned tabs are excluded from dedup entirely
unless you opt in. Non-web tabs (`chrome://`, `file://`, `about:blank`) never
take part.

Note that across-all-windows dedup can close a tab that is active in another
window -- if the same URL is focused in two windows, only one survives.

## Adding a feature

`worker.js` is only a router. A new feature is a module under `features/` plus
one line in its `COMMANDS` table and one entry in the manifest's `commands`:

```js
// features/mything.js
export async function myThing() { ... }

// worker.js
const COMMANDS = {
  "dedup-all-windows": () => dedup(SCOPE_ALL),
  "my-thing": () => myThing(),          // <- and a matching manifest entry
};
```

Chrome allows at most **four** `suggested_key` bindings per extension, three of
which are already taken. Beyond that, commands still work but ship unbound and
the user assigns keys at `chrome://extensions/shortcuts`.

Keep matching/planning logic pure and in `lib/`, so it stays testable under
plain node; keep `chrome.*` calls in `features/`.

## Development

`lib/normalize.js` is pure -- no `chrome.*` -- so the matching logic runs under
plain node:

```sh
npm test          # no install needed, uses node:test
```

The `package.json` exists only to mark the sources as ES modules for node; there
are no dependencies and no build.

Icons are generated, not committed by hand:

```sh
python3 tools/make_icons.py    # needs Pillow
```

## Layout

```
manifest.json         MV3 manifest, permissions, shortcut bindings
worker.js             service worker: routes shortcuts to features
features/dedup.js     close-duplicates + undo
lib/normalize.js      URL normalization + grouping (pure, tested)
lib/config.js         storage load/save
lib/badge.js          toolbar icon feedback
options.html/.js/.css settings page with live preview
tools/                icon generator, tests
```
