import { describe, it, expect } from "vitest";
import {
  normaliseTransactions,
  excludeSelfTransfers,
  selfTransferTotal,
  categoryTotals,
  totalSpent,
  dailySeries,
  dailyBreakdown,
  filterAndSort,
  vendorStats,
  topVendors,
  recurringPayees,
  merchantContext,
  hasRewardPoints,
  totalRewardPoints,
  rewardStats,
  findComparisonBaseline,
  spendDelta,
  sparklinePoints,
} from "@/lib/derive";
import type { StoredAnalysis } from "@/lib/types";

const TXNS = normaliseTransactions([
  { date: "2026-05-12", desc: "Amazon Pay IN E COMMERC", amount: 2089, cat: "Shopping", reward_points: -104 },
  { date: "2026-05-12", desc: "Amazon Pay IN GROCERY", amount: 73, cat: "Groceries", reward_points: 3 },
  { date: "2026-05-14", desc: "Swiggy Limited", amount: 184, cat: "Food & Dining", reward_points: 1 },
  { date: "2026-05-14", desc: "Swiggy Limited", amount: 35, cat: "Food & Dining", reward_points: 0 },
  { date: "2026-05-16", desc: "Self Move", amount: 5000, cat: "Self Transfer", reward_points: null },
]);

describe("normaliseTransactions", () => {
  it("returns an empty array for missing input", () => {
    expect(normaliseTransactions(undefined)).toEqual([]);
    expect(normaliseTransactions([])).toEqual([]);
  });

  it("defaults a short or missing date to 2026-06-01, matching current behaviour", () => {
    expect(normaliseTransactions([{ date: "5-12" }])[0].date).toBe("2026-06-01");
    expect(normaliseTransactions([{}])[0].date).toBe("2026-06-01");
  });

  it("defaults a missing description to Unknown Merchant", () => {
    expect(normaliseTransactions([{ amount: 10 }])[0].desc).toBe("Unknown Merchant");
  });

  it("coerces non-numeric amounts to 0", () => {
    expect(normaliseTransactions([{ amount: "garbage" }])[0].amount).toBe(0);
  });

  it("defaults a missing category to Other", () => {
    expect(normaliseTransactions([{ amount: 10 }])[0].cat).toBe("Other");
  });

  it("coerces reward points to number or null", () => {
    expect(normaliseTransactions([{ reward_points: "12" }])[0].reward_points).toBe(12);
    expect(normaliseTransactions([{ reward_points: null }])[0].reward_points).toBeNull();
  });
});

describe("self transfers", () => {
  it("filters out Self Transfer when showSelf is false", () => {
    const res = excludeSelfTransfers(TXNS, false);
    expect(res).toHaveLength(4);
    expect(res.some((t) => t.cat === "Self Transfer")).toBe(false);
  });

  it("keeps Self Transfer when showSelf is true", () => {
    expect(excludeSelfTransfers(TXNS, true)).toHaveLength(5);
  });

  it("computes the total of all self-transfer amounts", () => {
    expect(selfTransferTotal(TXNS)).toBe(5000);
  });
});

describe("categoryTotals", () => {
  it("aggregates spend by category", () => {
    const totals = categoryTotals(TXNS);
    const shopping = totals.find((t) => t.name === "Shopping");
    expect(shopping?.value).toBe(2089);
  });

  it("sorts by total descending", () => {
    const totals = categoryTotals(TXNS);
    expect(totals[0].value).toBeGreaterThanOrEqual(totals[1].value);
  });
});

describe("totalSpent", () => {
  it("sums transaction amounts", () => {
    expect(totalSpent(TXNS)).toBe(7381);
  });
});

describe("dailySeries and dailyBreakdown", () => {
  it("buckets transactions by day of month", () => {
    const series = dailySeries(TXNS);
    const day12 = series.find((p) => p.day === "12");
    expect(day12?.amount).toBe(2162);
  });

  it("returns category totals for a specific day", () => {
    const breakdown = dailyBreakdown(TXNS, "12");
    expect(breakdown).toHaveLength(2);
  });
});

