import { DEFAULT_RULE } from "./normalize.js";

export const DEFAULT_CONFIG = {
  global: { ...DEFAULT_RULE },
  sites: {},
  includePinned: false,
};

const KEY = "config";

export async function loadConfig() {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  if (!stored) return structuredClone(DEFAULT_CONFIG);
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    global: { ...DEFAULT_RULE, ...(stored.global ?? {}) },
    sites: stored.sites ?? {},
  };
}

export async function saveConfig(config) {
  await chrome.storage.local.set({ [KEY]: config });
}
