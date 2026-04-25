import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Toast from "./Toast";

const CAT_META = {
  "Rent":               { color: "#a78bfa", icon: "🏠" },
  "Insurance":          { color: "#22d3ee", icon: "🛡️" },
  "Personal Transfer":  { color: "#34d399", icon: "👥" },
  "Office Food":        { color: "#fbbf24", icon: "🍽️" },
  "Food & Dining":      { color: "#f87171", icon: "🥘" },
  "Transport":          { color: "#60a5fa", icon: "🚕" },
  "Bills & Subscriptions": { color: "#fb923c", icon: "📱" },
  "Groceries":          { color: "#a3e635", icon: "🛒" },
  "Self Transfer":      { color: "#6b7280", icon: "🔁" },
  "Entertainment":      { color: "#c084fc", icon: "🎬" },
  "Shopping":           { color: "#f472b6", icon: "🛍️" },
  "Healthcare":         { color: "#2dd4bf", icon: "🏥" },
  "Education":          { color: "#818cf8", icon: "📚" },
  "Other":              { color: "#94a3b8", icon: "📌" },
};

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #2a2a40", borderRadius: 8, padding: "8px 14px" }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 3 }}>{label || payload[0]?.payload?.cat || ""}</div>
      <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{fmt(payload[0]?.value)}</div>
    </div>
  );
};

