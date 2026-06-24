import React, { useState, useEffect } from "react";
import { useAuth } from "./auth/AuthProvider";
import { fetchUserAnalyses, fetchUserStats, deleteUserAnalysis, fetchAnalysis } from "../services/apiService";

export default function HistoryScreen({ onSelectAnalysis, onBack, theme }) {
  const { getToken, isSignedIn } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Unable to retrieve auth token. Please sign in again.");
      }
      
      const [historyData, statsData] = await Promise.all([
        fetchUserAnalyses(token),
        fetchUserStats(token)
      ]);
      
      setAnalyses(historyData);
      setStats(statsData);
    } catch (err) {
      console.error("Error loading history data:", err);
      setError(err.message || "Failed to load statement history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  const handleView = async (id) => {
    setLoading(true);
    try {
      const details = await fetchAnalysis(id);
      onSelectAnalysis(details);
    } catch (err) {
      setError("Failed to open statement details. Please try again.");
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this statement from your history?")) {
      return;
    }
    setDeletingId(id);
    try {
      const token = await getToken();
      await deleteUserAnalysis(id, token);
      
      // Update local state instead of reloading everything
      setAnalyses(prev => prev.filter(a => a.id !== id));
      // Re-trigger stats reload
      const newStats = await fetchUserStats(token);
      setStats(newStats);
    } catch (err) {
      alert("Failed to delete statement: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAnalyses = analyses.filter(a => {
    const query = search.toLowerCase();
    const bank = (a.bank || "").toLowerCase();
    const period = (a.period || "").toLowerCase();
    const holder = (a.account_holder || "").toLowerCase();
    return bank.includes(query) || period.includes(query) || holder.includes(query);
  });

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || "—";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr || "—";
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (!isSignedIn) {
    return (
      <div style={styles.root}>
        <div style={styles.card}>
          <h2 style={styles.title}>Access Denied</h2>
          <p style={styles.subtitle}>Please sign in to view your statement history.</p>
          <button onClick={onBack} style={styles.backBtn}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <style>{`
        .history-search:focus {
          border-color: #fbbf24 !important;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
        }
        .history-row {
          transition: all 0.2s ease;
        }
        .history-row:hover {
          background: var(--app-hover-bg) !important;
          transform: translateX(4px);
        }
        .history-btn:hover {
          transform: translateY(-1px);
        }
        .history-btn:active {
          transform: translateY(0);
        }
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .history-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {/* Header Section */}
        <div className="history-header" style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Analysis History</h1>
            <p style={styles.pageSubtitle}>View and manage your past AI-analyzed bank statements</p>
          </div>
          <button onClick={onBack} style={styles.backBtn}>← Back to Upload</button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Stats Strip */}
        {stats && (
          <div className="stats-grid" style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Statements</span>
              <span style={styles.statValue}>{stats.total_analyses}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Spend Tracked</span>
              <span style={styles.statValue}>{formatCurrency(stats.total_spend_tracked)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Avg Transactions</span>
              <span style={styles.statValue}>{stats.avg_transactions}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Top Bank</span>
              <span style={styles.statValue} title={stats.top_bank}>{stats.top_bank || "N/A"}</span>
            </div>
          </div>
        )}

        {/* List Card */}
        <div style={styles.card}>
          {/* Search bar */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search by bank name, period, or account holder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="history-search"
              style={styles.searchInput}
            />
            {loading && <span style={styles.loaderIcon}>⏳</span>}
          </div>

          {loading && analyses.length === 0 ? (
            <div style={styles.emptyContainer}>
              <div style={styles.spinner} />
              <p style={styles.emptyText}>Loading your history...</p>
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <div style={styles.emptyContainer}>
              <span style={{ fontSize: 48 }}>📂</span>
              <h3 style={{ marginTop: 12, color: "var(--app-text-h)" }}>No statements found</h3>
              <p style={{ color: "var(--app-text-muted)", fontSize: 13, marginTop: 4 }}>
                {search ? "Try refining your search query." : "Upload a statement to begin your tracking history!"}
              </p>
            </div>
          ) : (
            <div style={styles.listContainer}>
              {filteredAnalyses.map((item) => (
                <div
                  key={item.id}
                  className="history-row"
                  style={styles.row}
                  onClick={() => handleView(item.id)}
                >
                  <div style={styles.rowMain}>
                    <div style={styles.rowLeft}>
                      <span style={styles.bankName}>{item.bank || "Unknown Bank"}</span>
                      <span style={styles.periodText}>{item.period || "No statement period"}</span>
                      <span style={styles.dateText}>Uploaded {formatDate(item.created_at)}</span>
                    </div>
                    <div style={styles.rowRight}>
                      <div style={styles.rowStats}>
                        <span style={styles.spendVal}>{formatCurrency(item.total_spent)}</span>
                        <span style={styles.txnLabel}>{item.transaction_count || 0} txn</span>
                      </div>
                      <div style={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="history-btn"
                          onClick={() => handleView(item.id)}
                          disabled={deletingId === item.id || loading}
                          style={styles.viewBtn}
                        >
                          Open ➔
                        </button>
                        <button
                          className="history-btn"
                          onClick={(e) => handleDelete(item.id, e)}
                          disabled={deletingId === item.id || loading}
                          style={styles.deleteBtn}
                          title="Delete from history"
                        >
                          {deletingId === item.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    background: "var(--app-bg)",
    minHeight: "calc(100vh - 77px)",
    color: "var(--app-text)",
    fontFamily: "'DM Sans', sans-serif",
    padding: "32px 16px",
  },
  container: {
    maxWidth: 900,
    width: "100%",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: "var(--app-text-h)",
    background: "linear-gradient(135deg, var(--app-text-h) 0%, var(--app-text-darker) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "var(--app-text-muted)",
    marginTop: 4,
  },
  backBtn: {
    background: "var(--app-card-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: 8,
    padding: "8px 16px",
    color: "var(--app-text)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: "var(--app-card-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: 12,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "var(--app-text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--app-text-h)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  card: {
    background: "var(--app-card-solid)",
    border: "1px solid var(--app-border)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
  },
  searchContainer: {
    position: "relative",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    padding: "12px 16px",
    background: "var(--app-input-bg)",
    border: "1px solid var(--app-border)",
    borderRadius: 10,
    color: "var(--app-text)",
    fontSize: 14,
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  loaderIcon: {
    position: "absolute",
    right: 16,
    fontSize: 16,
  },
  errorBox: {
    marginBottom: 16,
    padding: "12px 16px",
    borderRadius: 10,
    background: "rgba(248, 113, 113, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
    color: "#fca5a5",
    fontSize: 13,
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "48px 24px",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid var(--app-border)",
    borderTopColor: "#fbbf24",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  emptyText: {
    color: "var(--app-text-muted)",
    fontSize: 14,
    marginTop: 16,
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    border: "1px solid var(--app-border)",
    background: "rgba(255,255,255,0.01)",
    borderRadius: 12,
    padding: "16px",
    cursor: "pointer",
  },
  rowMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  rowLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--app-text-h)",
  },
  periodText: {
    fontSize: 13,
    color: "var(--app-text)",
    fontWeight: 500,
  },
  dateText: {
    fontSize: 11,
    color: "var(--app-text-darker)",
    fontWeight: 500,
  },
  rowRight: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    justifyContent: "space-between",
  },
  rowStats: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  spendVal: {
    fontSize: 16,
    fontWeight: 700,
    color: "#34d399",
  },
  txnLabel: {
    fontSize: 11,
    color: "var(--app-text-muted)",
    fontWeight: 600,
  },
  rowActions: {
    display: "flex",
    gap: 8,
  },
  viewBtn: {
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.25)",
    color: "#fbbf24",
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  deleteBtn: {
    background: "rgba(248, 113, 113, 0.1)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
    color: "#fca5a5",
    padding: "6px 10px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--app-text-h)",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "var(--app-text-muted)",
    marginBottom: 20,
  }
};
