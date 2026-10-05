import { useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, CheckCircle, XCircle, Timer } from "lucide-react";
import { fetchApiUsage } from "../../services/apiService";
import { useResource } from "../../hooks/useResource";
import {
  Card,
  StatCard,
  Button,
  InlineError,
  Skeleton,
  EmptyState,
} from "../ui/PortalUI";
export default function ApiUsageTab() {
  const { data, loading, error, refresh } = useResource(fetchApiUsage);
  const [period, setPeriod] = useState("30");
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - Number(period) + 1);
  const rows = (data?.daily || []).filter(
    (row) => row.date >= cutoff.toISOString().slice(0, 10),
  );
  const calls = rows.reduce((sum, row) => sum + row.total_calls, 0);
  const failures = rows.reduce((sum, row) => sum + row.failed_calls, 0);
  const latencies = rows
    .flatMap((row) => row.latencies || [])
    .filter(Number.isFinite);
  const latency = latencies.length
    ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
    : null;
  const errors = rows
    .flatMap((row) =>
      (row.errors || []).map((item) => ({ ...item, date: row.date })),
    )
    .sort((a, b) => b.time.localeCompare(a.time));
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">THE EXTRACTION ENGINE</p>
          <h1>API usage</h1>
          <p>Request volume, recorded outcomes, and successful-call latency.</p>
        </div>
        <div className="p-heading-actions">
          <select
            aria-label="Usage period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <Button onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>
      <InlineError message={error} onRetry={refresh} />
      {loading ? (
        <Skeleton label="Loading API usage…" />
      ) : (
        data && (
          <>
            <div className="p-stats">
              <StatCard
                label="Total calls"
                value={calls}
                detail={`Recorded in the last ${period} days`}
                icon={Activity}
              />
              <StatCard
                label="Successful calls"
                value={calls - failures}
                detail="Provider requests completed"
                icon={CheckCircle}
              />
              <StatCard
                label="Failed calls"
                value={failures}
                detail={
                  calls
                    ? `${((failures / calls) * 100).toFixed(1)}% of recorded calls`
                    : "No calls recorded"
                }
                icon={XCircle}
              />
              <StatCard
                label="Average latency"
                value={
                  latency == null ? "—" : `${(latency / 1000).toFixed(1)}s`
                }
                detail="Sampled successful provider calls"
                icon={Timer}
              />
            </div>
            <Card
              title="Daily request activity"
              subtitle="Recorded successful and failed calls; missing days have no stored record"
            >
              {rows.length ? (
                <div className="p-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rows}
                      margin={{ top: 15, left: -10, right: 20 }}
                    >
                      <CartesianGrid
                        stroke="var(--border)"
                        vertical={false}
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--elevated)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar
                        dataKey="successful_calls"
                        name="Successful"
                        stackId="calls"
                        fill="var(--info)"
                      />
                      <Bar
                        dataKey="failed_calls"
                        name="Failed"
                        stackId="calls"
                        fill="var(--danger)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  title="No recorded requests"
                  message="Provider request activity will appear after statements are analyzed."
                />
              )}
            </Card>
            <Card
              title="Recent provider errors"
              subtitle="Recorded failures retained by the usage monitor"
              style={{ marginTop: 20 }}
            >
              {errors.length ? (
                <div className="p-table-wrap">
                  <table className="p-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.slice(0, 30).map((item, index) => (
                        <tr key={index}>
                          <td>{new Date(item.time).toLocaleString("en-IN")}</td>
                          <td style={{ whiteSpace: "normal" }}>
                            {item.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No recorded errors"
                  message="No provider failures were recorded in the selected period."
                />
              )}
            </Card>
          </>
        )
      )}
    </>
  );
}
