const CACHE_KEY = "expense_analysis_current";

/**
 * Save current analysis data to localStorage
 */
export function saveAnalysis(data) {
  if (!data) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to cache analysis:", error);
  }
}

/**
 * Load cached analysis from localStorage
 */
export function loadAnalysis() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Failed to load cached analysis:", error);
    return null;
  }
}

/**
 * Clear cached analysis
 */
export function clearAnalysis() {
  localStorage.removeItem(CACHE_KEY);
}
