// Empty text hides the badge entirely, so zero duplicates shows nothing.
export function setBadgeCount(count) {
  chrome.action.setBadgeBackgroundColor({ color: "#1a73e8" });
  chrome.action.setBadgeText({ text: count ? String(count) : "" });
}
