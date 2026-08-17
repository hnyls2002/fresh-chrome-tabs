import { groupDuplicates } from "./lib/normalize.js";
import { loadConfig } from "./lib/config.js";
import { groupGithubEntities } from "./lib/github.js";
import { dedup, SCOPE_ALL, SCOPE_WINDOW } from "./features/dedup.js";
import { collapseGroups } from "./features/collapse.js";

const el = (id) => document.getElementById(id);
const countDoomed = (groups) => groups.reduce((n, g) => n + g.doomed.length, 0);

let pendingCollapse = [];

async function render() {
  const config = await loadConfig();
  const [winTabs, allTabs] = await Promise.all([
    chrome.tabs.query({ currentWindow: true }),
    chrome.tabs.query({}),
  ]);

  renderDuplicates(winTabs, allTabs, config);
  renderCollapse(winTabs, config);
}

function renderDuplicates(winTabs, allTabs, config) {
  const winGroups = groupDuplicates(winTabs, config);
  const winDoomed = countDoomed(winGroups);
  const allDoomed = countDoomed(groupDuplicates(allTabs, config));

  renderSummary(winDoomed, winTabs.length);
  el("groups").replaceChildren(
    ...[...winGroups]
      .sort((a, b) => b.doomed.length - a.doomed.length)
      .map((g) => buildRow(shortLabel(g.key), g.doomed.length, g.key)),
  );

  el("close-window").textContent = winDoomed
    ? `Close ${winDoomed} duplicate${winDoomed > 1 ? "s" : ""}`
    : "No duplicates here";
  el("close-window").disabled = winDoomed === 0;

  // Disabled unless it beats the button above, which is what makes showing the
  // total here safe: the two numbers can never come out equal.
  const extra = allDoomed - winDoomed;
  el("close-all").textContent =
    extra > 0 ? `Close ${allDoomed} in all windows` : "All windows";
  el("close-all").disabled = extra <= 0;
}

function renderCollapse(tabs, config) {
  const groups = groupGithubEntities(tabs, config.includePinned);
  const total = countDoomed(groups);

  pendingCollapse = groups;
  el("collapse").hidden = total === 0;
  if (total === 0) return;

  el("collapse-groups").replaceChildren(
    ...[...groups]
      .sort((a, b) => b.doomed.length - a.doomed.length)
      .map((g) => buildRow(g.label, g.doomed.length, g.keeper.title || g.label)),
  );
  el("collapse-btn").textContent = `Collapse ${total} tab${total > 1 ? "s" : ""}`;
}

function renderSummary(doomed, total) {
  const summary = el("summary");
  if (doomed === 0) {
    summary.className = "summary";
    summary.textContent = `${total} tabs in this window, all unique.`;
    return;
  }
  summary.className = "summary hit";
  summary.innerHTML = `<b>${doomed}</b> of ${total} tabs in this window are duplicates.`;
}

function buildRow(labelText, doomedCount, titleText) {
  const li = document.createElement("li");

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = labelText;
  label.title = titleText;

  const count = document.createElement("span");
  count.className = "count";
  count.textContent = `-${doomedCount}`;

  li.append(label, count);
  return li;
}

function shortLabel(key) {
  try {
    const url = new URL(key);
    return url.host.replace(/^www\./, "") + url.pathname + url.search;
  } catch {
    return key;
  }
}

function wire(id, action) {
  el(id).addEventListener("click", async () => {
    el(id).disabled = true;
    try {
      await action();
    } finally {
      await render();
    }
  });
}

wire("close-window", () => dedup(SCOPE_WINDOW));
wire("close-all", () => dedup(SCOPE_ALL));
wire("collapse-btn", () => collapseGroups(pendingCollapse));

el("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

render();
