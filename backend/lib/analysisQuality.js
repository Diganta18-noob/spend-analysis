import { parsePeriod } from "./dateFilter.js";

const categories = new Set([
  "Rent",
  "Insurance",
  "Personal Transfer",
  "Office Food",
  "Food & Dining",
  "Transport",
  "Bills & Subscriptions",
  "Groceries",
  "Self Transfer",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Other",
]);
const creditTypes = new Set(["refund", "adjustment", "income", "transfer", "card_payment", "other", "unknown"]);
export function calendarKey(raw) {
  if (typeof raw !== "string") return null;
  const parts = raw.trim().split(/[-/]/);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const [year, month, day] = (
    parts[0].length === 4 ? parts : [...parts].reverse()
  ).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function normalizeExtractedTransactions(rows, provenance = {}) {
  const warnings = [];
  const transactions = [];
  for (const [index, row] of (Array.isArray(rows) ? rows : []).entries()) {
    if (
      !row ||
      typeof row.amount !== "number" ||
      !Number.isFinite(row.amount) ||
      Math.abs(row.amount) > 1e12
    ) {
      warnings.push(
        `Page ${provenance.page || 1}, row ${index + 1}: invalid amount excluded`,
      );
      continue;
    }
    const date = calendarKey(row.date);
    if (!date)
      warnings.push(
        `Page ${provenance.page || 1}, row ${index + 1}: date needs review`,
      );
    const creditType = row.amount < 0 && creditTypes.has(row.credit_type) ? row.credit_type : row.amount < 0 ? "unknown" : null;
    if (creditType === "unknown") warnings.push(`Page ${provenance.page || 1}, row ${index + 1}: credit purpose needs review`);
    if (row.uncertain) warnings.push(`Page ${provenance.page || 1}, row ${index + 1}: extraction needs review`);
    transactions.push({
      ...row,
      credit_type: creditType,
      uncertain: Boolean(row.uncertain) || !date,
      reward_points:
        typeof row.reward_points === "number" &&
        Number.isFinite(row.reward_points)
          ? row.reward_points
          : null,
      date: date || "",
      amount: Math.round(row.amount * 100) / 100,
      cat: categories.has(row.cat) ? row.cat : "Other",
      desc: typeof row.desc === "string" ? row.desc : "Unknown Merchant",
      source_page: provenance.page || 1,
    });
  }
  return { transactions, warnings };
}
export function periodWarnings(transactions = [], period) {
  if (!period) return ["Statement period is missing; transaction dates need review"];
  const range = parsePeriod(period);
  if (!range) return ["Statement period is not a verifiable date range; transaction dates need review"];
  // Card transaction dates can precede posting into the statement cycle by a few days.
  const start = new Date(range.startDate.getTime() - 5 * 86400000).toISOString().slice(0, 10);
  const end = new Date(range.endDate.getTime() + 5 * 86400000).toISOString().slice(0, 10);
  const outside = transactions.filter((row) => row.date && (row.date < start || row.date > end));
  return outside.length ? [`${outside.length} transactions fall outside the statement period; review their source rows`] : [];
}
export function summarizeMoney(transactions = []) {
  const result = { grossDebits: 0, refunds: 0, netSpend: 0, selfTransfers: 0, otherCredits: 0, unknownCredits: 0 };
  for (const t of transactions) {
    const amount = Math.round(Number(t.amount || 0) * 100);
    if (!Number.isSafeInteger(amount)) continue;
    if (t.cat === "Self Transfer") {
      result.selfTransfers += amount;
      continue;
    }
    if (amount >= 0) result.grossDebits += amount;
    else if (t.credit_type === "refund" || t.credit_type === "adjustment") result.refunds -= amount;
    else if (t.credit_type === "unknown" || !t.credit_type) result.unknownCredits -= amount;
    else result.otherCredits -= amount;
  }
  result.netSpend = result.grossDebits - result.refunds;
  return result;
}
export function reconcileAnalysis(data) {
  const isCard = data.statement_type === "credit_card";
  const required = [
    data.opening_balance,
    data.closing_balance,
    data.total_credits,
    ...(isCard ? [data.total_debits] : []),
  ];
  if (
    (data.statement_type !== "bank_account" && !isCard) ||
    required.some((x) => typeof x !== "number" || !Number.isFinite(x))
  )
    return {
      status: "unavailable",
      differenceMinor: null,
      reasons: [
        isCard ? "Printed card balance, charges and payments totals are required for reconciliation" : "Supported account balances and total credits are required for reconciliation",
      ],
    };
  if ((data.transactions || []).some((t) => t.uncertain || (t.amount < 0 && (!t.credit_type || t.credit_type === "unknown"))))
    return { status: "review", differenceMinor: null, reasons: ["Uncertain transactions or credit purposes need review"] };
  // Compare the complete ledger, including incoming credits and card payments.
  const debitMinor = (data.transactions || [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
  const creditMinor = (data.transactions || [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum - Math.round(t.amount * 100), 0);
  const differenceMinor =
    Math.round(data.opening_balance * 100) +
    (isCard ? debitMinor - Math.round(data.total_credits * 100) : Math.round(data.total_credits * 100) - debitMinor) -
    Math.round(data.closing_balance * 100);
  const creditDifferenceMinor = Math.round(data.total_credits * 100) - creditMinor;
  const debitDifferenceMinor = isCard ? Math.round(data.total_debits * 100) - debitMinor : 0;
  const balanced = Math.abs(differenceMinor) <= 1 && Math.abs(creditDifferenceMinor) <= 1 && Math.abs(debitDifferenceMinor) <= 1;
  return {
    status: balanced ? "balanced" : "mismatch",
    differenceMinor,
    reasons: balanced ? [] : [
      ...(Math.abs(differenceMinor) > 1 ? ["Reported balances differ from extracted transactions"] : []),
      ...(Math.abs(creditDifferenceMinor) > 1 ? ["Extracted credits differ from the statement total"] : []),
      ...(Math.abs(debitDifferenceMinor) > 1 ? ["Extracted charges differ from the statement total"] : []),
    ],
  };
}
export function buildInsightInput(transactions) {
  const categories = {};
  const merchants = {};
  for (const t of transactions) {
    categories[t.cat] = (categories[t.cat] || 0) + Math.round(t.amount * 100);
    merchants[t.desc] = (merchants[t.desc] || 0) + Math.round(t.amount * 100);
  }
  return {
    currency: "INR",
    units: "paise",
    transactionCount: transactions.length,
    summary: summarizeMoney(transactions),
    categories,
    topMerchants: Object.entries(merchants)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25),
    samples: transactions.slice(0, 30),
  };
}
