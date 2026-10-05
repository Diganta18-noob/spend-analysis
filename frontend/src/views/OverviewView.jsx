import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Card, StatCard, Button, EmptyState } from "../components/ui/PortalUI";
import {
  totalSpent,
  categoryTotals,
  dailySeries,
  dailyBreakdown,
  topVendors,
} from "../lib/derive";
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
} from "../lib/format";
import { categoryColor } from "../lib/categories";
export default function OverviewView({ transactions, onNavigate }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const debits = transactions.filter((t) => t.amount > 0);
  const refunds = -totalSpent(transactions.filter((t) => t.amount < 0));
  const categories = categoryTotals(debits);
  const days = dailySeries(transactions);
  const vendors = topVendors(transactions, 5);
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
          value={formatCurrency(totalSpent(transactions))}
          detail="Debits less refunds · current selection"
          icon={ArrowUpRight}
          featured
        />
        <StatCard
          label="Total debits"
          value={formatCurrency(totalSpent(debits))}
          detail={`${debits.length} outgoing transactions`}
          icon={ReceiptText}
        />
        <StatCard
          label="Refunds"
          value={formatCurrency(refunds)}
          detail="Returned to your account"
          icon={ArrowDownLeft}
        />
        <StatCard
          label="Peak spending day"
          value={peak ? formatDate(peak.day) : "—"}
          detail={
            peak ? formatCurrency(peak.amount) : "No valid dates available"
          }
          icon={CalendarDays}
        />
      </div>
      <div className="p-chart-grid">
        <Card
          title="Your spending, day by day"
          subtitle="Net spending across the statement · select a day to explore"
          action={<span className="p-badge">INR</span>}
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
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
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
                    fill="var(--info)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
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
              {dailyBreakdown(transactions, selectedDay).map((category) => (
                <div className="p-category-row" key={category.name}>
                  <span>{category.name}</span>
                  <strong>{formatCurrency(category.value)}</strong>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card
          title="Where your money goes"
          subtitle="Gross debit spending by category"
        >
          {categories.length ? (
            <>
              <div className="p-chart" style={{ height: 195 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={57}
                      outerRadius={79}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {categories.map((category) => (
                        <Cell
                          key={category.name}
                          fill={categoryColor(category.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={formatCurrency}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="p-card-body">
                {categories.slice(0, 5).map((category) => (
                  <div className="p-category-row" key={category.name}>
                    <span className="p-category-name">
                      <span
                        className="p-category-dot"
                        style={{ background: categoryColor(category.name) }}
                      />
                      {category.name}
                    </span>
                    <strong>{formatCurrency(category.value)}</strong>
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
