import React, { useState } from "react";
import { adminLogin } from "../../services/apiService";
import { Lock, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await adminLogin(password);
      sessionStorage.setItem("admin_token", token);
      window.location.hash = "#/admin/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "40px",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ 
            width: "56px", height: "56px", borderRadius: "16px", 
            background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px"
          }}>
            <Lock color="#000" size={28} />
          </div>
          <h1 style={{ color: "#fff", margin: "0 0 8px", fontSize: "24px", fontWeight: "700" }}>Admin Access</h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Enter password to view stored analyses.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.target.style.borderColor = "#fbbf24"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"}
              required
            />
          </div>

          {error && (
            <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "20px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#fff",
              color: "#0f172a",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.7 : 1,
              transition: "transform 0.1s"
            }}
            onMouseDown={(e) => !loading && (e.target.style.transform = "scale(0.98)")}
            onMouseUp={(e) => !loading && (e.target.style.transform = "scale(1)")}
            onMouseLeave={(e) => !loading && (e.target.style.transform = "scale(1)")}
          >
            {loading ? "Verifying..." : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a href="#/" style={{ color: "#64748b", textDecoration: "none", fontSize: "13px" }}>
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}
