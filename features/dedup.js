import { planDedup } from "../lib/normalize.js";
import { loadConfig } from "../lib/config.js";
import { flashBadge } from "../lib/badge.js";

export const SCOPE_WINDOW = "window";
export const SCOPE_ALL = "all";
const UNDO_KEY = "lastClosed";

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

  // Snapshot before removing -- the tab objects are gone afterwards.
  await chrome.storage.session.set({
    [UNDO_KEY]: doomed.map((t) => ({
      url: t.url,
      windowId: t.windowId,
      index: t.index,
      pinned: t.pinned,
    })),
  });
  await chrome.tabs.remove(doomed.map((t) => t.id));
  flashBadge(`-${doomed.length}`, "#1a73e8");
  return doomed.length;
}

export async function undoLast() {
  const closed = (await chrome.storage.session.get(UNDO_KEY))[UNDO_KEY];
  if (!closed?.length) {
    flashBadge("x", "#5f6368");
    return 0;
  }

  // Each insert shifts the rest right, so ascending index lands them closest.
  for (const tab of [...closed].sort((a, b) => a.index - b.index)) {
    try {
      await chrome.tabs.create({
        url: tab.url,
        windowId: tab.windowId,
        index: tab.index,
        pinned: tab.pinned,
        active: false,
      });
    } catch {
      // Original window is gone -- fall back to the current one.
      await chrome.tabs.create({ url: tab.url, active: false });
    }
  }

  await chrome.storage.session.remove(UNDO_KEY);
  flashBadge(`+${closed.length}`, "#188038");
  return closed.length;
}
