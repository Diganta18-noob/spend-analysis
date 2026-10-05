import {
  Files,
  ReceiptText,
  Activity,
  IndianRupee,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, StatCard, Button, InlineError, Skeleton } from "../ui/PortalUI";
import { fetchStats, fetchApiUsage } from "../../services/apiService";
import { useResource } from "../../hooks/useResource";
import { formatCurrency, formatNumber } from "../../lib/format";
export default function AdminOverview({ onNavigate }) {
  const { data, loading, error, refresh } = useResource(() =>
    Promise.all([fetchStats(), fetchApiUsage()]),
  );
  const stats = data?.[0];
  const usage = data?.[1]?.aggregate;
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">OPERATIONS AT A GLANCE</p>
          <h1>A clear view of the workspace.</h1>
          <p>
            Saved analyses, service activity, and the details worth reviewing.
          </p>
        </div>
        <Button onClick={refresh} disabled={loading}>
          Refresh overview
        </Button>
      </div>
      <InlineError message={error} onRetry={refresh} />
      {loading ? (
        <Skeleton label="Loading operational overview…" />
      ) : (
        stats && (
          <>
            <div className="p-stats">
              <StatCard
                label="Saved analyses"
                value={formatNumber(stats.total_analyses)}
                detail="Across all saved statements"
                icon={Files}
              />
              <StatCard
                label="Transactions"
                value={formatNumber(stats.total_transactions)}
                detail="Recorded in saved analyses"
                icon={ReceiptText}
              />
              <StatCard
                label="Tracked net spending"
                value={formatCurrency(stats.total_spend_tracked)}
                detail="Statement totals; overlapping periods possible"
                icon={IndianRupee}
                featured
              />
              <StatCard
                label="API calls"
                value={
                  usage?.total_calls == null
                    ? "—"
                    : formatNumber(usage.total_calls)
                }
                detail="Recorded over the last 30 days"
                icon={Activity}
              />
            </div>
            <div className="p-grid-2">
              <Card
                title="Analysis workspace"
                subtitle="Find statements, inspect details, and manage saved data"
              >
                <div className="p-card-body">
                  <p className="p-help">
                    Server filters and pagination keep the statement library
                    manageable. Exports include the complete matching result
                    set.
                  </p>
                  <Button onClick={() => onNavigate("analyses")}>
                    Explore analyses <ArrowRight size={14} />
                  </Button>
                </div>
              </Card>
              <Card
                title="Quality review"
                subtitle="A closer look at statements that need attention"
              >
                <div className="p-card-body">
                  <ShieldCheck
                    size={25}
                    style={{ color: "var(--text-2)", marginBottom: 12 }}
                  />
                  <p className="p-help">
                    Review balance mismatches, missing dates, and extraction
                    warnings. Quality labels reflect recorded checks, not
                    confidence estimates.
                  </p>
                  <Button onClick={() => onNavigate("quality")}>
                    Review flagged analyses <ArrowRight size={14} />
                  </Button>
                </div>
              </Card>
            </div>
            <div className="p-grid-2">
              <Card title="Service health" subtitle="Recorded request outcomes">
                <div className="p-card-body">
                  <div className="p-category-row">
                    <span>Successful calls</span>
                    <strong>{usage?.successful_calls ?? "—"}</strong>
                  </div>
                  <div className="p-category-row">
                    <span>Failed calls</span>
                    <strong>{usage?.failed_calls ?? "—"}</strong>
                  </div>
                  <div className="p-category-row">
                    <span>Average successful-call latency</span>
                    <strong>
                      {usage?.successful_calls
                        ? `${(usage.avg_latency_ms / 1000).toFixed(1)}s`
                        : "Unavailable"}
                    </strong>
                  </div>
                  <Button
                    style={{ marginTop: 15 }}
                    onClick={() => onNavigate("usage")}
                  >
                    API usage <ArrowRight size={13} />
                  </Button>
                </div>
              </Card>
              <Card
                title="Accountability, built in"
                subtitle="Trace access, edits, and administrative actions"
              >
                <div className="p-card-body">
                  <p className="p-help">
                    Search the audit trail by action, date, or details.
                    Completed server exports are recorded alongside analysis
                    access and category corrections.
                  </p>
                  <Button onClick={() => onNavigate("audit")}>
                    Open audit trail <ArrowRight size={13} />
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )
      )}
    </>
  );
}
