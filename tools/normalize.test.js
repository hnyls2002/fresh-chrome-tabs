import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RULE,
  groupDuplicates,
  normalizeUrl,
  pickKeeper,
  planDedup,
  resolveRule,
} from "../lib/normalize.js";

const rule = (over = {}) => ({ ...DEFAULT_RULE, ...over });
const same = (a, b, r = DEFAULT_RULE) =>
  assert.equal(normalizeUrl(a, r), normalizeUrl(b, r));
const differ = (a, b, r = DEFAULT_RULE) =>
  assert.notEqual(normalizeUrl(a, r), normalizeUrl(b, r));

test("hash is ignored by default", () => {
  same("https://a.com/x#top", "https://a.com/x#bottom");
});

test("hash is significant when the rule says so", () => {
  differ("https://a.com/x#top", "https://a.com/x#bottom", {
    ...DEFAULT_RULE,
    ignoreHash: false,
  });
});

test("trailing slash collapses but the root path is left alone", () => {
  same("https://a.com/docs/", "https://a.com/docs");
  same("https://a.com/", "https://a.com");
});

test("query params identify the page by default", () => {
  differ("https://a.com/p?id=1", "https://a.com/p?id=2");
});

test("param order does not matter", () => {
  same("https://a.com/p?a=1&b=2", "https://a.com/p?b=2&a=1");
});

test("tracking params are stripped", () => {
  same("https://a.com/p?utm_source=x&id=7", "https://a.com/p?id=7");
  same("https://a.com/p?fbclid=abc", "https://a.com/p");
  same("https://a.com/p?UTM_Medium=mail", "https://a.com/p");
});

test("routing params that merely look like tracking are preserved", () => {
  // GitHub's ?ref= is a real branch selector -- stripping it would be a bug.
  differ("https://a.com/p?ref=main", "https://a.com/p?ref=dev");
  differ("https://a.com/p?source=a", "https://a.com/p");
});

test("allowlist keeps only the named params", () => {
  const r = rule({ queryMode: "allowlist", allowedParams: ["v"] });
  same("https://y.com/watch?v=1&t=30s", "https://y.com/watch?v=1&list=RD", r);
  differ("https://y.com/watch?v=1", "https://y.com/watch?v=2", r);
});

test("drop mode ignores the whole query", () => {
  same("https://a.com/p?id=1", "https://a.com/p?id=2", rule({ queryMode: "drop" }));
});

test("ignorePathname folds a whole host together", () => {
  same("https://a.com/x", "https://a.com/y/z", rule({ ignorePathname: true }));
});

test("www and protocol stay significant unless asked", () => {
  differ("https://www.a.com/x", "https://a.com/x");
  same("https://www.a.com/x", "https://a.com/x", rule({ ignoreWww: true }));
  differ("http://a.com/x", "https://a.com/x");
});

test("non-web tabs never take part in dedup", () => {
  assert.equal(normalizeUrl("chrome://extensions"), null);
  assert.equal(normalizeUrl("about:blank"), null);
  assert.equal(normalizeUrl("file:///tmp/a.html"), null);
  assert.equal(normalizeUrl("not a url"), null);
});

test("site rule overrides the global one, per origin", () => {
  const config = {
    global: { queryMode: "keep" },
    sites: { "https://y.com": { queryMode: "allowlist", allowedParams: ["v"] } },
  };
  assert.equal(resolveRule("https://y.com/watch", config).queryMode, "allowlist");
  assert.equal(resolveRule("https://a.com/watch", config).queryMode, "keep");
  assert.equal(resolveRule("https://y.com/watch", config).ignoreHash, true);
});

const tab = (id, url, over = {}) => ({
  id,
  url,
  index: id,
  windowId: 1,
  pinned: false,
  active: false,
  ...over,
});

test("keeper priority: pinned, then active, then leftmost", () => {
  const a = tab(1, "https://a.com");
  const b = tab(2, "https://a.com", { active: true });
  const c = tab(3, "https://a.com", { pinned: true });
  assert.equal(pickKeeper([a, b, c]).id, 3);
  assert.equal(pickKeeper([a, b]).id, 2);
  assert.equal(pickKeeper([a, tab(9, "https://a.com")]).id, 1);
});

test("pinned tabs are untouched by default", () => {
  const tabs = [
    tab(1, "https://a.com", { pinned: true }),
    tab(2, "https://a.com"),
    tab(3, "https://a.com"),
  ];
  const closed = planDedup(tabs, { global: DEFAULT_RULE, sites: {} });
  assert.deepEqual(
    closed.map((t) => t.id),
    [3],
  );
});

test("pinned tabs join in when includePinned is set, and win as keeper", () => {
  const tabs = [
    tab(1, "https://a.com", { pinned: true }),
    tab(2, "https://a.com"),
  ];
  const closed = planDedup(tabs, {
    global: DEFAULT_RULE,
    sites: {},
    includePinned: true,
  });
  assert.deepEqual(
    closed.map((t) => t.id),
    [2],
  );
});

test("groups report one keeper and the rest doomed", () => {
  const tabs = [
    tab(1, "https://a.com/x#a"),
    tab(2, "https://a.com/x#b"),
    tab(3, "https://b.com/"),
    tab(4, "https://b.com"),
    tab(5, "https://c.com/lonely"),
    tab(6, "chrome://extensions"),
    tab(7, "chrome://extensions"),
  ];
  const groups = groupDuplicates(tabs, { global: DEFAULT_RULE, sites: {} });
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.flatMap((g) => g.doomed.map((t) => t.id)),
    [2, 4],
  );
  assert.ok(!groups.some((g) => g.key?.startsWith("chrome")));
});

test("a still-loading tab is matched by its pendingUrl", () => {
  const tabs = [
    tab(1, "https://a.com/x"),
    { ...tab(2, ""), pendingUrl: "https://a.com/x" },
  ];
  const closed = planDedup(tabs, { global: DEFAULT_RULE, sites: {} });
  assert.deepEqual(
    closed.map((t) => t.id),
    [2],
  );
});

test("a single tab is never a duplicate of itself", () => {
  assert.deepEqual(planDedup([tab(1, "https://a.com")], {}), []);
  assert.deepEqual(planDedup([], {}), []);
});
