import { useState, useCallback } from "react";
import { LogOut, Settings, ArrowLeft } from "lucide-react";
import PortalShell from "../layout/PortalShell";
import { Button, InlineError, ConfirmDialog, Tabs } from "../ui/PortalUI";
import ExpenseManager from "../ExpenseManager";
import AdminOverview from "./AdminOverview";
import AnalysisTable from "./AnalysisTable";
import AnalysisDetailDrawer from "./AnalysisDetailDrawer";
import AdminSettingsModal from "./AdminSettingsModal";
import ApiUsageTab from "./ApiUsageTab";
import AuditLogTab from "./AuditLogTab";
import {
  fetchAnalyses,
  fetchAnalysis,
  deleteAnalysis,
  exportAnalyses,
} from "../../services/apiService";
import { useResource } from "../../hooks/useResource";
import { useAnalysisPersistence } from "../../hooks/useAnalysisPersistence";
const defaults = {
  query: "",
  bank: "",
  from: "",
  to: "",
  limit: 25,
  offset: 0,
};
export default function AdminDashboard({ theme, toggleTheme }) {
  const [view, setView] = useState("overview");
  const [filters, setFilters] = useState(defaults);
  const [settings, setSettings] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [fullData, setFullData] = useState(null);
  const [fullView, setFullView] = useState("overview");
  const persistence = useAnalysisPersistence({
    analysis: fullData,
    onChange: setFullData,
    admin: true,
  });
  const list = useResource(
    () =>
      fetchAnalyses({
        ...filters,
        ...(view === "quality" ? { quality: "review" } : {}),
      }),
    [filters, view],
  );
  const detail = useResource(
    () =>
      detailId
        ? fetchAnalysis(detailId, { admin: true })
        : Promise.resolve(null),
    [detailId],
  );
  const closeDetail = useCallback(() => setDetailId(null), []);
  const navigate = (next) => {
    setView(next);
    setFullData(null);
    setFilters((previous) => ({ ...previous, offset: 0 }));
    setActionError("");
  };
  async function remove() {
    setPending(true);
    setActionError("");
    try {
      await deleteAnalysis(deleting.id);
      setDeleting(null);
      if (list.data?.items.length === 1 && filters.offset)
        setFilters((previous) => ({
          ...previous,
          offset: Math.max(0, previous.offset - previous.limit),
        }));
      else list.refresh();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setPending(false);
    }
  }
  async function download() {
    setPending(true);
    setActionError("");
    try {
      const blob = await exportAnalyses({
        ...filters,
        ...(view === "quality" ? { quality: "review" } : {}),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "spend-analyses.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setPending(false);
    }
  }
  const logout = () => {
    sessionStorage.removeItem("admin_token");
    window.location.hash = "#/admin/login";
  };
  return (
    <PortalShell
      portal="admin"
      activeView={view}
      onNavigate={navigate}
      theme={theme}
      onToggleTheme={toggleTheme}
      actions={
        <>
          <Button
            onClick={() => setSettings(true)}
            aria-label="Account settings"
          >
            <Settings size={16} />
          </Button>
          <Button onClick={logout}>
            <LogOut size={14} />
            Sign out
          </Button>
        </>
      }
    >
      {fullData ? (
        <>
          <div className="p-heading-actions" style={{ marginBottom: 22 }}>
            <Button
              onClick={() => {
                setFullData(null);
                list.refresh();
              }}
            >
              <ArrowLeft size={14} />
              Back to analyses
            </Button>
            <Tabs
              value={fullView}
              onChange={setFullView}
              items={[
                "overview",
                "transactions",
                "vendors",
                "insights",
                "rewards",
              ].map((value) => ({
                value,
                label: value[0].toUpperCase() + value.slice(1),
              }))}
            />
          </div>
          <ExpenseManager
            key={fullData.id}
            data={persistence.analysis}
            persistence={persistence}
            view={fullView}
            onNavigate={setFullView}
            admin
          />
        </>
      ) : view === "overview" ? (
        <AdminOverview onNavigate={navigate} />
      ) : view === "usage" ? (
        <ApiUsageTab />
      ) : view === "audit" ? (
        <AuditLogTab />
      ) : (
        <>
          <div className="p-page-heading">
            <div>
              <p className="p-eyebrow">
                {view === "quality"
                  ? "REVIEW WITH CONTEXT"
                  : "THE STATEMENT LIBRARY"}
              </p>
              <h1>{view === "quality" ? "Quality review" : "Analyses"}</h1>
              <p>
                {view === "quality"
                  ? "Stored analyses with extraction warnings or balance mismatches."
                  : "Search, inspect, and manage saved statement analyses."}
              </p>
            </div>
            <span className="p-badge">
              {list.data?.total ?? "—"} matching analyses
            </span>
          </div>
          <InlineError message={list.error} onRetry={list.refresh} />
          <AnalysisTable
            result={list.error ? null : list.data}
            filters={filters}
            onFiltersChange={setFilters}
            onView={setDetailId}
            onDelete={setDeleting}
            onExport={download}
            onRefresh={list.refresh}
            loading={list.loading}
            exporting={pending}
          />
        </>
      )}
      <InlineError message={actionError} />
      {detailId && (
        <AnalysisDetailDrawer
          analysis={detail.data}
          loading={detail.loading}
          error={detail.error}
          onRetry={detail.refresh}
          onClose={closeDetail}
          onOpenFull={() => {
            setFullData(detail.data);
            setFullView("overview");
            setDetailId(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Permanently delete this analysis?"
          pending={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        >
          The saved statement and its extracted transactions will be removed.
          This action is recorded in the audit trail.
        </ConfirmDialog>
      )}
      {settings && <AdminSettingsModal onClose={() => setSettings(false)} />}
    </PortalShell>
  );
}
