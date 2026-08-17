// Two tabs are duplicates iff their normalized URLs are equal.
// Pure functions only -- no chrome.* -- so this runs under plain node.

export const QUERY_KEEP = "keep";
export const QUERY_DROP = "drop";
export const QUERY_ALLOWLIST = "allowlist";

export const DEFAULT_RULE = {
  ignoreHash: true,
  ignorePathname: false,
  queryMode: QUERY_KEEP,
  allowedParams: [],
  ignoreTrailingSlash: true,
  ignoreWww: false,
  stripTracking: true,
  sortParams: true,
};

// Params with no page-identity meaning. Deliberately conservative: "ref",
// "source" and friends are real routing params on some sites, so they stay out.
const TRACKING_EXACT = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "yclid",
  "twclid",
  "ttclid",
  "igshid",
  "epik",
  "mc_cid",
  "mc_eid",
  "s_kwcid",
  "li_fat_id",
  "_ga",
  "_gl",
  "spm",
]);

const TRACKING_PREFIX = /^utm_/i;

const isTrackingParam = (name) =>
  TRACKING_EXACT.has(name.toLowerCase()) || TRACKING_PREFIX.test(name);

export function resolveRule(url, config) {
  const global = { ...DEFAULT_RULE, ...(config?.global ?? {}) };
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return global;
  }
  const site = config?.sites?.[origin];
  return site ? { ...global, ...site } : global;
}

// null means the tab is excluded from dedup: chrome://, file://, unparseable.
export function normalizeUrl(rawUrl, rule = DEFAULT_RULE) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  let host = u.host;
  if (rule.ignoreWww) host = host.replace(/^www\./i, "");

  let path = rule.ignorePathname ? "" : u.pathname;
  if (rule.ignoreTrailingSlash && path.length > 1) path = path.replace(/\/+$/, "");

  const search = buildSearch(u.searchParams, rule);
  const hash = rule.ignoreHash ? "" : u.hash;

  return `${u.protocol}//${host}${path}${search}${hash}`;
}

function buildSearch(searchParams, rule) {
  if (rule.queryMode === QUERY_DROP) return "";

  const allowed =
    rule.queryMode === QUERY_ALLOWLIST
      ? new Set((rule.allowedParams ?? []).map((p) => p.toLowerCase()))
      : null;

  const kept = new URLSearchParams();
  for (const [name, value] of searchParams) {
    if (allowed && !allowed.has(name.toLowerCase())) continue;
    if (rule.stripTracking && isTrackingParam(name)) continue;
    kept.append(name, value);
  }
  if (rule.sortParams) kept.sort();

  const str = kept.toString();
  return str ? `?${str}` : "";
}

// Survival priority: pinned, then active, then leftmost.
export function pickKeeper(tabs) {
  return [...tabs].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      Number(b.active) - Number(a.active) ||
      a.index - b.index ||
      a.windowId - b.windowId,
  )[0];
}

export function groupDuplicates(tabs, config) {
  const includePinned = config?.includePinned ?? false;
  const buckets = new Map();

  for (const tab of tabs) {
    if (tab.pinned && !includePinned) continue;
    const key = normalizeUrl(tab.url, resolveRule(tab.url, config));
    if (key === null) continue;
    const bucket = buckets.get(key);
    bucket ? bucket.push(tab) : buckets.set(key, [tab]);
  }

  const groups = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length < 2) continue;
    const keeper = pickKeeper(bucket);
    groups.push({
      key,
      keeper,
      doomed: bucket.filter((t) => t.id !== keeper.id),
    });
  }
  return groups;
}

export function planDedup(tabs, config) {
  return groupDuplicates(tabs, config).flatMap((g) => g.doomed);
}
