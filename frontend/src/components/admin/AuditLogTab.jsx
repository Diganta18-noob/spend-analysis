import { useState } from "react";
import { Search } from "lucide-react";
import { fetchAuditLogs } from "../../services/apiService";
import { useResource } from "../../hooks/useResource";
import {
  Card,
  Button,
  InlineError,
  Skeleton,
  EmptyState,
  Pagination,
} from "../ui/PortalUI";
const actions = [
  "ADMIN_LOGIN",
  "ADMIN_LOGIN_FAILED",
  "PASSWORD_CHANGED",
  "ANALYSIS_CREATED",
  "ANALYSIS_VIEWED",
  "ANALYSIS_UPDATED",
  "ANALYSIS_DELETED",
  "ANALYSIS_FAILED",
  "CSV_EXPORTED",
];
export default function AuditLogTab() {
  const [filters, setFilters] = useState({
    query: "",
    action: "",
    from: "",
    to: "",
    limit: 25,
    offset: 0,
  });
  const { data, loading, error, refresh } = useResource(
    () => fetchAuditLogs(filters),
    [filters],
  );
  const change = (key) => (event) =>
    setFilters((previous) => ({
      ...previous,
      [key]: event.target.value,
      offset: 0,
    }));
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">A RECORD OF WHAT HAPPENED</p>
          <h1>Audit trail</h1>
          <p>
            Trace statement access, category edits, exports, and account
            actions.
          </p>
        </div>
        <span className="p-badge">{data?.total ?? "—"} matching events</span>
      </div>
      <InlineError message={error} onRetry={refresh} />
      <Card>
        <div className="p-toolbar">
          <div className="p-search">
            <Search size={15} />
            <input
              className="p-input"
              aria-label="Search audit trail"
              placeholder="Search event details or IP…"
              value={filters.query}
              onChange={change("query")}
            />
          </div>
          <select
            aria-label="Audit action"
            value={filters.action}
            onChange={change("action")}
          >
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action.replaceAll("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
          <label className="p-field">
            From
            <input
              className="p-input"
              type="date"
              value={filters.from}
              onChange={change("from")}
            />
          </label>
          <label className="p-field">
            To
            <input
              className="p-input"
              type="date"
              value={filters.to}
              onChange={change("to")}
            />
          </label>
          <Button
            onClick={() =>
              setFilters({
                query: "",
                action: "",
                from: "",
                to: "",
                limit: 25,
                offset: 0,
              })
            }
          >
            Reset
          </Button>
          <Button onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <Skeleton label="Loading audit trail…" />
        ) : error ? null : data?.items?.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Source IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.timestamp).toLocaleString("en-IN")}</td>
                    <td>
                      <span
                        className={`p-badge ${/FAILED|DELETED/.test(item.action) ? "warning" : ""}`}
                      >
                        {item.action.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        whiteSpace: "normal",
                        minWidth: 200,
                        maxWidth: 400,
                      }}
                    >
                      {item.details}
                    </td>
                    <td>{item.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching audit events"
            message="Try a different action, search, or date range."
          />
        )}
        <Pagination
          total={data?.total || 0}
          limit={filters.limit}
          offset={filters.offset}
          disabled={loading}
          onChange={(offset) =>
            setFilters((previous) => ({ ...previous, offset }))
          }
        />
      </Card>
    </>
  );
}
