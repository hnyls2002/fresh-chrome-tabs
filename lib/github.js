import { pickKeeper } from "./normalize.js";

const PATTERNS = [
  { kind: "pr", re: /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:$|[/?#])/ },
  { kind: "issue", re: /^\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:$|[/?#])/ },
  { kind: "run", re: /^\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)(?:$|[/?#])/ },
];

export function parseGithubUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.host !== "github.com" && url.host !== "www.github.com") return null;

  for (const { kind, re } of PATTERNS) {
    const m = url.pathname.match(re);
    if (m) return { kind, repo: `${m[1]}/${m[2]}`, id: m[3] };
  }
  return null;
}

// PRs and issues share a number space, so the kind has to stay in the key.
export function entityKey(entity) {
  return `${entity.repo}/${entity.kind}/${entity.id}`;
}

export function entityLabel(entity) {
  return entity.kind === "run"
    ? `${entity.repo} run ${entity.id}`
    : `${entity.repo}#${entity.id}`;
}

export function groupGithubEntities(tabs, includePinned = false) {
  const buckets = new Map();

  for (const tab of tabs) {
    if (tab.pinned && !includePinned) continue;
    const entity = parseGithubUrl(tab.url || tab.pendingUrl || "");
    if (!entity) continue;

    const key = entityKey(entity);
    const bucket = buckets.get(key);
    bucket ? bucket.tabs.push(tab) : buckets.set(key, { entity, tabs: [tab] });
  }

  const groups = [];
  for (const [key, { entity, tabs: members }] of buckets) {
    if (members.length < 2) continue;
    const keeper = pickKeeper(members);
    groups.push({
      key,
      label: entityLabel(entity),
      keeper,
      doomed: members.filter((t) => t.id !== keeper.id),
    });
  }
  return groups;
}
