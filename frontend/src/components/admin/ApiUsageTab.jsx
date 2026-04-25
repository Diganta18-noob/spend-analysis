import React, { useEffect, useState } from "react";
import { fetchApiUsage } from "../../services/apiService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Zap, CheckCircle, XCircle, Clock } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 8, padding: "8px 14px" }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>{label}</div>
      <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{payload[0]?.value} calls</div>
    </div>
  );
};

export default function ApiUsageTab() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiUsage().then(data => { setUsage(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading API usage...</div>;
  if (!usage) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>No API usage data yet.</div>;

  const { aggregate, daily } = usage;
  const successRate = aggregate.total_calls > 0 ? ((aggregate.successful_calls / aggregate.total_calls) * 100).toFixed(1) : "0";
  // Rough cost estimate: Gemini Flash is ~$0.075/1M input tokens
  const estimatedCost = ((aggregate.total_tokens_estimated / 1_000_000) * 0.075).toFixed(4);

  const chartData = daily.map(d => ({
    date: d.date.slice(5), // MM-DD
    calls: d.total_calls,
    failed: d.failed_calls,
  }));

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MiniCard icon={<Zap size={18} />} color="#fbbf24" title="Total API Calls" value={aggregate.total_calls} />
        <MiniCard icon={<CheckCircle size={18} />} color="#34d399" title="Success Rate" value={`${successRate}%`} />
        <MiniCard icon={<Clock size={18} />} color="#60a5fa" title="Avg Latency" value={`${aggregate.avg_latency_ms}ms`} />
        <MiniCard icon={<XCircle size={18} />} color="#f87171" title="Failed Calls" value={aggregate.failed_calls} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: "#0a0a18", borderRadius: 12, border: "1px solid #1c1c35", padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 12 }}>
            Daily API Calls (Last 30 Days)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={14} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#334155", fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.failed > 0 ? "#f87171" : "#fbbf24"} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Token & Cost Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#0a0a18", borderRadius: 12, border: "1px solid #1c1c35", padding: 16 }}>
          <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 8 }}>Estimated Tokens</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa", fontFamily: "DM Mono, monospace" }}>
            {aggregate.total_tokens_estimated.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>across {aggregate.total_calls} API calls</div>
        </div>
        <div style={{ background: "#0a0a18", borderRadius: 12, border: "1px solid #1c1c35", padding: 16 }}>
          <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 8 }}>Est. Cost (30d)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399", fontFamily: "DM Mono, monospace" }}>
            ${estimatedCost}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Gemini Flash pricing</div>
        </div>
      </div>

      {/* Recent Errors */}
      {daily.some(d => d.errors?.length > 0) && (
        <div style={{ marginTop: 20, background: "#0a0a18", borderRadius: 12, border: "1px solid rgba(248,113,113,0.15)", padding: 16 }}>
          <div style={{ fontSize: 11, color: "#f87171", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 10 }}>Recent Errors</div>
          {daily.filter(d => d.errors?.length > 0).slice(-3).flatMap(d => d.errors.slice(-3).map((e, i) => (
            <div key={`${d.date}-${i}`} style={{ fontSize: 12, color: "#fca5a5", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
              <span style={{ color: "#475569", fontFamily: "DM Mono, monospace", fontSize: 10, marginRight: 8 }}>
                {new Date(e.time).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              {e.message}
            </div>
          )))}
        </div>
      )}
    </div>
  );
}

function MiniCard({ icon, color, title, value }) {
  return (
    <div style={{
      background: "#0a0a18", border: "1px solid #1c1c35", borderRadius: 12,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: `${color}15`,
        color, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div>
        <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>{title}</div>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>{value}</div>
      </div>
    </div>
  );
}
