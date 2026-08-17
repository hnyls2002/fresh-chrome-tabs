import { planDedup } from "./lib/normalize.js";
import { loadConfig } from "./lib/config.js";
import { setBadgeCount } from "./lib/badge.js";

// Counts the focused window, matching what the panel's primary button acts on.
// A service worker has no window of its own, so currentWindow is unreliable here.
async function refreshBadge() {
  const [config, win] = await Promise.all([
    loadConfig(),
    chrome.windows.getLastFocused(),
  ]);
  const tabs = await chrome.tabs.query({ windowId: win.id });
  setBadgeCount(planDedup(tabs, config).length);
}

chrome.tabs.onCreated.addListener(refreshBadge);
chrome.tabs.onRemoved.addListener(refreshBadge);
chrome.tabs.onAttached.addListener(refreshBadge);
chrome.tabs.onDetached.addListener(refreshBadge);
chrome.tabs.onReplaced.addListener(refreshBadge);
chrome.windows.onFocusChanged.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.runtime.onInstalled.addListener(refreshBadge);

// Title and loading-state churn cannot change what matches; only the URL can.
chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
  if (changeInfo.url) refreshBadge();
});

chrome.storage.onChanged.addListener(refreshBadge);

refreshBadge();
