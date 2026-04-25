import React, { useEffect, useState } from "react";
import { fetchAuditLogs } from "../../services/apiService";
import { Clock, Shield, Eye, Trash2, LogIn, Download, Edit, AlertTriangle, XCircle } from "lucide-react";

const ACTION_META = {
  ADMIN_LOGIN:        { icon: <LogIn size={14} />, color: "#34d399", label: "Login" },
  ADMIN_LOGIN_FAILED: { icon: <XCircle size={14} />, color: "#f87171", label: "Login Failed" },
  PASSWORD_CHANGED:   { icon: <Shield size={14} />, color: "#fbbf24", label: "Password Changed" },
  ANALYSIS_CREATED:   { icon: <Clock size={14} />, color: "#60a5fa", label: "Analysis Created" },
  ANALYSIS_VIEWED:    { icon: <Eye size={14} />, color: "#a78bfa", label: "Analysis Viewed" },
  ANALYSIS_UPDATED:   { icon: <Edit size={14} />, color: "#38bdf8", label: "Analysis Updated" },
  ANALYSIS_DELETED:   { icon: <Trash2 size={14} />, color: "#f87171", label: "Deleted" },
  ANALYSIS_FAILED:    { icon: <AlertTriangle size={14} />, color: "#fb923c", label: "Analysis Failed" },
  CSV_EXPORTED:       { icon: <Download size={14} />, color: "#34d399", label: "CSV Export" },
};

export default function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const limit = 30;

  useEffect(() => { loadLogs(); }, [offset]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(limit, offset);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = filter === "ALL" ? logs : logs.filter(l => l.action === filter);
  const actions = Object.keys(ACTION_META);

  if (loading) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading audit logs...</div>;

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")} label="All" />
        {actions.map(a => (
          <FilterPill key={a} active={filter === a} onClick={() => setFilter(a)} label={ACTION_META[a].label} color={ACTION_META[a].color} />
        ))}
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.length === 0 && <div style={{ color: "#475569", padding: 30, textAlign: "center" }}>No logs match this filter.</div>}
        {filtered.map((log) => {
          const meta = ACTION_META[log.action] || { icon: <Clock size={14} />, color: "#94a3b8", label: log.action };
          const dt = new Date(log.timestamp);
          return (
            <div key={log.id} style={{
              display: "flex", gap: 12, padding: "10px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.01)", borderLeft: `3px solid ${meta.color}`,
              alignItems: "flex-start", transition: "background 0.15s",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: `${meta.color}15`, color: meta.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{meta.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{meta.label}</span>
                  <span style={{ fontSize: 10, color: "#475569", whiteSpace: "nowrap", fontFamily: "DM Mono, monospace" }}>
                    {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>{log.details}</div>
                <div style={{ fontSize: 10, color: "#334155", marginTop: 3 }}>IP: {log.ip}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <PageBtn disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} label="← Previous" />
          <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <PageBtn disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} label="Next →" />
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "inherit",
      border: active ? `1px solid ${color || "#fbbf24"}` : "1px solid rgba(255,255,255,0.05)",
      background: active ? `${color || "#fbbf24"}15` : "transparent",
      color: active ? (color || "#fbbf24") : "#64748b", cursor: "pointer", transition: "all 0.15s",
    }}>{label}</button>
  );
}

function PageBtn({ disabled, onClick, label }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 6, fontSize: 12, fontFamily: "inherit",
      border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
      color: disabled ? "#334155" : "#e2e8f0", cursor: disabled ? "not-allowed" : "pointer",
    }}>{label}</button>
  );
}
