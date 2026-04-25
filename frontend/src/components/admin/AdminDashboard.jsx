import React, { useEffect, useState } from "react";
import { fetchAnalyses, fetchStats, deleteAnalysis, fetchAnalysis, updateAnalysis } from "../../services/apiService";
import { Database, FileText, IndianRupee, Activity, LogOut, Trash2, Eye, Settings, Download } from "lucide-react";
import AdminSettingsModal from "./AdminSettingsModal";
import ConfirmToast from "./ConfirmToast";
import ExpenseManager from "../ExpenseManager";

export default function AdminDashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingAnalysisData, setViewingAnalysisData] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [analysesData, statsData] = await Promise.all([
        fetchAnalyses(),
        fetchStats()
      ]);
      setAnalyses(analysesData);
      setStats(statsData);
    } catch (err) {
      if (err.message === "Unauthorized") {
        sessionStorage.removeItem("admin_token");
        window.location.hash = "#/admin/login";
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAnalysis(deletingId);
      loadData(); // Reload
      setDeletingId(null);
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleExportCSV = () => {
    if (analyses.length === 0) return;
    
    // Create CSV headers
    const headers = ["Date", "Period", "Bank", "Account Holder", "Transactions", "Total Spent"];
    
    // Create CSV rows
    const rows = analyses.map(a => [
      new Date(a.created_at).toLocaleDateString(),
      `"${a.period}"`,
      `"${a.bank || ''}"`,
      `"${a.account_holder || ''}"`,
      a.transaction_count,
      a.total_spent
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expense_analyses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    window.location.hash = "#/";
  };

  const handleViewAnalysis = async (id) => {
    try {
      setLoadingAnalysis(true);
      const data = await fetchAnalysis(id);
      setViewingAnalysisData(data);
    } catch (err) {
      alert("Failed to load analysis details");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleUpdateTransaction = async (idx, field, val) => {
    if (!viewingAnalysisData) return;
    const updatedData = { ...viewingAnalysisData };
    if (!updatedData.transactions) return;
    updatedData.transactions[idx][field] = val;
    setViewingAnalysisData(updatedData);
    try {
      await updateAnalysis(updatedData.id, updatedData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchUpdateCategory = async (desc, newCat) => {
    if (!viewingAnalysisData) return;
    const updatedData = { ...viewingAnalysisData };
    if (!updatedData.transactions) return;
    updatedData.transactions.forEach((t) => {
      if (t.desc === desc) t.cat = newCat;
    });
    setViewingAnalysisData(updatedData);
    try {
      await updateAnalysis(updatedData.id, updatedData);
    } catch (e) {
      console.error(e);
    }
  };

  const fmt = (num) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num || 0);

  if (loading || loadingAnalysis) {
    return <div style={{ color: "#fff", padding: "40px", textAlign: "center", fontFamily: "Inter" }}>Loading...</div>;
  }

  if (viewingAnalysisData) {
    return (
      <ExpenseManager 
        data={viewingAnalysisData} 
        onBack={() => setViewingAnalysisData(null)} 
        backLabel="Back to Admin"
        onUpdateTransaction={handleUpdateTransaction}
        onBatchUpdateCategory={handleBatchUpdateCategory}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ 
        background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)", 
        borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#fbbf24", color: "#000", padding: "6px", borderRadius: "8px" }}>
            <Database size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Admin Portal</h2>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <a href="#/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            Back to App
          </a>
          <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.1)" }}></div>
          <button onClick={() => setShowSettings(true)} style={{ 
            background: "transparent", border: "none", color: "#e2e8f0", 
            cursor: "pointer", display: "flex", alignItems: "center", padding: "6px"
          }} title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={handleLogout} style={{ 
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fca5a5", 
            padding: "6px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px"
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <StatCard icon={<FileText />} title="Total Analyses" value={stats?.total_analyses || 0} />
          <StatCard icon={<IndianRupee />} title="Total Spend Tracked" value={fmt(stats?.total_spend_tracked)} color="#34d399" />
          <StatCard icon={<Activity />} title="Total Transactions" value={stats?.total_transactions || 0} color="#60a5fa" />
          <StatCard icon={<Database />} title="Top Bank" value={stats?.top_bank || "N/A"} color="#a78bfa" />
        </div>

        {/* Table */}
        <div style={{ background: "#0f172a", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Stored Analyses</h3>
            <button onClick={handleExportCSV} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0",
              padding: "6px 12px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
            }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)", color: "#94a3b8" }}>
                  <th style={{ padding: "12px 20px", fontWeight: "500" }}>Date</th>
                  <th style={{ padding: "12px 20px", fontWeight: "500" }}>Period</th>
                  <th style={{ padding: "12px 20px", fontWeight: "500" }}>Account</th>
                  <th style={{ padding: "12px 20px", fontWeight: "500" }}>Transactions</th>
                  <th style={{ padding: "12px 20px", fontWeight: "500", textAlign: "right" }}>Total Spent</th>
                  <th style={{ padding: "12px 20px", fontWeight: "500", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analyses.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>No analyses found.</td>
                  </tr>
                ) : analyses.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "16px 20px", color: "#cbd5e1" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: "13px" }}>{a.period}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ color: "#e2e8f0" }}>{a.bank}</div>
                      <div style={{ color: "#64748b", fontSize: "12px" }}>{a.account_holder || "Unknown"}</div>
                    </td>
                    <td style={{ padding: "16px 20px", color: "#94a3b8" }}>{a.transaction_count}</td>
                    <td style={{ padding: "16px 20px", textAlign: "right", color: "#fca5a5", fontFamily: "DM Mono, monospace" }}>
                      {fmt(a.total_spent)}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                        <button onClick={() => handleViewAnalysis(a.id)} style={{ background: "transparent", border: "1px solid #334155", color: "#e2e8f0", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="View Details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => setDeletingId(a.id)} style={{ background: "transparent", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals & Toasts */}
      {showSettings && <AdminSettingsModal onClose={() => setShowSettings(false)} />}
      
      <ConfirmToast 
        show={!!deletingId} 
        message="Are you sure you want to delete this analysis?" 
        subMessage="This action cannot be undone."
        onConfirm={confirmDelete} 
        onCancel={() => setDeletingId(null)} 
      />
    </div>
  );
}

function StatCard({ icon, title, value, color = "#fbbf24" }) {
  return (
    <div style={{ 
      background: "#0f172a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", 
      padding: "20px", display: "flex", alignItems: "center", gap: "16px" 
    }}>
      <div style={{ 
        width: "48px", height: "48px", borderRadius: "12px", background: `${color}15`, 
        color: color, display: "flex", alignItems: "center", justifyContent: "center" 
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>{title}</div>
        <div style={{ color: "#fff", fontSize: "24px", fontWeight: "700" }}>{value}</div>
      </div>
    </div>
  );
}
