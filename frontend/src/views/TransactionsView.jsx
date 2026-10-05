import { useMemo, useState } from "react";
import { Search, ArrowDownUp, Check, Download } from "lucide-react";
import {
  Card,
  Button,
  EmptyState,
  InlineError,
  Pagination,
  ConfirmDialog,
} from "../components/ui/PortalUI";
import { CATEGORY_ORDER } from "../lib/categories";
import { filterAndSort, totalSpent } from "../lib/derive";
import { formatCurrency, formatLongDate } from "../lib/format";
export default function TransactionsView({
  transactions,
  onEditCategory,
  onEditMerchant,
  saveState,
  saveError,
  onRetry,
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [offset, setOffset] = useState(0);
  const [batch, setBatch] = useState(null);
  const filtered = useMemo(
    () => filterAndSort(transactions, { query, category, sortBy }),
    [transactions, query, category, sortBy],
  );
  const rows = filtered.slice(offset, offset + 25);
  const change = (setter) => (event) => {
    setter(event.target.value);
    setOffset(0);
  };
  function download() {
    const cell = (value) => {
      let text = String(value ?? "");
      if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const lines = [
      ["Date", "Merchant", "Category", "Amount INR"],
      ...filtered.map((t) => [t.date, t.desc, t.cat, t.amount]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + lines.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">THE DETAILS THAT MATTER</p>
          <h1>Transactions</h1>
          <p>Find a payment, correct a category, see the full picture.</p>
        </div>
        <div className="p-heading-actions">
          <span className="p-badge" role="status">
            <Check size={12} />
            {saveState === "local"
              ? "Current session"
              : saveState === "saving"
                ? "Saving changes…"
                : saveState === "failed"
                  ? "Unsaved changes"
                  : "All changes saved"}
          </span>
          <Button onClick={download} disabled={!filtered.length}>
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>
      <InlineError message={saveError} onRetry={onRetry} />
      <Card>
        <div className="p-toolbar">
          <div className="p-search">
            <Search size={15} />
            <input
              className="p-input"
              aria-label="Search transactions"
              placeholder="Search merchants or categories…"
              value={query}
              onChange={change(setQuery)}
            />
          </div>
          <select
            aria-label="Category filter"
            value={category}
            onChange={change(setCategory)}
          >
            <option value="ALL">All categories</option>
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          <ArrowDownUp size={15} />
          <select
            aria-label="Sort transactions"
            value={sortBy}
            onChange={change(setSortBy)}
          >
            <option value="date">Latest first</option>
            <option value="amount">Highest amount</option>
          </select>
        </div>
        {rows.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant / description</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Merchant rule</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.sourceIndex}>
                    <td>{formatLongDate(t.date)}</td>
                    <td className="merchant-name">{t.desc}</td>
                    <td>
                      <select
                        aria-label={`Category for ${t.desc}`}
                        value={t.cat}
                        onChange={(event) =>
                          onEditCategory(t.sourceIndex, event.target.value)
                        }
                      >
                        {CATEGORY_ORDER.map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`p-amount ${t.amount < 0 ? "credit" : ""}`}>
                      {formatCurrency(t.amount)}
                      {t.amount < 0 && <small>Refund</small>}
                    </td>
                    <td>
                      <Button
                        onClick={() =>
                          setBatch({
                            desc: t.desc,
                            cat: t.cat,
                            indices: transactions
                              .filter((row) => row.desc === t.desc)
                              .map((row) => row.sourceIndex),
                          })
                        }
                      >
                        Apply to merchant
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching transactions"
            message="Try a different merchant or reset the category filter."
          />
        )}
        <div className="p-pagination">
          <span>Filtered net total</span>
          <strong>{formatCurrency(totalSpent(filtered))}</strong>
        </div>
        <Pagination
          total={filtered.length}
          limit={25}
          offset={offset}
          onChange={setOffset}
        />
      </Card>
      {batch && (
        <ConfirmDialog
          title="Update this merchant?"
          confirmLabel="Apply category"
          onCancel={() => setBatch(null)}
          onConfirm={() => {
            onEditMerchant(batch.indices, batch.cat);
            setBatch(null);
          }}
        >
          Apply <strong>{batch.cat}</strong> to {batch.indices.length}{" "}
          transactions with the exact description “{batch.desc}”.
        </ConfirmDialog>
      )}
    </>
  );
}
