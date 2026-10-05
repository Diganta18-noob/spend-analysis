import { useState } from "react";
import { Search } from "lucide-react";
import { vendorStats } from "../lib/derive";
import { formatCurrency, formatLongDate } from "../lib/format";
import { Card, EmptyState } from "../components/ui/PortalUI";
export default function VendorsView({ transactions }) {
  const [query, setQuery] = useState("");
  const vendors = vendorStats(transactions).filter((v) =>
    v.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">THE PLACES YOU PAY</p>
          <h1>Merchants</h1>
          <p>Understand where your spending adds up.</p>
        </div>
        <span className="p-badge">{vendors.length} merchants</span>
      </div>
      <Card>
        <div className="p-toolbar">
          <div className="p-search">
            <Search size={15} />
            <input
              className="p-input"
              aria-label="Search merchants"
              placeholder="Find a merchant…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {vendors.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Transactions</th>
                  <th>Last activity</th>
                  <th>Average</th>
                  <th style={{ textAlign: "right" }}>Net spending</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.name}>
                    <td className="merchant-name">
                      {v.name}
                      {v.count > 1 && (
                        <small>Repeat merchant · {v.count} payments</small>
                      )}
                    </td>
                    <td>{v.cat}</td>
                    <td>{v.count}</td>
                    <td>{formatLongDate(v.lastDate)}</td>
                    <td>{formatCurrency(v.average)}</td>
                    <td className="p-amount">{formatCurrency(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching merchants"
            message="Try a shorter search."
          />
        )}
      </Card>
    </>
  );
}
