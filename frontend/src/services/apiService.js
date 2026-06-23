// Using relative path for local proxy, or environment variable for production
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function adminLogin(password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let errorMsg = "Login failed";
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // Backend returned non-JSON (e.g., HTML error page from Render when server is cold)
      if (res.status === 502 || res.status === 503) {
        errorMsg = "Backend server is waking up. Please wait a moment and try again.";
      } else {
        errorMsg = `Server error (${res.status}). The backend may be unavailable.`;
      }
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

async function fetchWithAuth(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  
  // Extract and update refreshed token for "refresh on activity" session persistence
  const refreshedToken = res.headers.get("X-Refreshed-Token");
  if (refreshedToken) {
    sessionStorage.setItem("admin_token", refreshedToken);
  }
  
  return res;
}

export async function adminChangePassword(currentPassword, newPassword) {
  const res = await fetchWithAuth(`${API_BASE}/admin/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to change password");
  return data;
}

export async function fetchAnalyses() {
  const res = await fetchWithAuth(`${API_BASE}/analyses?t=${Date.now()}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch analyses");
  }
  return res.json();
}

export async function fetchStats() {
  const res = await fetchWithAuth(`${API_BASE}/stats?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch stats");
  }
  return res.json();
}

export async function fetchAnalysis(id) {
  const res = await fetch(`${API_BASE}/analyses/${id}?t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch analysis");
  return res.json();
}

export async function updateAnalysis(id, data) {
  if (!id) return;
  const res = await fetch(`${API_BASE}/analyses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update analysis");
  return res.json();
}

export async function deleteAnalysis(id) {
  const res = await fetchWithAuth(`${API_BASE}/analyses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete analysis");
  return res.json();
}

// --- Audit Logs ---
export async function fetchAuditLogs(limit = 50, offset = 0) {
  const res = await fetchWithAuth(`${API_BASE}/admin/audit-logs?limit=${limit}&offset=${offset}&t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

// --- API Usage ---
export async function fetchApiUsage() {
  const res = await fetchWithAuth(`${API_BASE}/admin/api-usage?t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch API usage");
  return res.json();
}

// --- Log CSV Export ---
export async function logCsvExport() {
  const res = await fetchWithAuth(`${API_BASE}/admin/log-export`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to log export");
  return res.json();
}
// --- Server Health ---
export async function pingServer() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(`${API_BASE}/ping`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Server not responding");
    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
