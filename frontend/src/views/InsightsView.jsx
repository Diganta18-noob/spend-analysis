import { Sparkles } from "lucide-react";
import { Card, EmptyState } from "../components/ui/PortalUI";
export default function InsightsView({ insights }) {
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-eyebrow">A FRESH PERSPECTIVE</p>
          <h1>Spending insights</h1>
          <p>Patterns from your statement, with room for your judgment.</p>
        </div>
        <span className="p-badge">
          <Sparkles size={12} />
          AI assisted
        </span>
      </div>
      {insights?.length ? (
        <div className="p-grid-2">
          {insights.map((insight, index) => (
            <Card className="p-insight" key={index}>
              <Sparkles size={21} />
              <h3>{insight.title || "Statement insight"}</h3>
              <p>{insight.body}</p>
              {insight.badge && (
                <span className="p-badge">{insight.badge}</span>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="Insights are unavailable"
            message="Your transactions and spending charts are still available. Insights appear when the analysis service returns them."
          />
        </Card>
      )}
    </>
  );
}
