import { DEFAULT_RULE, groupDuplicates } from "./lib/normalize.js";
import { loadConfig, saveConfig } from "./lib/config.js";

const GLOBAL_FLAGS = [
  "ignoreHash",
  "ignorePathname",
  "stripTracking",
  "ignoreTrailingSlash",
  "ignoreWww",
  "sortParams",
];

const SITE_FLAGS = ["ignoreHash", "ignorePathname"];

const el = (sel) => document.querySelector(sel);
let config;

async function init() {
  config = await loadConfig();
  fillGlobalForm();
  bindGlobalForm();
  el("#add-site").addEventListener("click", addSiteRule);
  await render();
}

function fillGlobalForm() {
  for (const flag of GLOBAL_FLAGS) {
    el(`[data-global="${flag}"]`).checked =
      config.global[flag] ?? DEFAULT_RULE[flag];
  }
  el('[data-root="includePinned"]').checked = config.includePinned;
  const mode = config.global.queryMode ?? DEFAULT_RULE.queryMode;
  el(`#global-query-mode input[value="${mode}"]`).checked = true;
}

function bindGlobalForm() {
  for (const flag of GLOBAL_FLAGS) {
    el(`[data-global="${flag}"]`).addEventListener("change", (e) => {
      config.global[flag] = e.target.checked;
      persist();
    });
  }
  el('[data-root="includePinned"]').addEventListener("change", (e) => {
    config.includePinned = e.target.checked;
    persist();
  });
  for (const radio of document.querySelectorAll("#global-query-mode input")) {
    radio.addEventListener("change", (e) => {
      config.global.queryMode = e.target.value;
      persist();
    });
  }
}

async function persist() {
  await saveConfig(config);
  await render();
}

async function render() {
  const tabs = await chrome.tabs.query({});
  renderOriginPicker(tabs);
  renderSiteRules();
  renderPreview(tabs);
}

function renderOriginPicker(tabs) {
  const open = new Set();
  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === "http:" || url.protocol === "https:") {
        open.add(url.origin);
      }
    } catch {
      // Not a normal page (chrome://, about:blank) -- nothing to configure.
    }
  }

  const picker = el("#origin-picker");
  const available = [...open]
    .filter((o) => !(o in config.sites))
    .sort((a, b) => a.localeCompare(b));
  const empty = available.length === 0;

  picker.replaceChildren(
    ...(empty
      ? [new Option("every open site already has a rule", "")]
      : available.map((origin) => new Option(origin, origin))),
  );
  picker.disabled = empty;
  el("#add-site").disabled = empty;
}

function addSiteRule() {
  const origin = el("#origin-picker").value;
  if (!origin) return;
  config.sites[origin] = { queryMode: "allowlist", allowedParams: [] };
  persist();
}

function renderSiteRules() {
  const list = el("#site-list");
  const origins = Object.keys(config.sites).sort((a, b) => a.localeCompare(b));

  list.replaceChildren(
    ...origins.map((origin) => buildSiteRow(origin, config.sites[origin])),
  );
}

function buildSiteRow(origin, rule) {
  const row = el("#site-row").content.cloneNode(true).firstElementChild;
  row.querySelector(".origin").textContent = origin;

  const qmode = row.querySelector(".qmode");
  qmode.value = rule.queryMode ?? "";
  qmode.addEventListener("change", (e) => {
    if (e.target.value) rule.queryMode = e.target.value;
    else delete rule.queryMode;
    persist();
  });

  const allowed = row.querySelector(".allowed");
  allowed.value = (rule.allowedParams ?? []).join(", ");
  allowed.addEventListener("change", (e) => {
    rule.allowedParams = e.target.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    persist();
  });
  const effectiveMode = rule.queryMode ?? config.global.queryMode;
  row.querySelector(".allow").hidden = effectiveMode !== "allowlist";

  for (const flag of SITE_FLAGS) {
    const box = row.querySelector(`.${flag}`);
    box.checked = rule[flag] ?? config.global[flag] ?? DEFAULT_RULE[flag];
    box.addEventListener("change", (e) => {
      rule[flag] = e.target.checked;
      persist();
    });
  }

  row.querySelector(".remove").addEventListener("click", () => {
    delete config.sites[origin];
    persist();
  });

  return row;
}

function renderPreview(tabs) {
  const groups = groupDuplicates(tabs, config);
  const total = groups.reduce((n, g) => n + g.doomed.length, 0);
  const summary = el("#preview-summary");

  if (total === 0) {
    summary.className = "summary none";
    summary.textContent = `No duplicates among ${tabs.length} open tabs.`;
    el("#preview-groups").replaceChildren();
    return;
  }

  summary.className = "summary";
  summary.innerHTML = `Would close <b>${total}</b> of ${tabs.length} tabs, across ${groups.length} duplicate group(s).`;

  el("#preview-groups").replaceChildren(...groups.map(buildGroupPreview));
}

function buildGroupPreview(group) {
  const box = document.createElement("div");
  box.className = "group";

  const key = document.createElement("div");
  key.className = "key";
  key.textContent = group.key;
  box.append(key);

  const list = document.createElement("ul");
  list.append(buildTabLine(group.keeper, "keep"));
  for (const tab of group.doomed) list.append(buildTabLine(tab, "close"));
  box.append(list);

  return box;
}

function buildTabLine(tab, kind) {
  const li = document.createElement("li");
  li.className = kind;
  li.textContent = tab.title || tab.url;
  li.title = tab.url;
  return li;
}

init();
