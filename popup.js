import { groupDuplicates } from "./lib/normalize.js";
import { loadConfig } from "./lib/config.js";
import {
  dedup,
  undoLast,
  undoableCount,
  SCOPE_ALL,
  SCOPE_WINDOW,
} from "./features/dedup.js";

const el = (id) => document.getElementById(id);

async function render() {
  const [config, undoable] = await Promise.all([loadConfig(), undoableCount()]);
  const [winTabs, allTabs] = await Promise.all([
    chrome.tabs.query({ currentWindow: true }),
    chrome.tabs.query({}),
  ]);

  const winGroups = groupDuplicates(winTabs, config);
  const allDoomed = countDoomed(groupDuplicates(allTabs, config));
  const winDoomed = countDoomed(winGroups);

  renderSummary(winDoomed, winTabs.length);
  renderGroups(winGroups);

  el("close-window").textContent = winDoomed
    ? `Close ${winDoomed} duplicate${winDoomed > 1 ? "s" : ""}`
    : "No duplicates here";
  el("close-window").disabled = winDoomed === 0;

  // Only worth offering when it closes more than the current-window button.
  const extra = allDoomed - winDoomed;
  el("close-all").textContent =
    extra > 0 ? `All windows (+${extra})` : "All windows";
  el("close-all").disabled = extra <= 0;

  el("undo").textContent = undoable ? `Undo (${undoable})` : "Undo";
  el("undo").disabled = undoable === 0;
}

const countDoomed = (groups) => groups.reduce((n, g) => n + g.doomed.length, 0);

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

function renderGroups(groups) {
  el("groups").replaceChildren(
    ...[...groups]
      .sort((a, b) => b.doomed.length - a.doomed.length)
      .map(buildRow),
  );
}

function buildRow(group) {
  const li = document.createElement("li");

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = shortLabel(group.key);
  label.title = group.keeper.title || group.key;

  const count = document.createElement("span");
  count.className = "count";
  count.textContent = `-${group.doomed.length}`;

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
wire("undo", () => undoLast());

el("settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

render();
