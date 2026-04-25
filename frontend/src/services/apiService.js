// Using relative path for local proxy, or environment variable for production
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function adminLogin(password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }
  return res.json();
}

export async function adminChangePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/admin/change-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to change password");
  return data;
}

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export async function fetchAnalyses() {
  const res = await fetch(`${API_BASE}/analyses`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch analyses");
  }
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch stats");
  }
  return res.json();
}

export async function fetchAnalysis(id) {
  const res = await fetch(`${API_BASE}/analyses/${id}`);
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
  const res = await fetch(`${API_BASE}/analyses/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete analysis");
  return res.json();
}
