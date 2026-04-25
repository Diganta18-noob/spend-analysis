import React, { useState } from "react";
import { adminChangePassword } from "../../services/apiService";
import { Settings, Lock, X, Save } from "lucide-react";

export default function AdminSettingsModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    setLoading(true);
    try {
      const res = await adminChangePassword(currentPassword, newPassword);
      sessionStorage.setItem("admin_token", res.token);
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px", width: "100%", maxWidth: "450px", overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "8px", borderRadius: "8px" }}>
              <Settings size={18} color="#e2e8f0" />
            </div>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "600" }}>Admin Settings</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          <h4 style={{ margin: "0 0 16px", color: "#e2e8f0", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock size={16} color="#fbbf24" /> Change Password
          </h4>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#94a3b8", fontSize: "13px" }}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#94a3b8", fontSize: "13px" }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#94a3b8", fontSize: "13px" }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px", padding: "10px", background: "rgba(248,113,113,0.1)", borderRadius: "6px" }}>{error}</div>}
            {success && <div style={{ color: "#34d399", fontSize: "13px", marginBottom: "16px", padding: "10px", background: "rgba(52,211,153,0.1)", borderRadius: "6px" }}>{success}</div>}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "12px", background: "#fbbf24", color: "#000", border: "none", borderRadius: "8px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            }}>
              {loading ? "Saving..." : <><Save size={16} /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
