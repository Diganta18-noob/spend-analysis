// Financial statement payloads stay in memory; remove the legacy persisted payload.
export function clearAnalysis() { localStorage.removeItem('expense_analysis_current'); }
export function saveAnalysis() { clearAnalysis(); }
export function loadAnalysis() { clearAnalysis(); return null; }
