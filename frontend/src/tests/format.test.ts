import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCompactCurrency,
  formatSignedPercent,
  parseStatementDate,
  dayOfMonth,
  formatDate,
  formatRelativeTime,
  truncate,
  normaliseMerchant,
  monogram,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("uses Indian digit grouping", () => {
    expect(formatCurrency(123456.78)).toBe("₹1,23,456.78");
    expect(formatCurrency(1000)).toBe("₹1,000");
  });

  it("renders negatives with a leading minus, not parentheses", () => {
    expect(formatCurrency(-2089)).toBe("-₹2,089");
  });

  it("optionally forces a sign on positives", () => {
    expect(formatCurrency(500, { sign: true })).toBe("+₹500");
  });

  it("survives non-finite input", () => {
    expect(formatCurrency(Number.NaN)).toBe("₹0");
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("₹0");
  });
});

describe("formatCompactCurrency", () => {
  it("uses Indian scale abbreviations", () => {
    expect(formatCompactCurrency(950)).toBe("₹950");
    expect(formatCompactCurrency(12345)).toBe("₹12.3K");
    expect(formatCompactCurrency(123456)).toBe("₹1.2L");
    expect(formatCompactCurrency(12345678)).toBe("₹1.2Cr");
  });

  it("keeps the sign", () => {
    expect(formatCompactCurrency(-123456)).toBe("-₹1.2L");
  });
});

describe("formatSignedPercent", () => {
  it("prefixes the sign and uses a true minus glyph", () => {
    expect(formatSignedPercent(12.44)).toBe("+12.4%");
    expect(formatSignedPercent(-8.06)).toBe("−8.1%");
    expect(formatSignedPercent(0)).toBe("0.0%");
  });
});

describe("parseStatementDate", () => {
  it("parses ISO dates", () => {
    const d = parseStatementDate("2026-05-12");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(12);
  });

  it("parses DD-MM-YYYY", () => {
    const d = parseStatementDate("12-05-2026");
    expect(d?.getDate()).toBe(12);
    expect(d?.getMonth()).toBe(4);
  });

  it("parses slash separators in both orders", () => {
    expect(parseStatementDate("2026/05/12")?.getDate()).toBe(12);
    expect(parseStatementDate("12/05/2026")?.getMonth()).toBe(4);
  });

  it("returns null for malformed input rather than an Invalid Date", () => {
    expect(parseStatementDate("")).toBeNull();
    expect(parseStatementDate("not a date")).toBeNull();
    expect(parseStatementDate("2026-13-45")).toBeNull();
  });
});

describe("dayOfMonth", () => {
  it("reads the day from either supported layout", () => {
    expect(dayOfMonth("2026-05-12")).toBe(12);
    expect(dayOfMonth("12-05-2026")).toBe(12);
  });

  it("defaults to 1 when unparseable", () => {
    expect(dayOfMonth("garbage")).toBe(1);
    expect(dayOfMonth("")).toBe(1);
  });
});

describe("formatDate", () => {
  it("renders a short day and month", () => {
    expect(formatDate("2026-05-12")).toBe("12 May");
  });

  it("returns an em dash for unparseable dates instead of throwing", () => {
    expect(formatDate("garbage")).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-10T12:00:00Z");

  it("describes recent instants", () => {
    expect(formatRelativeTime("2026-08-10T11:59:30Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-08-10T11:56:00Z", now)).toBe("4m ago");
    expect(formatRelativeTime("2026-08-10T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-08-08T12:00:00Z", now)).toBe("2d ago");
  });

  it("falls back to an absolute date beyond a week", () => {
    expect(formatRelativeTime("2026-05-12T12:00:00Z", now)).toBe("12 May 2026");
  });
});

describe("truncate", () => {
  it("adds an ellipsis only when it actually shortens", () => {
    expect(truncate("Amazon Pay IN E COMMERC Bangalore", 12)).toBe("Amazon Pay…");
    expect(truncate("JIO Mumbai", 40)).toBe("JIO Mumbai");
  });
});

describe("normaliseMerchant", () => {
  it("strips parenthetical suffixes and trims", () => {
    expect(normaliseMerchant("Swiggy Limited (UPI)")).toBe("Swiggy Limited");
    expect(normaliseMerchant("  ZOMATO LIMITED Gurugram  ")).toBe("ZOMATO LIMITED Gurugram");
  });

  it("names the empty case rather than returning an empty string", () => {
    expect(normaliseMerchant("")).toBe("Unknown Payee");
    expect(normaliseMerchant("()")).toBe("Unknown Payee");
  });
});

describe("monogram", () => {
  it("takes initials from the first two words", () => {
    expect(monogram("Swiggy Limited Bangalore")).toBe("SL");
    expect(monogram("JIO")).toBe("JI");
  });

  it("skips non-alphanumeric noise", () => {
    expect(monogram("RAZ*Swiggy Bangalore KA")).toBe("RS");
    expect(monogram("")).toBe("?");
  });

  it("is deterministic", () => {
    expect(monogram("Amazon Pay IN")).toBe(monogram("Amazon Pay IN"));
  });
});
