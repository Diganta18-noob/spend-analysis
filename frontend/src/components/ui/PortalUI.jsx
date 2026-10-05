import { useEffect, useRef } from "react";
import { AlertCircle, ArrowRight, X, LoaderCircle, Inbox } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}) {
  return (
    <button className={`p-button p-button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
  ...props
}) {
  return (
    <section className={`p-card ${className}`} {...props}>
      {title && (
        <div className="p-card-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  featured = false,
}) {
  return (
    <Card className={`p-stat ${featured ? "p-stat-featured" : ""}`}>
      <div className="p-stat-label">
        {label}
        {Icon && <Icon size={16} />}
      </div>
      <div className="p-stat-value">
        <AnimatedNumber value={value} />
      </div>
      <p>{detail}</p>
    </Card>
  );
}
export function Tabs({ value, items, onChange }) {
  return (
    <div className="p-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          className={value === item.value ? "selected" : ""}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const index = items.findIndex((i) => i.value === value);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      items.length) %
                    items.length;
            onChange(items[next].value);
            event.currentTarget.parentElement.children[next].focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function InlineError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="p-error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {onRetry && (
        <Button onClick={onRetry}>
          Retry <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}
export function EmptyState({ title = "Nothing here yet", message, action }) {
  return (
    <div className="p-empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
export function Skeleton({ label = "Loading…" }) {
  return (
    <div className="p-skeleton" role="status" aria-label={label}>
      <LoaderCircle size={20} className="p-spin" />
      <span>{label}</span>
      <div />
      <div />
      <div />
    </div>
  );
}
export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  pending,
  confirmLabel = "Delete analysis",
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      dialog.close?.();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="p-dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <div className="p-card-heading">
        <h2 id="confirm-title">{title}</h2>
        <Button aria-label="Close dialog" onClick={onCancel} disabled={pending}>
          <X size={18} />
        </Button>
      </div>
      <div className="p-dialog-body">{children}</div>
      <div className="p-dialog-actions">
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
export function Pagination({ total, limit, offset, onChange, disabled }) {
  return (
    <div className="p-pagination">
      <span>
        {total
          ? `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`
          : "0 results"}
      </span>
      <div>
        <Button
          disabled={disabled || offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          disabled={disabled || offset + limit >= total}
          onClick={() => onChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
