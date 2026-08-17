export async function collapseGroups(groups) {
  const doomed = groups.flatMap((g) => g.doomed);
  if (doomed.length === 0) return 0;

  await chrome.tabs.remove(doomed.map((t) => t.id));
  return doomed.length;
}
