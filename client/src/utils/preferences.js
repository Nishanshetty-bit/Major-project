const STORAGE_KEY = "stockAdvisorPreferences";
const DEFAULTS = { budget: 20000, riskTolerance: "moderate", investmentHorizon: "medium" };

export function getPreferences() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return { ...DEFAULTS }; }
}

export function savePreferences(preferences) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getPreferences(), ...preferences })); }
  catch { /* Browser storage can be disabled; the current page state still works. */ }
}
