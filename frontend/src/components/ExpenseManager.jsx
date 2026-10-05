import { useMemo, useState } from "react";
import { Upload, CalendarDays, Gift } from "lucide-react";
import {
  normaliseTransactions,
  excludeSelfTransfers,
  rewardStats,
} from "../lib/derive";
import { formatNumber } from "../lib/format";
import { Button, Card, EmptyState, StatCard, InlineError } from "./ui/PortalUI";
import OverviewView from "../views/OverviewView";
import TransactionsView from "../views/TransactionsView";
import VendorsView from "../views/VendorsView";
import InsightsView from "../views/InsightsView";
import QualityPanel from "../views/QualityPanel";
export default function ExpenseManager({
  data,
  view = "overview",
  onNavigate,
  onBack,
  persistence,
  admin = false,
}) {
  const [showSelf, setShowSelf] = useState(false);
  const normalized = useMemo(
    () => normaliseTransactions(data.transactions),
    [data.transactions],
  );
  const transactions = useMemo(
    () => excludeSelfTransfers(normalized, showSelf),
    [normalized, showSelf],
  );
  const rewards = rewardStats(normalized, data.total_reward_points);
  const summaryRewards =
    rewards && !normalized.some((row) => row.reward_points != null);
  return (
    <div className="p-entry">
      {view === "overview" && (
        <div className="p-page-heading">
          <div>
            <p className="p-eyebrow">YOUR FINANCIAL SNAPSHOT</p>
            <h1>Every rupee, a clearer picture.</h1>
            <p>
              {data.bank || "Statement overview"}{" "}
              <span style={{ margin: "0 7px" }}>·</span>
              {normalized.length} extracted transactions
            </p>
          </div>
          <div className="p-heading-actions">
            <span className="p-badge">
              <CalendarDays size={13} />
              {data.period || "Statement period unavailable"}
            </span>
            {onBack && (
              <Button onClick={onBack}>
                <Upload size={14} />
                New analysis
              </Button>
            )}
          </div>
        </div>
      )}
      <div
        className="p-heading-actions"
        style={{ justifyContent: "space-between", marginBottom: 18 }}
      >
        <span className="p-meta">
          {data.id === "sample"
            ? "Sample statement · demonstration data"
            : data.session_only || !data.id
              ? "Current session only · sign in before uploading to save history"
              : admin
                ? "Admin view · saved analysis"
                : "Saved to your statement history"}
        </span>
        <label className="p-inline-check">
          <input
            type="checkbox"
            checked={showSelf}
            onChange={(e) => setShowSelf(e.target.checked)}
          />
          Include self transfers
        </label>
      </div>
      <QualityPanel
        quality={data.quality}
        unknownDateCount={normalized.filter((t) => !t.date).length}
      />
      {view !== "transactions" && (
        <InlineError
          message={persistence.saveError}
          onRetry={persistence.retrySave}
        />
      )}
      {view === "overview" && (
        <OverviewView transactions={transactions} onNavigate={onNavigate} />
      )}
      {view === "transactions" && (
        <TransactionsView
          transactions={transactions}
          onEditCategory={persistence.editCategory}
          onEditMerchant={persistence.editMerchantCategory}
          saveState={persistence.saveState}
          saveError={persistence.saveError}
          onRetry={persistence.retrySave}
        />
      )}
      {view === "vendors" && <VendorsView transactions={transactions} />}
      {view === "insights" && <InsightsView insights={data.insights} />}
      {view === "rewards" && (
        <>
          <div className="p-page-heading">
            <div>
              <p className="p-eyebrow">VALUE BEYOND THE PAYMENT</p>
              <h1>Rewards</h1>
              <p>
                Points reported by your statement, without estimated cash
                values.
              </p>
            </div>
            <Gift size={22} />
          </div>
          {summaryRewards ? (
            <Card
              title="Reported reward total"
              subtitle="Your statement provides a total without transaction-level reward details"
            >
              <StatCard
                label="Reported points"
                value={formatNumber(rewards.net)}
                detail="Earned and redeemed breakdown unavailable"
              />
            </Card>
          ) : rewards ? (
            <>
              <div className="p-stats">
                <StatCard
                  label="Points earned"
                  value={formatNumber(rewards.earned)}
                  detail="Positive reward entries"
                />
                <StatCard
                  label="Points redeemed"
                  value={formatNumber(rewards.redeemed)}
                  detail="Negative reward entries"
                />
                <StatCard
                  label="Net points"
                  value={formatNumber(rewards.net)}
                  detail="Earned less redeemed"
                />
                <StatCard
                  label="Top reward category"
                  value={rewards.topCategory || "—"}
                  detail={`${formatNumber(rewards.topCategoryPoints)} points`}
                />
              </div>
              <Card
                title="Reward activity"
                subtitle="Only transaction-level rewards actually present in your statement"
              >
                <div className="p-table-wrap">
                  <table className="p-table">
                    <thead>
                      <tr>
                        <th>Merchant</th>
                        <th>Category</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalized
                        .filter((t) => t.reward_points != null)
                        .map((t) => (
                          <tr key={t.sourceIndex}>
                            <td>{t.desc}</td>
                            <td>{t.cat}</td>
                            <td className="p-amount">
                              {formatNumber(t.reward_points)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                title="No rewards reported"
                message="Reward activity appears when your statement includes reward points."
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
