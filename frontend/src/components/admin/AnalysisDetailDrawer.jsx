import { useEffect, useRef } from "react";
import { X, ArrowRight } from "lucide-react";
import { Button, InlineError, Skeleton } from "../ui/PortalUI";
import { formatCurrency } from "../../lib/format";
import QualityPanel from "../../views/QualityPanel";
export default function AnalysisDetailDrawer({
  analysis,
  loading,
  error,
  onRetry,
  onClose,
  onOpenFull,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const nodes = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled), a[href], input, select, summary",
          ),
        ];
        if (!nodes.length) return;
        if (event.shiftKey && document.activeElement === nodes[0]) {
          event.preventDefault();
          nodes.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
          event.preventDefault();
          nodes[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <>
      <button
        className="sidebar-backdrop"
        style={{ zIndex: 45 }}
        aria-label="Close analysis details"
        onClick={onClose}
      />
      <aside
        className="p-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Analysis details"
        ref={ref}
        tabIndex={-1}
      >
        <div className="p-card-heading" style={{ padding: 0 }}>
          <span className="p-eyebrow">STATEMENT DETAILS</span>
          <Button onClick={onClose} aria-label="Close details">
            <X size={18} />
          </Button>
        </div>
        {loading ? (
          <Skeleton label="Opening analysis…" />
        ) : error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : (
          analysis && (
            <>
              <h2>{analysis.bank || "Bank statement"}</h2>
              <span className="p-badge">
                {analysis.period || "Period unavailable"}
              </span>
              <dl className="p-detail-grid">
                <div>
                  <dt>Account holder</dt>
                  <dd>{analysis.account_holder || "Unavailable"}</dd>
                </div>
                <div>
                  <dt>Transactions</dt>
                  <dd>{analysis.transactions?.length || 0}</dd>
                </div>
                <div>
                  <dt>Opening balance</dt>
                  <dd>
                    {analysis.opening_balance == null
                      ? "—"
                      : formatCurrency(analysis.opening_balance)}
                  </dd>
                </div>
                <div>
                  <dt>Closing balance</dt>
                  <dd>
                    {analysis.closing_balance == null
                      ? "—"
                      : formatCurrency(analysis.closing_balance)}
                  </dd>
                </div>
              </dl>
              <QualityPanel quality={analysis.quality} />
              <p className="p-help">
                Stored transaction descriptions are redacted. Account holder
                metadata may still identify a person; export and access are
                audited.
              </p>
              <Button variant="primary" onClick={onOpenFull}>
                Open full analysis <ArrowRight size={14} />
              </Button>
            </>
          )
        )}
      </aside>
    </>
  );
}
