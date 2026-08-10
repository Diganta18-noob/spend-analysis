import type {
  Transaction,
  RawTransaction,
  Analysis,
  StoredAnalysis,
} from "./types";
import { normaliseMerchant, dayOfMonth, parseStatementDate } from "./format";

export type CategoryTotal = {
  name: string;
  value: number;
};

export type Vendor = {
  name: string;
  count: number;
  total: number;
  average: number;
  cat: string;
  firstDate: string;
  lastDate: string;
  transactions: Transaction[];
};

export type MerchantContext = {
  merchant: string;
  merchantTotal: number;
  shareOfSpend: number;
  count: number;
  others: Transaction[];
};

export type RewardStats = {
  earned: number;
  redeemed: number;
  net: number;
  topCategory: string | null;
  topCategoryPoints: number;
  hasRedemptions: boolean;
};

export type DailyPoint = {
  day: string;
  amount: number;
};

/** Normalise untrusted raw transactions into strict Transaction objects. */
export function normaliseTransactions(raw: RawTransaction[] | undefined): Transaction[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((t) => {
    let dateStr = typeof t.date === "string" ? t.date.trim() : "";
    if (dateStr.length < 8) {
      dateStr = "2026-06-01";
    }

    const descStr = typeof t.desc === "string" && t.desc.trim() ? t.desc.trim() : "Unknown Merchant";
    const amtNum = typeof t.amount === "number" && Number.isFinite(t.amount) ? t.amount : 0;
    const catStr = typeof t.cat === "string" && t.cat.trim() ? t.cat.trim() : "Other";

    let pts: number | null = null;
    if (typeof t.reward_points === "number" && Number.isFinite(t.reward_points)) {
      pts = t.reward_points;
    } else if (typeof t.reward_points === "string" && t.reward_points.trim()) {
      const parsed = Number(t.reward_points);
      pts = Number.isFinite(parsed) ? parsed : null;
    }

    return {
      date: dateStr,
      desc: descStr,
      amount: amtNum,
      cat: catStr,
      reward_points: pts,
    };
  });
}

/** Filter out Self Transfer category when showSelf is false. */
export function excludeSelfTransfers(txns: Transaction[], showSelf: boolean): Transaction[] {
  if (showSelf) return txns;
  return txns.filter((t) => t.cat !== "Self Transfer");
}

/** Compute total amount of self-transfers. */
export function selfTransferTotal(txns: Transaction[]): number {
  return txns
    .filter((t) => t.cat === "Self Transfer")
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Group spend by category and sort descending. */
export function categoryTotals(txns: Transaction[]): CategoryTotal[] {
  const map: Record<string, number> = {};
  for (const t of txns) {
    map[t.cat] = (map[t.cat] || 0) + t.amount;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Calculate total spent across transactions. */
export function totalSpent(txns: Transaction[]): number {
  return txns.reduce((sum, t) => sum + t.amount, 0);
}

/** Group transactions by day of month. */
export function dailySeries(txns: Transaction[]): DailyPoint[] {
  const map: Record<string, number> = {};
  for (const t of txns) {
    const dayKey = String(dayOfMonth(t.date));
    map[dayKey] = (map[dayKey] || 0) + t.amount;
  }
  return Object.entries(map)
    .map(([day, amount]) => ({ day, amount }))
    .sort((a, b) => Number(a.day) - Number(b.day));
}

/** Get category breakdown for a specific day of month. */
export function dailyBreakdown(txns: Transaction[], day: string): CategoryTotal[] {
  const dayNum = Number(day);
  const filtered = txns.filter((t) => dayOfMonth(t.date) === dayNum);
  return categoryTotals(filtered);
}

/** Filter by category and search query, sort by date or amount descending. */
export function filterAndSort(
  txns: Transaction[],
  opts: { category?: string; query?: string; sortBy?: "date" | "amount" } = {}
): Transaction[] {
  let result = [...txns];

  if (opts.category && opts.category !== "ALL") {
    result = result.filter((t) => t.cat === opts.category);
  }

  if (opts.query && opts.query.trim()) {
    const q = opts.query.toLowerCase().trim();
    result = result.filter(
      (t) => t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q)
    );
  }

  if (opts.sortBy === "amount") {
    result.sort((a, b) => b.amount - a.amount);
  } else if (opts.sortBy === "date") {
    result.sort((a, b) => {
      const dA = parseStatementDate(a.date)?.getTime() ?? 0;
      const dB = parseStatementDate(b.date)?.getTime() ?? 0;
      return dB - dA;
    });
  }

  return result;
}

/** Aggregate statistics by merchant/vendor. */
export function vendorStats(txns: Transaction[]): Vendor[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const name = normaliseMerchant(t.desc);
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(t);
  }

  const vendors: Vendor[] = [];
  for (const [name, list] of map.entries()) {
    const total = list.reduce((sum, t) => sum + t.amount, 0);
    const count = list.length;
    const average = total / count;

    // Pick top category by total spend within vendor
    const catMap: Record<string, number> = {};
    for (const t of list) catMap[t.cat] = (catMap[t.cat] || 0) + t.amount;
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0][0];

    const sortedDates = list
      .map((t) => t.date)
      .sort((a, b) => (parseStatementDate(a)?.getTime() ?? 0) - (parseStatementDate(b)?.getTime() ?? 0));

    vendors.push({
      name,
      count,
      total,
      average,
      cat: topCat,
      firstDate: sortedDates[0],
      lastDate: sortedDates[sortedDates.length - 1],
      transactions: list,
    });
  }

  return vendors.sort((a, b) => b.total - a.total);
}