export default function ExpenseManager({ data, onBack, backLabel, onUpdateTransaction, onBatchUpdateCategory }) {
  const [showSelf, setShowSelf] = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [activeTab, setActiveTab] = useState("overview");
  const [editingTxn, setEditingTxn] = useState(null); // index of txn being edited
  const [toastData, setToastData] = useState(null); // { realIndex, newCat, desc }

  const TRANSACTIONS = data?.transactions || [];
  const insights = data?.insights || [];

  const txns = useMemo(
    () => showSelf ? TRANSACTIONS : TRANSACTIONS.filter(t => t.cat !== "Self Transfer"),
    [showSelf, TRANSACTIONS]
  );

  const selfTotal = useMemo(
    () => TRANSACTIONS.filter(t => t.cat === "Self Transfer").reduce((s, t) => s + t.amount, 0),
    [TRANSACTIONS]
  );

  const catTotals = useMemo(() => {
    const map = {};
    txns.forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amount; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [txns]);

  const totalSpent = useMemo(() => txns.reduce((s, t) => s + t.amount, 0), [txns]);

  const dailyData = useMemo(() => {
    const map = {};
    txns.forEach(t => {
      const d = parseInt(t.date.slice(8, 10));
      map[d] = (map[d] || 0) + t.amount;
    });
    const days = Object.keys(map).map(Number).sort((a, b) => a - b);
    if (days.length === 0) return [];
    const min = days[0], max = days[days.length - 1];
    return Array.from({ length: max - min + 1 }, (_, i) => i + min).map(d => ({
      day: `${d}`,
      amount: Math.round(map[d] || 0),
    }));
  }, [txns]);

  const filteredTxns = useMemo(() => {
    let arr = filterCat === "All" ? txns : txns.filter(t => t.cat === filterCat);
    if (sortBy === "amount") arr = [...arr].sort((a, b) => b.amount - a.amount);
    return arr;
  }, [txns, filterCat, sortBy]);

  const topCat = catTotals[0];
  const highestDay = dailyData.reduce((m, d) => d.amount > m.amount ? d : m, { day: "-", amount: 0 });

  const vendorMap = {};
  txns.forEach(t => {
    const key = t.desc.split("(")[0].trim();
    if (!vendorMap[key]) vendorMap[key] = { count: 0, total: 0, cat: t.cat };
    vendorMap[key].count++;
    vendorMap[key].total += t.amount;
  });
  const topVendors = Object.entries(vendorMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const recurringPayees = Object.entries(vendorMap)
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const styles = {
    root: { background: "#08080f", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", padding: "20px 24px 40px" },
    wrap: { width: "100%", maxWidth: "1800px", margin: "0 auto" },
    card: { background: "linear-gradient(135deg, #0f0f1e 0%, #11111f 100%)", border: "1px solid #1c1c35", borderRadius: 14, padding: 18 },
    label: { fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6, fontWeight: 600 },
    statVal: { fontSize: 22, fontWeight: 800, lineHeight: 1 },
    sub: { fontSize: 11, color: "#475569", marginTop: 4 },
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0f0f1e; }
        ::-webkit-scrollbar-thumb { background: #2a2a50; border-radius: 4px; }
        .tab-btn { background: transparent; border: none; cursor: pointer; padding: 8px 16px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .tab-btn.active { background: #1c1c38; color: #fbbf24; }
        .tab-btn:not(.active) { color: #475569; }
        .tab-btn:not(.active):hover { color: #94a3b8; }
        tr.tx-row:hover td { background: rgba(255,255,255,0.025) !important; }
        tr.tx-row .edit-hint { opacity: 0; transition: opacity 0.15s; }
        tr.tx-row:hover .edit-hint { opacity: 1; }
        .toggle { width: 36px; height: 20px; border-radius: 10px; background: #1c1c38; border: 1px solid #2a2a50; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .toggle.on { background: #f59e0b33; border-color: #f59e0b; }
        .toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #475569; transition: all 0.2s; }
        .toggle.on::after { left: 18px; background: #fbbf24; }
        .cat-pill { padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .cat-pill-editable { cursor: pointer; transition: all 0.15s; position: relative; }
        .cat-pill-editable:hover { filter: brightness(1.3); box-shadow: 0 0 0 1px rgba(251,191,36,0.3); }
        .cat-edit-select { appearance: none; background: #0a0a18; border: 1px solid #fbbf24; color: #fbbf24; border-radius: 8px; padding: 5px 10px; font-size: 11px; font-family: inherit; cursor: pointer; font-weight: 600; outline: none; min-width: 140px; }
        .cat-edit-select option { background: #0a0a18; color: #e2e8f0; padding: 6px; }
        select { appearance: none; background: #0f0f1e; border: 1px solid #1c1c35; color: #94a3b8; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-family: inherit; cursor: pointer; }
        select:focus { outline: none; border-color: #fbbf24; }
        .ins-card { background: #0f0f1e; border: 1px solid #1c1c35; border-radius: 10px; padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start; }
        .back-btn { background: none; border: 1px solid #1c1c35; color: #64748b; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.15s; }
        .back-btn:hover { border-color: #fbbf24; color: #fbbf24; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .grid-overview { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
        .header-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
        .summary-item { padding: 10px 16px; border-left: 1px solid #1c1c35; }
        .summary-item:first-child { border-left: none; }
        
        @media (max-width: 1200px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
          .summary-item:nth-child(3) { border-left: none; border-top: 1px solid #1c1c35; padding-top: 16px; }
          .summary-item:nth-child(4) { border-top: 1px solid #1c1c35; padding-top: 16px; }
        }
        @media (max-width: 900px) {
          .grid-overview { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .grid-4 { grid-template-columns: 1fr; }
          .grid-2 { grid-template-columns: 1fr; }
          .summary-item { border-left: none !important; border-top: 1px solid #1c1c35; padding-top: 16px; }
          .summary-item:first-child { border-top: none; padding-top: 10px; }
        }
      `}</style>

      <div style={styles.wrap}>

        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div className="header-top">
            <div>
              <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>
                {data?.bank || "Bank Statement"} {data?.account_holder ? `· ${data.account_holder}` : ""}
              </div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #fff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {data?.period || "Expense Analysis"}
              </h1>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{TRANSACTIONS.length} debit transactions extracted</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className={`toggle ${showSelf ? "on" : ""}`} onClick={() => setShowSelf(v => !v)} />
                <span style={{ fontSize: 12, color: "#64748b" }}>Self-transfers <span style={{ color: "#6b7280" }}>({fmt(selfTotal)})</span></span>
              </div>
              {onBack && <button className="back-btn" onClick={onBack}>← {backLabel || "New Analysis"}</button>}
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[
            { label: "Total Debited", val: fmt(totalSpent), sub: `${txns.length} transactions`, color: "#f87171" },
            { label: "Top Category", val: topCat?.name || "—", sub: fmt(topCat?.value || 0), color: "#a78bfa" },
            { label: "Daily Average", val: fmt(dailyData.length > 0 ? Math.round(totalSpent / dailyData.length) : 0), sub: `across ${dailyData.length} days`, color: "#60a5fa" },
            { label: "Peak Day", val: highestDay.day !== "-" ? `Day ${highestDay.day}` : "—", sub: fmt(highestDay.amount), color: "#fbbf24" },
          ].map((s, i) => (
            <div key={i} style={{ ...styles.card, borderTop: `2px solid ${s.color}30` }}>
              <div style={styles.label}>{s.label}</div>
              <div style={{ ...styles.statVal, color: s.color }}>{s.val}</div>
              <div style={styles.sub}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {["overview", "transactions", "vendors", "insights"].map(t => (
            <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div>
            <div className="grid-overview" style={{ marginBottom: 16 }}>
              <div style={styles.card}>
                <div style={styles.label}>Spend by Category</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={catTotals} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                      {catTotals.map((entry, i) => (
                        <Cell key={i} fill={CAT_META[entry.name]?.color || "#666"} opacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                  {catTotals.map((c, i) => {
                    const meta = CAT_META[c.name] || { color: "#666", icon: "•" };
                    const pct = ((c.value / totalSpent) * 100).toFixed(1);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                        onClick={() => setFilterCat(filterCat === c.name ? "All" : c.name)}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: filterCat === c.name ? "#fff" : "#64748b", flex: 1, transition: "color 0.15s" }}>{c.name}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ width: 50, height: 3, borderRadius: 2, background: "#1c1c35", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: meta.color, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, width: 60, textAlign: "right", fontFamily: "DM Mono, monospace" }}>{fmt(c.value)}</span>
                          <span style={{ fontSize: 10, color: "#475569", width: 36, textAlign: "right" }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.label}>Daily Spend</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyData} barSize={18} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#334155", fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {dailyData.map((d, i) => (
                        <Cell key={i} fill={d.amount === highestDay.amount ? "#fbbf24" : d.amount > 2000 ? "#f87171" : "#2563eb"} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                  {[{ color: "#fbbf24", label: "Peak day" }, { color: "#f87171", label: "High spend" }, { color: "#2563eb", label: "Normal" }].map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                      <span style={{ fontSize: 10, color: "#475569" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid-4" style={{ ...styles.card, gap: 0, padding: 12 }}>
              {[
                { label: "Statement Period", val: data?.period || "—" },
                { label: "Total Credits", val: data?.total_credits ? fmt(data.total_credits) : "—" },
                { label: "Closing Balance", val: data?.closing_balance != null ? `${fmt(data.closing_balance)} CR` : "—" },
                { label: "Opening Balance", val: data?.opening_balance != null ? `${fmt(data.opening_balance)} CR` : "—" },
              ].map((s, i) => (
                <div key={i} className="summary-item">
                  <div style={{ ...styles.label, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", fontFamily: "DM Mono, monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === "transactions" && (
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={styles.label}>All Transactions</div>
                {filterCat !== "All" && (
                  <span className="cat-pill" onClick={() => setFilterCat("All")}
                    style={{ background: (CAT_META[filterCat]?.color || "#666") + "25", color: CAT_META[filterCat]?.color || "#666", cursor: "pointer" }}>
                    {filterCat} ×
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="All">All Categories</option>
                  {Object.keys(CAT_META).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="date">Date ↑</option>
                  <option value="amount">Amount ↓</option>
                </select>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Date", "Description", "Category", "Amount"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: h === "Amount" ? "right" : "left", color: "#334155", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #1c1c35" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((t, i) => {
                    const meta = CAT_META[t.cat] || { color: "#666", icon: "•" };
                    const d = new Date(t.date);
                    // Find the real index in TRANSACTIONS (not filtered)
                    const realIndex = TRANSACTIONS.indexOf(t);
                    const isEditing = editingTxn === realIndex;
                    return (
                      <tr key={i} className="tx-row">
                        <td style={{ padding: "9px 12px", color: "#475569", fontFamily: "DM Mono, monospace", fontSize: 11, whiteSpace: "nowrap", borderBottom: "1px solid #0d0d1a" }}>
                          {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </td>
                        <td style={{ padding: "9px 12px", color: "#cbd5e1", borderBottom: "1px solid #0d0d1a" }}>{t.desc}</td>
                        <td style={{ padding: "9px 12px", borderBottom: "1px solid #0d0d1a" }}>
                          {isEditing ? (
                            <select
                              className="cat-edit-select"
                              value={t.cat}
                              autoFocus
                              onChange={(e) => {
                                setToastData({ realIndex, newCat: e.target.value, desc: t.desc });
                                setEditingTxn(null);
                              }}
                              onBlur={() => setEditingTxn(null)}
                            >
                              {Object.keys(CAT_META).map(c => (
                                <option key={c} value={c}>{CAT_META[c].icon} {c}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className="cat-pill cat-pill-editable"
                              style={{ background: meta.color + "20", color: meta.color }}
                              onClick={() => setEditingTxn(realIndex)}
                              title="Click to change category"
                            >
                              {meta.icon} {t.cat} <span className="edit-hint" style={{ marginLeft: 4, fontSize: 9 }}>✏️</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", color: "#fca5a5", fontWeight: 600, fontFamily: "DM Mono, monospace", borderBottom: "1px solid #0d0d1a" }}>{fmt(t.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ padding: "10px 12px", color: "#64748b", fontSize: 12, borderTop: "2px solid #1c1c35" }}>{filteredTxns.length} transactions</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#f87171", fontWeight: 700, fontFamily: "DM Mono, monospace", borderTop: "2px solid #1c1c35" }}>{fmt(filteredTxns.reduce((s, t) => s + t.amount, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── VENDORS TAB ── */}
        {activeTab === "vendors" && (
          <div className="grid-2">
            <div style={styles.card}>
              <div style={{ ...styles.label, marginBottom: 16 }}>Top Payees by Total Spend</div>
              {topVendors.map((v, i) => {
                const meta = CAT_META[v.cat] || { color: "#666" };
                const pct = (v.total / totalSpent * 100).toFixed(1);
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{v.name}</span>
                        <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>{v.count}×</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, fontFamily: "DM Mono, monospace" }}>{fmt(v.total)}</span>
                    </div>
                    <div style={{ height: 4, background: "#1c1c35", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: meta.color, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span className="cat-pill" style={{ background: meta.color + "15", color: meta.color, padding: "1px 6px" }}>{v.cat}</span>
                      <span style={{ fontSize: 10, color: "#475569" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={styles.card}>
              <div style={{ ...styles.label, marginBottom: 10 }}>Recurring Payees</div>
              {recurringPayees.map((r, i) => {
                const meta = CAT_META[r.cat] || { color: "#666" };
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, paddingBottom: 10, borderBottom: i < recurringPayees.length - 1 ? "1px solid #0f0f1a" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: meta.color + "20", border: `1px solid ${meta.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: meta.color, fontWeight: 700 }}>{r.count}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{r.name}</span>
                        <span style={{ fontSize: 12, color: meta.color, fontFamily: "DM Mono, monospace", fontWeight: 700 }}>{fmt(r.total)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{r.cat}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === "insights" && (
          <div className="grid-2">
            {insights.map((ins, i) => (
              <div key={i} className="ins-card" style={{ borderLeft: `3px solid ${ins.color || "#fbbf24"}` }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{ins.icon}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{ins.title}</span>
                    <span style={{ fontSize: 9, color: ins.color || "#fbbf24", background: (ins.color || "#fbbf24") + "20", padding: "1px 6px", borderRadius: 10, fontWeight: 700, letterSpacing: "0.5px" }}>{ins.badge}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{ins.body}</p>
                </div>
              </div>
            ))}
            {insights.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#475569" }}>
                No insights available for this analysis.
              </div>
            )}
          </div>
        )}
      </div>

      <Toast 
        show={!!toastData}
        txnDesc={toastData?.desc}
        newCat={toastData?.newCat}
        onDismiss={() => setToastData(null)}
        onApplyOne={() => {
          onUpdateTransaction(toastData.realIndex, "cat", toastData.newCat);
          setToastData(null);
        }}
        onApplyAll={() => {
          if (typeof onBatchUpdateCategory === "function") {
            onBatchUpdateCategory(toastData.desc, toastData.newCat);
          } else {
            // Fallback just in case
            onUpdateTransaction(toastData.realIndex, "cat", toastData.newCat);
          }
          setToastData(null);
        }}
      />
    </div>
  );
}
