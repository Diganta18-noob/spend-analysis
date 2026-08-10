const INR = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

/** `₹1,23,456.78`. Negatives get a leading minus; `sign` forces one on positives. */
export function formatCurrency(n: number, opts: { sign?: boolean } = {}): string {
  const value = safe(Number(n));
  const abs = INR.format(Math.abs(value));
  if (value < 0) return `-₹${abs}`;
  return opts.sign ? `+₹${abs}` : `₹${abs}`;
}

/** `₹12.3K`, `₹1.2L`, `₹1.2Cr` — Indian scale, for chart centres and axis labels. */
export function formatCompactCurrency(n: number): string {
  const value = safe(Number(n));
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-₹" : "₹";
  const trim = (x: number) => Number(x.toFixed(1)).toString();

  if (abs >= 1e7) return `${prefix}${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${prefix}${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${prefix}${trim(abs / 1e3)}K`;
  return `${prefix}${INR.format(abs)}`;
}

export function formatNumber(n: number): string {
  return INR.format(safe(Number(n)));
}

/** `+12.4%` / `−8.1%`. Uses U+2212 for negatives so the glyph matches the type. */
export function formatSignedPercent(n: number): string {
  const value = safe(Number(n));
  const body = `${Math.abs(value).toFixed(1)}%`;
  if (value > 0) return `+${body}`;
  if (value < 0) return `−${body}`;
  return body;
}

/**
 * Accepts `YYYY-MM-DD` and `DD-MM-YYYY`, `-` or `/` separated — both appear in
 * extracted statements. Returns null rather than an Invalid Date so callers
 * cannot accidentally render "Invalid Date".
 */
export function parseStatementDate(raw: string): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.trim().split(/[-/]/);
  if (parts.length !== 3) return null;

  let year: number, month: number, day: number;
  if (parts[0].length === 4) {
    [year, month, day] = parts.map((p) => parseInt(p, 10));
  } else {
    [day, month, year] = parts.map((p) => parseInt(p, 10));
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/** The day-of-month key used to bucket the daily spend series. Defaults to 1. */
export function dayOfMonth(raw: string): number {
  return parseStatementDate(raw)?.getDate() ?? 1;
}

export function formatDate(raw: string): string {
  const d = parseStatementDate(raw);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).replace(/^0/, "");
}

export function formatLongDate(raw: string): string {
  const d = parseStatementDate(raw);
  if (!d) return "—";
  return d
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/^0/, "");
}

/** `just now` → `4m ago` → `3h ago` → `2d ago` → absolute beyond a week. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return then
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/^0/, "");
}

export function truncate(s: string, max: number): string {
  const str = String(s ?? "");
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}

/** The vendor grouping key. Matches the existing `desc.split("(")[0].trim()` rule. */
export function normaliseMerchant(desc: string): string {
  const key = String(desc ?? "").split("(")[0].trim();
  return key || "Unknown Payee";
}

/** Deterministic 1–2 letter monogram, standing in for a merchant logo. */
export function monogram(desc: string): string {
  const raw = String(desc ?? "").split("(")[0].trim();
  if (!raw) return "?";
  const words = raw
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase().padEnd(1, "");
  return (words[0][0] + words[1][0]).toUpperCase();
}