describe("filterAndSort", () => {
  it("filters by category", () => {
    const res = filterAndSort(TXNS, { category: "Food & Dining" });
    expect(res).toHaveLength(2);
  });

  it("filters by query string across desc and cat", () => {
    expect(filterAndSort(TXNS, { query: "swiggy" })).toHaveLength(2);
    expect(filterAndSort(TXNS, { query: "groceries" })).toHaveLength(1);
  });

  it("sorts by amount descending", () => {
    const res = filterAndSort(TXNS, { sortBy: "amount" });
    expect(res[0].amount).toBe(5000);
  });
});

describe("vendor analytics", () => {
  it("groups transactions by normalised merchant name", () => {
    const vendors = vendorStats(TXNS);
    const swiggy = vendors.find((v) => v.name === "Swiggy Limited");
    expect(swiggy?.count).toBe(2);
    expect(swiggy?.total).toBe(219);
    expect(swiggy?.average).toBe(109.5);
  });

  it("ranks top vendors by total spend", () => {
    const top = topVendors(TXNS, 2);
    expect(top[0].total).toBeGreaterThanOrEqual(top[1].total);
    expect(top).toHaveLength(2);
  });

  it("identifies recurring payees with at least 2 transactions", () => {
    const recurring = recurringPayees(TXNS);
    expect(recurring.map((v) => v.name)).toContain("Swiggy Limited");
    expect(recurring.map((v) => v.name)).not.toContain("Self Move");
  });

  it("provides merchant context for a selected transaction", () => {
    const ctx = merchantContext(TXNS, TXNS[2]);
    expect(ctx.merchant).toBe("Swiggy Limited");
    expect(ctx.count).toBe(2);
    expect(ctx.merchantTotal).toBe(219);
  });
});

describe("reward analytics", () => {
  it("detects presence of non-null reward points", () => {
    expect(hasRewardPoints(TXNS)).toBe(true);
    expect(hasRewardPoints([{ date: "2026-05-12", desc: "x", amount: 10, cat: "Other", reward_points: null }])).toBe(false);
  });

  it("sums declared or transaction-derived reward points", () => {
    expect(totalRewardPoints(TXNS)).toBe(-100);
  });

  it("returns null stats when no reward points exist", () => {
    const noRewards = TXNS.map((t) => ({ ...t, reward_points: null }));
    expect(rewardStats(noRewards)).toBeNull();
  });

  it("computes earned, redeemed, net and top reward category", () => {
    const stats = rewardStats(TXNS);
    expect(stats?.earned).toBe(4);
    expect(stats?.redeemed).toBe(104);
    expect(stats?.net).toBe(-100);
  });
});

describe("findComparisonBaseline and spendDelta", () => {
  const current = { id: "curr", period: "May 2026", created_at: "2026-05-31" };
  const history: StoredAnalysis[] = [
    { id: "curr", period: "May 2026", created_at: "2026-05-31", total_spent: 7381, transaction_count: 5 },
    { id: "prev", period: "April 2026", created_at: "2026-04-30", total_spent: 6000, transaction_count: 4 },
  ];

  it("returns null when user is signed out", () => {
    expect(findComparisonBaseline(current, history, false)).toBeNull();
  });

  it("finds the preceding analysis in history", () => {
    const baseline = findComparisonBaseline(current, history, true);
    expect(baseline?.id).toBe("prev");
  });

  it("computes spend delta against baseline", () => {
    const baseline = history[1];
    const delta = spendDelta(7381, baseline);
    expect(delta?.percent).toBeCloseTo(23.01, 1);
    expect(delta?.absolute).toBe(1381);
  });
});

describe("sparklinePoints", () => {
  it("returns the requested number of bucketed spend values", () => {
    const points = sparklinePoints(TXNS, 6);
    expect(points).toHaveLength(6);
    expect(points.every((p) => typeof p === "number")).toBe(true);
  });
});