/** Top vendors ranked by total spend. */
export function topVendors(txns: Transaction[], limit = 5): Vendor[] {
  return vendorStats(txns).slice(0, limit);
}

/** Recurring payees with 2 or more transactions. */
export function recurringPayees(txns: Transaction[], limit = 5): Vendor[] {
  return vendorStats(txns)
    .filter((v) => v.count >= 2)
    .slice(0, limit);
}

/** Context and related transactions for a single merchant. */
export function merchantContext(txns: Transaction[], txn: Transaction): MerchantContext {
  const merchant = normaliseMerchant(txn.desc);
  const allVendors = vendorStats(txns);
  const vendor = allVendors.find((v) => v.name === merchant);

  const merchantTotal = vendor?.total ?? txn.amount;
  const count = vendor?.count ?? 1;
  const total = totalSpent(txns);
  const shareOfSpend = total > 0 ? (merchantTotal / total) * 100 : 0;
  const others = (vendor?.transactions ?? [txn]).filter((t) => t !== txn);

  return {
    merchant,
    merchantTotal,
    shareOfSpend,
    count,
    others,
  };
}

/** Check if any transaction has non-null reward points. */
export function hasRewardPoints(txns: Transaction[]): boolean {
  return txns.some((t) => t.reward_points !== null);
}

/** Sum reward points across transactions. */
export function totalRewardPoints(txns: Transaction[]): number {
  return txns.reduce((sum, t) => sum + (t.reward_points ?? 0), 0);
}

/** Detailed reward point statistics. */
export function rewardStats(txns: Transaction[], declaredTotal?: number | null): RewardStats | null {
  if (!hasRewardPoints(txns) && (declaredTotal === undefined || declaredTotal === null)) {
    return null;
  }

  let earned = 0;
  let redeemed = 0;
  const catPoints: Record<string, number> = {};

  for (const t of txns) {
    if (t.reward_points !== null) {
      if (t.reward_points > 0) {
        earned += t.reward_points;
        catPoints[t.cat] = (catPoints[t.cat] || 0) + t.reward_points;
      } else if (t.reward_points < 0) {
        redeemed += Math.abs(t.reward_points);
      }
    }
  }

  const net = declaredTotal ?? (earned - redeemed);

  let topCategory: string | null = null;
  let topCategoryPoints = 0;
  const catEntries = Object.entries(catPoints).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) {
    topCategory = catEntries[0][0];
    topCategoryPoints = catEntries[0][1];
  }

  return {
    earned,
    redeemed,
    net,
    topCategory,
    topCategoryPoints,
    hasRedemptions: redeemed > 0,
  };
}

/** Find preceding analysis baseline from stored history. */
export function findComparisonBaseline(
  current: Analysis,
  history: StoredAnalysis[],
  isSignedIn: boolean
): StoredAnalysis | null {
  if (!isSignedIn || !Array.isArray(history) || history.length === 0) return null;

  // Filter out current analysis if present
  const past = history.filter((h) => h.id !== current.id);
  if (past.length === 0) return null;

  return past[0];
}

/** Calculate percentage and absolute spend delta vs baseline. */
export function spendDelta(
  currentTotal: number,
  baseline: StoredAnalysis | null
): { percent: number; absolute: number } | null {
  if (!baseline || typeof baseline.total_spent !== "number" || baseline.total_spent <= 0) {
    return null;
  }

  const absolute = currentTotal - baseline.total_spent;
  const percent = (absolute / baseline.total_spent) * 100;

  return { percent, absolute };
}

/** Bucketed spend values for sparkline rendering. */
export function sparklinePoints(txns: Transaction[], buckets = 6): number[] {
  if (txns.length === 0) return new Array(buckets).fill(0);

  const series = dailySeries(txns);
  if (series.length === 0) return new Array(buckets).fill(0);

  const result = new Array(buckets).fill(0);
  const chunkSize = Math.max(1, Math.ceil(series.length / buckets));

  for (let i = 0; i < series.length; i++) {
    const bucketIdx = Math.min(buckets - 1, Math.floor(i / chunkSize));
    result[bucketIdx] += series[i].amount;
  }

  return result;
}
