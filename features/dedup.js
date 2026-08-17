import { planDedup } from "../lib/normalize.js";
import { loadConfig } from "../lib/config.js";

export const SCOPE_WINDOW = "window";
export const SCOPE_ALL = "all";

export async function dedup(scope) {
  const config = await loadConfig();
  const tabs = await chrome.tabs.query(
    scope === SCOPE_ALL ? {} : { currentWindow: true },
  );
  const doomed = planDedup(tabs, config);
  if (doomed.length === 0) return 0;

  // The badge follows via the worker's tabs.onRemoved listener.
  await chrome.tabs.remove(doomed.map((t) => t.id));
  return doomed.length;
}
