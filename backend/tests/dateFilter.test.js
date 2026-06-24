import { describe, it, expect } from "vitest";
import { filterTransactionsByPeriod, parsePeriod } from "../lib/dateFilter.js";

describe("dateFilter utility", () => {
  describe("parsePeriod", () => {
    it("should parse text range with 'to'", () => {
      const parsed = parsePeriod("May 13, 2026 to June 12, 2026");
      expect(parsed).not.toBeNull();
      expect(parsed.startDate.getFullYear()).toBe(2026);
      expect(parsed.startDate.getMonth()).toBe(4); // May is 4
      expect(parsed.startDate.getDate()).toBe(13);
      expect(parsed.endDate.getFullYear()).toBe(2026);
      expect(parsed.endDate.getMonth()).toBe(5); // June is 5
      expect(parsed.endDate.getDate()).toBe(12);
    });

    it("should parse range with en-dash/em-dash/hyphen", () => {
      const parsed = parsePeriod("13 May – 12 Jun 2026");
      expect(parsed).not.toBeNull();
      expect(parsed.startDate.getFullYear()).toBe(2026);
      expect(parsed.startDate.getMonth()).toBe(4);
      expect(parsed.startDate.getDate()).toBe(13);
      expect(parsed.endDate.getFullYear()).toBe(2026);
      expect(parsed.endDate.getMonth()).toBe(5);
      expect(parsed.endDate.getDate()).toBe(12);
    });

    it("should parse numeric date format DD/MM/YYYY", () => {
      const parsed = parsePeriod("13/05/2026 to 12/06/2026");
      expect(parsed).not.toBeNull();
      expect(parsed.startDate.getFullYear()).toBe(2026);
      expect(parsed.startDate.getMonth()).toBe(4);
      expect(parsed.startDate.getDate()).toBe(13);
    });

    it("should return null for invalid periods", () => {
      expect(parsePeriod(null)).toBeNull();
      expect(parsePeriod("")).toBeNull();
      expect(parsePeriod("Single Date 2026")).toBeNull();
    });
  });

  describe("filterTransactionsByPeriod", () => {
    const transactions = [
      { date: "2026-05-15", desc: "Swiggy", amount: 120 }, // Valid
      { date: "2026-05-12", desc: "Zomato (buffer)", amount: 200 }, // Valid (within 5-day buffer before May 13)
      { date: "2026-06-13", desc: "Amazon (buffer)", amount: 500 }, // Valid (within 5-day buffer after June 12)
      { date: "2023-09-20", desc: "Sample illustration", amount: 2000 }, // Invalid (out of range)
      { date: "2025-10-15", desc: "Late payment fee sample", amount: 900 }, // Invalid (out of range)
      { date: null, desc: "Tax convenience", amount: 3.6 }, // Invalid (no date)
      { date: "invalid-date", desc: "Bad date", amount: 10 }, // Invalid (bad date)
    ];

    it("should correctly filter transactions within period and safety buffer", () => {
      const result = filterTransactionsByPeriod(transactions, "May 13, 2026 to June 12, 2026");
      expect(result.length).toBe(3);
      expect(result.map(t => t.desc)).toEqual(["Swiggy", "Zomato (buffer)", "Amazon (buffer)"]);
    });

    it("should fallback to year-based filtering when period is a single date with a year", () => {
      const result = filterTransactionsByPeriod(transactions, "June 12, 2026");
      // Extracts 2026 from the period string and filters by year
      expect(result.length).toBe(3);
      expect(result.map(t => t.desc)).toEqual(["Swiggy", "Zomato (buffer)", "Amazon (buffer)"]);
    });

    it("should fallback to most common year when period is null or has no year", () => {
      const result = filterTransactionsByPeriod(transactions, null);
      // Finds 2026 as the most common year among transactions (3 vs 1 vs 1) and filters by it
      expect(result.length).toBe(3);
      expect(result.map(t => t.desc)).toEqual(["Swiggy", "Zomato (buffer)", "Amazon (buffer)"]);
    });
  });
});
