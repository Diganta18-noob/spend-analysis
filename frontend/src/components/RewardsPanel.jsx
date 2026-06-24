import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const CAT_COLORS = {
  "Shopping": "#f472b6",
  "Food & Dining": "#f87171",
  "Healthcare": "#2dd4bf",
  "Groceries": "#a3e635",
  "Bills & Subscriptions": "#fb923c",
  "Transport": "#60a5fa",
  "Entertainment": "#c084fc",
  "Education": "#818cf8",
  "Office Food": "#fbbf24",
  "Personal Transfer": "#34d399",
  "Self Transfer": "#6b7280",
  "Rent": "#a78bfa",
  "Insurance": "#22d3ee",
  "Other": "#94a3b8",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 8, padding: "8px 14px" }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>{d?.name || ""}</div>
      <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{payload[0]?.value} pts</div>
      {d?.spend != null && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Spend: {fmt(d.spend)}</div>}
    </div>
  );
};

export default function RewardsPanel({ transactions, totalRewardPoints }) {
  // Calculate reward stats
  const rewardStats = useMemo(() => {
    const txnsWithPoints = transactions.filter(t => t.reward_points != null);
    if (txnsWithPoints.length === 0) return null;

    const totalPoints = totalRewardPoints ?? txnsWithPoints.reduce((s, t) => s + (t.reward_points || 0), 0);
    const positivePoints = txnsWithPoints.filter(t => t.reward_points > 0);
    const negativePoints = txnsWithPoints.filter(t => t.reward_points < 0);
    const zeroPoints = txnsWithPoints.filter(t => t.reward_points === 0);

    // Category breakdown
    const catMap = {};
    txnsWithPoints.forEach(t => {
      if (!catMap[t.cat]) catMap[t.cat] = { points: 0, spend: 0, count: 0 };
      catMap[t.cat].points += (t.reward_points || 0);
      catMap[t.cat].spend += t.amount;
      catMap[t.cat].count++;
    });

    const byCategory = Object.entries(catMap)
      .map(([name, v]) => ({ name, ...v, rate: v.spend > 0 ? (v.points / v.spend * 100).toFixed(2) : "0" }))
      .sort((a, b) => b.points - a.points);

    // Best single transaction
    const bestTxn = txnsWithPoints.reduce((best, t) => t.reward_points > (best?.reward_points || 0) ? t : best, null);

    // Points per ₹100 overall
    const totalSpend = txnsWithPoints.reduce((s, t) => s + t.amount, 0);
    const overallRate = totalSpend > 0 ? (totalPoints / totalSpend * 100).toFixed(2) : 0;

    return {
      totalPoints,
      totalSpend,
      overallRate,
      positiveCount: positivePoints.length,
      negativeCount: negativePoints.length,
      zeroCount: zeroPoints.length,
      negativeTotal: negativePoints.reduce((s, t) => s + t.reward_points, 0),
      byCategory,
      bestTxn,
      txnsWithPoints: txnsWithPoints.sort((a, b) => (b.reward_points || 0) - (a.reward_points || 0)),
    };
  }, [transactions, totalRewardPoints]);

  if (!rewardStats) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
        <div style={{ fontSize: 14 }}>No reward points data found in this statement.</div>
        <div style={{ fontSize: 12, marginTop: 6, color: "#334155" }}>Upload a credit card statement that includes a reward points column.</div>
      </div>
    );
  }

  const styles = {
    card: { background: "var(--app-card-bg)", border: "1px solid var(--app-border)", borderRadius: 14, padding: 18, transition: "background 0.3s ease, border-color 0.3s ease" },
    label: { fontSize: 10, color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6, fontWeight: 600 },
  };

  return (
    <div>
      <style>{`
        @keyframes pointsCountUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerGold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .rewards-hero {
          background: linear-gradient(135deg, #1a1000 0%, #2d1800 30%, #1a0f00 60%, #0f0f1e 100%);
          border: 1px solid #3d2800;
          border-radius: 16px;
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .light-mode .rewards-hero {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fde68a40 60%, #ffffff 100%);
          border-color: #f59e0b40;
        }
        .rewards-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .rewards-hero::after {
          content: '✦';
          position: absolute;
          top: 16px;
          right: 24px;
          font-size: 28px;
          color: #fbbf2440;
          animation: starPulse 3s infinite ease-in-out;
        }
        .points-num {
          font-size: 48px;
          font-weight: 900;
          background: linear-gradient(90deg, #fbbf24, #f59e0b, #fcd34d, #fbbf24);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerGold 3s linear infinite, pointsCountUp 0.6s ease-out;
          line-height: 1;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .reward-txn-row:hover td {
          background: rgba(251, 191, 36, 0.03) !important;
        }
        .pts-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
        }
        .pts-positive { background: #fbbf2418; color: #fbbf24; }
        .pts-negative { background: #f8717118; color: #f87171; }
        .pts-zero { background: #64748b18; color: #64748b; }
      `}</style>

      {/* Hero Card */}
      <div className="rewards-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Reward Points Earned</span>
          </div>
          <div className="points-num">{rewardStats.totalPoints.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 12, color: "#92702a", marginTop: 8 }}>
            points from <strong style={{ color: "#d4a020" }}>{rewardStats.positiveCount}</strong> earning transactions · <strong style={{ color: "#d4a020" }}>{fmt(rewardStats.totalSpend)}</strong> total spend
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "Points/₹100", value: rewardStats.overallRate, icon: "📊" },
              { label: "Best Transaction", value: `${rewardStats.bestTxn?.reward_points || 0} pts`, icon: "🏆", sub: rewardStats.bestTxn?.desc?.substring(0, 25) },
              { label: "Zero-Point Txns", value: rewardStats.zeroCount, icon: "⚠️" },
              ...(rewardStats.negativeCount > 0 ? [{ label: "Points Reversed", value: rewardStats.negativeTotal, icon: "🔄" }] : []),
            ].map((s, i) => (
              <div key={i} style={{ minWidth: 120 }}>
                <div style={{ fontSize: 10, color: "#7a6530", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{s.icon}</span> {s.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24", fontFamily: "DM Mono, monospace" }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 10, color: "#6b5c30", marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown & Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="rewards-grid">
        <style>{`
          @media (max-width: 900px) { .rewards-grid { grid-template-columns: 1fr !important; } }
        `}</style>

        <div style={styles.card}>
          <div style={styles.label}>Points by Category</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rewardStats.byCategory.filter(c => c.points > 0)} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(251, 191, 36, 0.05)" }} />
              <Bar dataKey="points" radius={[0, 6, 6, 0]} barSize={20}>
                {rewardStats.byCategory.filter(c => c.points > 0).map((c, i) => (
                  <Cell key={i} fill={CAT_COLORS[c.name] || "#fbbf24"} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Category Reward Rates</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {rewardStats.byCategory.map((c, i) => {
              const color = CAT_COLORS[c.name] || "#fbbf24";
              const maxPts = Math.max(...rewardStats.byCategory.map(x => x.points));
              const barWidth = maxPts > 0 ? Math.max((c.points / maxPts) * 100, 0) : 0;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 12, color: "var(--app-text)", fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontSize: 10, color: "#475569" }}>({c.count}×)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, color: "#64748b", fontFamily: "DM Mono, monospace" }}>{c.rate} pts/₹100</span>
                      <span className={`pts-badge ${c.points > 0 ? "pts-positive" : c.points < 0 ? "pts-negative" : "pts-zero"}`}>
                        {c.points > 0 ? "+" : ""}{c.points}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: "var(--app-border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${barWidth}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                    {fmt(c.spend)} spent
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transaction-level Points Table */}
      <div style={styles.card}>
        <div style={{ ...styles.label, marginBottom: 12 }}>Points per Transaction</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Date", "Description", "Category", "Amount", "Points"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Amount" || h === "Points" ? "right" : "left", color: "#334155", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--app-border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rewardStats.txnsWithPoints.map((t, i) => {
                const formattedDate = (() => {
                  try {
                    const d = new Date(t.date);
                    if (isNaN(d.getTime())) return t.date || "—";
                    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
                  } catch {
                    return t.date || "—";
                  }
                })();
                const color = CAT_COLORS[t.cat] || "#666";
                return (
                  <tr key={i} className="reward-txn-row">
                    <td style={{ padding: "9px 12px", color: "#475569", fontFamily: "DM Mono, monospace", fontSize: 11, whiteSpace: "nowrap", borderBottom: "1px solid var(--app-table-border)" }}>
                      {formattedDate}
                    </td>
                    <td style={{ padding: "9px 12px", color: "var(--app-text)", borderBottom: "1px solid var(--app-table-border)" }}>{t.desc}</td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--app-table-border)" }}>
                      <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + "20", color }}>
                        {t.cat}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: t.amount < 0 ? "#34d399" : "#fca5a5", fontWeight: 600, fontFamily: "DM Mono, monospace", borderBottom: "1px solid var(--app-table-border)" }}>
                      {t.amount < 0 ? `-${fmt(Math.abs(t.amount))}` : fmt(t.amount)}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: "1px solid var(--app-table-border)" }}>
                      <span className={`pts-badge ${t.reward_points > 0 ? "pts-positive" : t.reward_points < 0 ? "pts-negative" : "pts-zero"}`}>
                        {t.reward_points > 0 ? "+" : ""}{t.reward_points} ⭐
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: "10px 12px", color: "#64748b", fontSize: 12, borderTop: "2px solid var(--app-border)" }}>{rewardStats.txnsWithPoints.length} transactions</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: rewardStats.totalSpend < 0 ? "#34d399" : "#f87171", fontWeight: 700, fontFamily: "DM Mono, monospace", borderTop: "2px solid var(--app-border)" }}>
                  {rewardStats.totalSpend < 0 ? `-${fmt(Math.abs(rewardStats.totalSpend))}` : fmt(rewardStats.totalSpend)}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", borderTop: "2px solid var(--app-border)" }}>
                  <span className="pts-badge pts-positive" style={{ fontSize: 13, padding: "3px 10px" }}>
                    {rewardStats.totalPoints} ⭐
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
