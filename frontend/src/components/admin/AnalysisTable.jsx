import { Search, Eye, Trash2, Download, RefreshCw } from "lucide-react";
import { Card, Button, Pagination, EmptyState, Skeleton } from "../ui/PortalUI";
import { formatCurrency } from "../../lib/format";
export default function AnalysisTable({
  result,
  filters,
  onFiltersChange,
  onView,
  onDelete,
  onExport,
  onRefresh,
  loading,
  exporting,
}) {
  const items = result?.items || [];
  const change = (key) => (event) =>
    onFiltersChange({ ...filters, [key]: event.target.value, offset: 0 });
  return (
    <Card>
      <div className="p-toolbar">
        <div className="p-search">
          <Search size={15} />
          <input
            className="p-input"
            aria-label="Search analyses"
            value={filters.query}
            onChange={change("query")}
            placeholder="Search bank, holder, period or ID…"
          />
        </div>
        <select
          aria-label="Bank filter"
          value={filters.bank}
          onChange={change("bank")}
        >
          <option value="">All banks</option>
          {[
            ...new Set([
              ...(result?.banks || []),
              ...(filters.bank ? [filters.bank] : []),
            ]),
          ].map((bank) => (
            <option key={bank}>{bank}</option>
          ))}
        </select>
        <label className="p-field">
          From
          <input
            type="date"
            className="p-input"
            value={filters.from}
            onChange={change("from")}
          />
        </label>
        <label className="p-field">
          To
          <input
            type="date"
            className="p-input"
            value={filters.to}
            onChange={change("to")}
          />
        </label>
        <Button
          onClick={() =>
            onFiltersChange({
              ...filters,
              query: "",
              bank: "",
              from: "",
              to: "",
              offset: 0,
            })
          }
        >
          Reset
        </Button>
        <Button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh analyses"
        >
          <RefreshCw size={14} />
        </Button>
        <Button
          onClick={onExport}
          disabled={exporting || loading || !result?.total}
        >
          <Download size={14} />
          {exporting ? "Exporting…" : "Export matches"}
        </Button>
      </div>
      {loading ? (
        <Skeleton label="Loading analyses…" />
      ) : items.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Statement</th>
                <th>Account holder</th>
                <th>Analyzed</th>
                <th>Transactions</th>
                <th>Quality</th>
                <th style={{ textAlign: "right" }}>Net spending</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const review =
                  row.quality?.warnings?.length ||
                  row.quality?.reconciliation?.status === "mismatch";
                return (
                  <tr key={row.id}>
                    <td className="merchant-name">
                      {row.bank || "Unknown bank"}
                      <small>{row.period || "Period unavailable"}</small>
                    </td>
                    <td>{row.account_holder || "Redacted / unavailable"}</td>
                    <td>
                      {new Date(row.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td>{row.transaction_count}</td>
                    <td>
                      <span className={`p-badge ${review ? "warning" : ""}`}>
                        {review
                          ? "Needs review"
                          : row.quality?.reconciliation?.status === "balanced"
                            ? "Balanced"
                            : "Not verified"}
                      </span>
                    </td>
                    <td className="p-amount">
                      {formatCurrency(row.total_spent)}
                    </td>
                    <td>
                      <div className="p-row-actions">
                        <Button
                          onClick={() => onView(row.id)}
                          aria-label={`View analysis ${row.id}`}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          onClick={() => onDelete(row)}
                          aria-label={`Delete analysis ${row.id}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No matching analyses"
          message="Adjust your filters or wait for signed-in users to save statements."
        />
      )}
      <Pagination
        total={result?.total || 0}
        limit={filters.limit}
        offset={filters.offset}
        disabled={loading}
        onChange={(offset) => onFiltersChange({ ...filters, offset })}
      />
    </Card>
  );
}
