import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChevronRight } from "lucide-react";
import { Card, StatCard, Button, EmptyState } from "../components/ui/PortalUI";
import {
  categoryTotals,
  dailySeries,
  dailyBreakdown,
  topVendors,
  spendingSummary,
} from "../lib/derive";
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
} from "../lib/format";
export default function OverviewView({ transactions, onNavigate }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const debits = transactions.filter((t) => t.amount > 0);
  const summary = spendingSummary(transactions);
  const categories = categoryTotals(debits);
  const spendingRows = transactions.filter((t) => t.amount > 0 || t.credit_type === "refund" || t.credit_type === "adjustment");
  const days = dailySeries(spendingRows);
  const vendors = topVendors(debits, 5);
  const peak = days.reduce(
    (max, point) => (point.amount > (max?.amount ?? -Infinity) ? point : max),
    null,
  );
  const tooltipStyle = {
    background: "var(--elevated)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 11,
  };
  return (
    <>
      <div className="p-stats">
        <StatCard
          label="Net spending"
          value={formatCurrency(summary.net)}
          detail={summary.unclassifiedCount ? `Excludes ${summary.unclassifiedCount} unclassified credits` : "Debits less confirmed refunds"}
          featured
        />
        <StatCard
          label="Total debits"
          value={formatCurrency(summary.debits)}
          detail={`${debits.length} outgoing transactions`}
        />
        <StatCard
          label="Refunds & adjustments"
          value={formatCurrency(summary.refunds)}
          detail="Credits that reduce charges"
        />
        <StatCard
          label="Peak spending day"
          value={peak ? formatDate(peak.day) : "—"}
          detail={
            peak ? formatCurrency(peak.amount) : "No valid dates available"
          }
        />
      </div>
      <div className="p-chart-grid">
        <Card
          title="Daily spending"
          subtitle="Select a day to see its categories"
          action={<span className="p-chart-unit">INR</span>}
        >
          {days.length ? (
            <div className="p-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={days}
                  onClick={(state) => {
                    if (state?.activeLabel) setSelectedDay(state.activeLabel);
                  }}
                  margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDate}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={formatDate}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--surface-2)" }}
                  />
                  <Bar
                    dataKey="amount"
                    name="Net spending"
                    fill="var(--accent)"
                    fillOpacity={0.82}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Dates need review"
              message="Transactions remain in your totals. Dated charts appear when valid statement dates are available."
            />
          )}
          {selectedDay && (
            <div className="p-card-body">
              <div className="p-card-heading" style={{ padding: "0 0 8px" }}>
                <h2>{formatDate(selectedDay)}</h2>
                <Button onClick={() => setSelectedDay(null)}>Clear day</Button>
              </div>
              {dailyBreakdown(spendingRows, selectedDay).map((category) => (
                <div className="p-category-row" key={category.name}>
                  <span>{category.name}</span>
                  <strong>{formatCurrency(category.value)}</strong>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card
          title="Spending by category"
          subtitle="Share of total debits"
        >
          {categories.length ? (
            <>
              <div className="p-card-body p-category-list">
                {categories.slice(0, 5).map((category) => (
                  <div className="p-category-item" key={category.name}>
                    <div className="p-category-row">
                      <span>{category.name}</span>
                      <strong>{formatCurrency(category.value)}</strong>
                    </div>
                    <div className="p-category-track" aria-hidden="true">
                      <span style={{ width: `${Math.max(2, category.value / categories[0].value * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No outgoing spending"
              message="Refunds and transfers are shown separately from the debit breakdown."
            />
          )}
        </Card>
      </div>
      <div className="p-grid-2">
        <Card
          title="Your top merchants"
          subtitle="The places that make up your statement"
          action={
            <Button onClick={() => onNavigate("vendors")}>
              View all <ChevronRight size={13} />
            </Button>
          }
        >
          <div className="p-card-body">
            {vendors.map((vendor, index) => (
              <div className="p-vendor-row" key={vendor.name}>
                <span className="p-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="vendor-copy">
                  {vendor.name}
                  <small>
                    {vendor.count} transactions · {vendor.cat}
                  </small>
                </div>
                <strong>{formatCurrency(vendor.total)}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="Recent transactions"
          subtitle="A closer look at your latest activity"
          action={
            <Button onClick={() => onNavigate("transactions")}>
              Explore <ChevronRight size={13} />
            </Button>
          }
        >
          <div className="p-card-body">
            {[...transactions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((t) => (
                <div className="p-vendor-row" key={t.sourceIndex}>
                  <div className="vendor-copy">
                    {t.desc}
                    <small>
                      {formatDate(t.date)} · {t.cat}
                    </small>
                  </div>
                  <strong>{formatCurrency(t.amount)}</strong>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}
