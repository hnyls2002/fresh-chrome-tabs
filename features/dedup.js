import { planDedup } from "../lib/normalize.js";
import { loadConfig } from "../lib/config.js";
import { flashBadge } from "../lib/badge.js";

export const SCOPE_WINDOW = "window";
export const SCOPE_ALL = "all";

export async function dedup(scope) {
  const config = await loadConfig();
  const tabs = await chrome.tabs.query(
    scope === SCOPE_ALL ? {} : { currentWindow: true },
  );
  const doomed = planDedup(tabs, config);

  if (doomed.length === 0) {
    flashBadge("0", "#5f6368");
    return 0;
  }

  await chrome.tabs.remove(doomed.map((t) => t.id));
  flashBadge(`-${doomed.length}`, "#1a73e8");
  return doomed.length;
}
