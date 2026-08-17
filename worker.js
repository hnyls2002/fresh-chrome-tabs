import { dedup, SCOPE_ALL, SCOPE_WINDOW, undoLast } from "./features/dedup.js";

// Keys must match the "commands" entries in manifest.json.
const COMMANDS = {
  "dedup-all-windows": () => dedup(SCOPE_ALL),
  "undo-last-dedup": () => undoLast(),
};

// Only fires because the manifest declares no default_popup.
chrome.action.onClicked.addListener(() => dedup(SCOPE_WINDOW));

chrome.commands.onCommand.addListener((command) => COMMANDS[command]?.());
