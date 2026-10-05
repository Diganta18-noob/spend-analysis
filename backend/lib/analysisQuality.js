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
    transactions.push({
      ...row,
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
export function summarizeMoney(transactions = []) {
  const result = { grossDebits: 0, refunds: 0, netSpend: 0, selfTransfers: 0 };
  for (const t of transactions) {
    const amount = Math.round(Number(t.amount || 0) * 100);
    if (!Number.isSafeInteger(amount)) continue;
    if (t.cat === "Self Transfer") {
      result.selfTransfers += amount;
      continue;
    }
    if (amount >= 0) result.grossDebits += amount;
    else result.refunds -= amount;
  }
  result.netSpend = result.grossDebits - result.refunds;
  return result;
}
export function reconcileAnalysis(data) {
  const required = [
    data.opening_balance,
    data.closing_balance,
    data.total_credits,
  ];
  if (
    data.statement_type !== "bank_account" ||
    required.some((x) => typeof x !== "number" || !Number.isFinite(x))
  )
    return {
      status: "unavailable",
      differenceMinor: null,
      reasons: [
        "Supported bank-account balances and total credits are required for reconciliation",
      ],
    };
  // Reported total credits already include refunds; subtract gross debits only.
  const debitMinor = (data.transactions || [])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
  const differenceMinor =
    Math.round(data.opening_balance * 100) +
    Math.round(data.total_credits * 100) -
    debitMinor -
    Math.round(data.closing_balance * 100);
  return {
    status: Math.abs(differenceMinor) <= 100 ? "balanced" : "mismatch",
    differenceMinor,
    reasons:
      Math.abs(differenceMinor) > 100
        ? [
            "Reported balances differ from extracted transactions; review the statement",
          ]
        : [],
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
