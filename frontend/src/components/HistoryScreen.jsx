import { useEffect, useState } from "react";
import {
  Search,
  Eye,
  Trash2,
  History,
  Files,
  ReceiptText,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "./auth/AuthProvider";
import {
  fetchUserAnalyses,
  fetchUserStats,
  fetchAnalysis,
  deleteUserAnalysis,
} from "../services/apiService";
import { formatCurrency } from "../lib/format";
import {
  Card,
  Button,
  StatCard,
  Skeleton,
  InlineError,
  EmptyState,
  ConfirmDialog,
  Pagination,
} from "./ui/PortalUI";
export default function HistoryScreen({ onSelectAnalysis, onBack }) {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState({
    items: [],
    stats: null,
    loading: true,
    error: "",
  });
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!isSignedIn)
      return () => {
        active = false;
      };
    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const token = await getToken();
        const [items, stats] = await Promise.all([
          fetchUserAnalyses(token),
          fetchUserStats(token),
        ]);
        if (active) setState({ items, stats, loading: false, error: "" });
      } catch (error) {
        if (active)
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message,
          }));
      }
    }
    void load();
    return () => {
      active = false;
    };
    // Auth adapter functions change identity; reload only on session or explicit refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, revision]);
  const items = state.items.filter((row) =>
    `${row.bank} ${row.period}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function open(id) {
    setPending(true);
    try {
      onSelectAnalysis(
        await fetchAnalysis(id, { userToken: await getToken() }),
      );
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    } finally {
      setPending(false);
    }
  }
  async function remove() {
    setPending(true);
    try {
      await deleteUserAnalysis(deleting.id, await getToken());
      setDeleting(null);
      setRevision((v) => v + 1);
      setOffset(0);
    } catch (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    } finally {
      setPending(false);
    }
  }
  if (!isSignedIn)
    return (
      <Card>
        <EmptyState
          title="Your history starts when you sign in"
          message="Sign in using the account control, then upload a statement to save it to your personal history."
          action={<Button onClick={onBack}>New analysis</Button>}
        />
      </Card>
    );
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">YOUR STATEMENT LIBRARY</p>
          <h1>History</h1>
          <p>Your past analyses, ready when you need them.</p>
        </div>
        <Button onClick={onBack}>
          <Files size={14} />
          New analysis
        </Button>
      </div>
      {state.stats && (
        <div className="p-stats">
          <StatCard
            label="Saved statements"
            value={state.stats.total_analyses}
            detail="In your personal history"
            icon={History}
          />
          <StatCard
            label="Transactions"
            value={state.stats.total_transactions}
            detail="Across saved analyses"
            icon={ReceiptText}
          />
          <StatCard
            label="Tracked net spending"
            value={formatCurrency(state.stats.total_spend_tracked)}
            detail="Across saved statements; periods may overlap"
            icon={IndianRupee}
          />
          <StatCard
            label="Most used bank"
            value={state.stats.top_bank}
            detail="By number of statements"
          />
        </div>
      )}
      <InlineError
        message={state.error}
        onRetry={() => setRevision((v) => v + 1)}
      />
      <Card>
        <div className="p-toolbar">
          <div className="p-search">
            <Search size={15} />
            <input
              className="p-input"
              aria-label="Search statement history"
              placeholder="Search bank or statement period…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <Button onClick={() => setRevision((v) => v + 1)}>Refresh</Button>
        </div>
        {state.loading ? (
          <Skeleton label="Loading statement history…" />
        ) : !items.length ? (
          <EmptyState
            title="No matching statements"
            message="Upload a statement or change your search to see your history."
          />
        ) : (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Statement</th>
                  <th>Analyzed</th>
                  <th>Transactions</th>
                  <th>Net spending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(offset, offset + 25).map((row) => (
                  <tr key={row.id}>
                    <td className="merchant-name">
                      {row.bank || "Bank statement"}
                      <small>{row.period || "Period unavailable"}</small>
                    </td>
                    <td>
                      {new Date(row.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td>{row.transaction_count}</td>
                    <td className="p-amount">
                      {formatCurrency(row.total_spent)}
                    </td>
                    <td>
                      <div className="p-row-actions">
                        <Button
                          disabled={pending}
                          onClick={() => open(row.id)}
                          aria-label={`Open ${row.bank || "statement"}`}
                        >
                          <Eye size={15} />
                        </Button>
                        <Button
                          disabled={pending}
                          onClick={() => setDeleting(row)}
                          aria-label={`Delete ${row.bank || "statement"}`}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          total={items.length}
          limit={25}
          offset={offset}
          onChange={setOffset}
        />
      </Card>
      {deleting && (
        <ConfirmDialog
          title="Delete this statement?"
          pending={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        >
          This permanently removes the saved analysis from your history.
        </ConfirmDialog>
      )}
    </>
  );
}
