# Comment style

1. **99% fit within two lines**, most within one. A genuinely intricate
   invariant may run longer -- that is a rare exception, not a licence.
2. **State the current choice, not the history.** No record of what the code
   used to do, what was tried first, or why an approach was abandoned.
3. **If the code or a nearby comment already implies it, delete it.** A comment
   earns its place only by saying something unreadable from the code.
4. **Use `//` (or `#`), not docstrings.** No `/** */`, no `"""..."""`.

Applies to JS and Python alike.

### Earns its place

A cross-file constraint the reader cannot see from here:

```js
// Keys must match the "commands" entries in manifest.json.
const COMMANDS = { ... };
```

A deliberate omission -- the code shows only what *is* in the list:

```js
// Params with no page-identity meaning. Deliberately conservative: "ref",
// "source" and friends are real routing params on some sites, so they stay out.
const TRACKING_EXACT = new Set([...]);
```

A non-obvious ordering constraint:

```js
// Each insert shifts the rest right, so ascending index lands them closest.
for (const tab of [...closed].sort((a, b) => a.index - b.index)) {
```

A sentinel whose meaning is a decision, not a failure:

```js
// null means the tab is excluded from dedup: chrome://, file://, unparseable.
export function normalizeUrl(rawUrl, rule = DEFAULT_RULE) {
```

### Gets deleted

Restating the function name:

```js
/** Flat list of the tabs a run would close. */     // <- delete
export function planDedup(tabs, config) {
  return groupDuplicates(tabs, config).flatMap((g) => g.doomed);
}
```

Restating the next line:

```js
// The allowlist box is only meaningful in allowlist mode.   // <- delete
row.querySelector(".allow").hidden = effectiveMode !== "allowlist";
```

Describing who calls it -- that is what grep is for:

```js
// ... the options page reuses it for preview.    // <- delete
export function groupDuplicates(tabs, config) {
```

Teaching how to extend the codebase -- that belongs in README.md:

```js
// Adding a feature = add a module under features/ and a line here.  // <- delete
```

Narrating the author's reasoning rather than the code's dependency:

```js
// No popup on the action, so clicking the icon runs the primary action.
// ^ rewrite as the fact the code actually depends on:
// Only fires because the manifest declares no default_popup.
chrome.action.onClicked.addListener(() => dedup(SCOPE_WINDOW));
```
