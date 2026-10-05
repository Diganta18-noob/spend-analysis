import { ShieldCheck, AlertTriangle } from "lucide-react";
import { formatCurrency } from "../lib/format";
export default function QualityPanel({ quality, unknownDateCount = 0 }) {
  const reconciliation = quality?.reconciliation;
  const warnings = [...(quality?.warnings || [])];
  if (unknownDateCount)
    warnings.push(
      `${unknownDateCount} transactions need date review; they are included in totals but excluded from dated charts.`,
    );
  const review = warnings.length > 0 || reconciliation?.status === "mismatch";
  const title = review
    ? "A little review can make this analysis more accurate"
    : reconciliation?.status === "balanced"
      ? "Extracted transactions reconcile with the reported balances"
      : "Statement quality";
  return (
    <details
      className={`p-quality ${review ? "review" : reconciliation?.status === "balanced" ? "good" : ""}`}
    >
      <summary>
        {review ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
        <span>{title}</span>
        <span className={`p-badge ${review ? "warning" : ""}`}>
          {review
            ? "Needs review"
            : reconciliation?.status === "balanced"
              ? "Balanced"
              : "Not verified"}
        </span>
      </summary>
      <ul>
        {reconciliation?.status === "mismatch" && (
          <li>
            Balance difference:{" "}
            {formatCurrency(reconciliation.differenceMinor / 100)}. Compare the
            extracted transactions with your statement.
          </li>
        )}
        {!reconciliation || reconciliation.status === "unavailable" ? (
          <li>
            Balance reconciliation is unavailable for this statement. Totals
            reflect extracted transactions.
          </li>
        ) : null}
        {warnings.slice(0, 10).map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
        {warnings.length > 10 && (
          <li>{warnings.length - 10} more extraction warnings.</li>
        )}
      </ul>
    </details>
  );
}
