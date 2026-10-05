import { useState } from "react";
import { adminChangePassword } from "../../services/apiService";
import { ConfirmDialog, InlineError } from "../ui/PortalUI";
export default function AdminSettingsModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save() {
    if (password.length < 12) {
      setError("Use at least 12 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setError("New passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const data = await adminChangePassword(current, password);
      if (data.token) sessionStorage.setItem("admin_token", data.token);
      setSaved(true);
      setCurrent("");
      setPassword("");
      setConfirmation("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <ConfirmDialog
      title="Account settings"
      confirmLabel={saved ? "Done" : "Change password"}
      onCancel={onClose}
      onConfirm={saved ? onClose : save}
      pending={pending}
    >
      <InlineError message={error} />
      {saved ? (
        <p role="status">Password updated successfully.</p>
      ) : (
        <div style={{ display: "grid", gap: 15 }}>
          <label className="p-field">
            Current password
            <input
              className="p-input"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="p-field">
            New password
            <input
              className="p-input"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="p-field">
            Confirm new password
            <input
              className="p-input"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <span className="p-help">
            Use at least 12 characters. Your active session continues after the
            password changes.
          </span>
        </div>
      )}
    </ConfirmDialog>
  );
}
