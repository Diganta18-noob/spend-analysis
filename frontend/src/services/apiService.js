const API_BASE = import.meta.env.VITE_API_URL || '/api';
const queryString = (filters = {}) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null)).toString();
async function request(path, options = {}, credentials = { admin: true }) {
  const token = credentials.admin ? sessionStorage.getItem('admin_token') : credentials.userToken;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const refreshed = response.headers.get('X-Refreshed-Token');
  if (credentials.admin && refreshed) sessionStorage.setItem('admin_token', refreshed);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(response.status === 401 ? 'Unauthorized' : data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response;
}
const json = async (...args) => (await request(...args)).json();
export const adminLogin = password => json('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }, {});
export const adminChangePassword = (currentPassword, newPassword) => json('/admin/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
export const fetchAnalyses = (filters = {}) => json(`/analyses?${queryString(filters)}`);
export const fetchStats = () => json('/stats');
export const fetchAnalysis = (id, credentials = {}) => json(`/analyses/${encodeURIComponent(id)}`, {}, credentials);
export const updateAnalysis = (id, changes, credentials = {}) => json(`/analyses/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(changes) }, credentials);
export const deleteAnalysis = id => json(`/analyses/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const fetchAuditLogs = (filters = {}) => json(`/admin/audit-logs?${queryString(filters)}`);
export const fetchApiUsage = () => json('/admin/api-usage');
export const logCsvExport = () => json('/admin/log-export', { method: 'POST' });
export const exportAnalyses = async filters => (await request(`/admin/export?${queryString(filters)}`)).blob();
export const fetchUserAnalyses = userToken => json('/v2/me/analyses', {}, { userToken });
export const fetchUserStats = userToken => json('/v2/me/stats', {}, { userToken });
export const deleteUserAnalysis = (id, userToken) => json(`/v2/me/analyses/${encodeURIComponent(id)}`, { method: 'DELETE' }, { userToken });
export async function pingServer() { await request('/ping', { signal: AbortSignal.timeout(10000) }, {}); return true; }
