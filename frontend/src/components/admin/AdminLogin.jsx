import { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { adminLogin } from "../../services/apiService";
import PortalShell from "../layout/PortalShell";
import { Card, Button, InlineError } from "../ui/PortalUI";
export default function AdminLogin({ theme, toggleTheme }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await adminLogin(password);
      sessionStorage.setItem("admin_token", result.token);
      window.location.hash = "#/admin/dashboard";
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <PortalShell
      activeView="upload"
      hasData={false}
      onNavigate={(view) => {
        window.location.hash = view === "history" ? "#/history" : "#/";
      }}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      <div className="login-wrap">
        <Card className="login-card">
          <ShieldCheck size={27} />
          <h1>Admin workspace</h1>
          <p>
            Sign in to manage analyses, review extraction quality, and monitor
            service activity.
          </p>
          <InlineError message={error} />
          <form onSubmit={login}>
            <label className="p-field">
              Admin password
              <input
                className="p-input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Enter admin workspace"}
              <ArrowRight size={15} />
            </Button>
          </form>
          <p className="p-help" style={{ marginTop: 20, marginBottom: 0 }}>
            Administrative access is restricted. Sessions expire after
            inactivity.
          </p>
        </Card>
      </div>
    </PortalShell>
  );
}
